from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from smtplib import SMTP
from email.message import EmailMessage
from uuid import uuid4
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, select
from .config import get_settings
from .database import get_db
from .models import User, Organization, Membership, Invitation, Project, ProjectMembership, AuditEvent, Team, TeamMember
from .security import verify_clerk_token, hash_invitation_token
from .identity import sync_clerk_user
from .schemas import OrganizationCreate, OrganizationUpdate, InvitationCreate, InvitationAccept, MemberRoleUpdate, ProjectCreate, ProjectMemberUpsert, TeamCreate, TeamUpdate, TeamMemberUpsert

router = APIRouter(prefix="/api/v1")
def current_user(claims=Depends(verify_clerk_token), db: Session=Depends(get_db)) -> User:
    user = db.query(User).filter(User.clerk_user_id == claims["sub"]).one_or_none()
    if not user or user.status != "active" or not user.email_verified:
        raise HTTPException(status_code=403, detail="Complete account synchronization first")
    return user

def audit(db: Session, org_id: str, actor: User, action: str, kind: str, resource_id: str | None=None, detail: str=""):
    db.add(AuditEvent(id=str(uuid4()), organization_id=org_id, actor_user_id=actor.id, action=action, resource_type=kind, resource_id=resource_id, detail=detail))

def membership(db: Session, org_id: str, user: User) -> Membership:
    row = db.query(Membership).filter_by(organization_id=org_id, user_id=user.id, status="active").one_or_none()
    org = db.query(Organization).filter_by(id=org_id, status="active").one_or_none()
    if not row or not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return row

def require_org_admin(db: Session, org_id: str, user: User, owner_only: bool=False) -> Membership:
    row = membership(db, org_id, user)
    allowed = {"owner"} if owner_only else {"owner", "admin"}
    if row.role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient organization permissions")
    return row

def require_project_access(db: Session, project: Project, user: User) -> ProjectMembership:
    membership(db, project.organization_id, user)
    row = db.query(ProjectMembership).filter_by(project_id=project.id, user_id=user.id).one_or_none()
    if not row:
        org_role = membership(db, project.organization_id, user).role
        if org_role in {"owner", "admin"}:
            return ProjectMembership(id="org-admin", project_id=project.id, user_id=user.id, role="org_admin")
        raise HTTPException(status_code=404, detail="Project not found")
    return row

def require_project_manager(db: Session, project: Project, user: User):
    project_role = require_project_access(db, project, user)
    org_role = membership(db, project.organization_id, user).role
    if org_role not in {"owner", "admin"} and project_role.role != "project_owner":
        raise HTTPException(status_code=403, detail="Project owner or organization admin access required")
    return project_role

def org_payload(org: Organization, role: str):
    return {"id": org.id, "name": org.name, "slug": org.slug, "type": org.org_type, "status": org.status, "role": role, "created_at": org.created_at}

def slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:110] or "workspace"
    return f"{base}-{uuid4().hex[:7]}"

def send_invite(email: str, org: Organization, role: str, url: str):
    settings = get_settings()
    if not settings.smtp_ready:
        if settings.app_env == "production":
            raise HTTPException(status_code=503, detail="Invitation email is not configured. Configure SMTP before inviting members.")
        return False
    message = EmailMessage()
    message["Subject"] = f"Invitation to join {org.name} on TierShift Data Factory"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(f"You have been invited to join {org.name} as {role}. Sign in or create your TierShift account, then accept the invitation here: {url}\n\nIf you were not expecting this invitation, you can ignore this email.")
    with SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password or "")
        smtp.send_message(message)
    return True

@router.post("/auth/sync")
def auth_sync(claims=Depends(verify_clerk_token), db: Session=Depends(get_db)):
    user = sync_clerk_user(db, claims["sub"])
    memberships = db.query(Membership).filter_by(user_id=user.id, status="active").all()
    return {"user": {"id": user.id, "email": user.email, "email_verified": user.email_verified, "name": user.full_name}, "organizations": [{"id": m.organization_id, "role": m.role} for m in memberships]}

@router.get("/me")
def me(user: User=Depends(current_user), db: Session=Depends(get_db)):
    rows = db.query(Membership, Organization).join(Organization, Membership.organization_id == Organization.id).filter(Membership.user_id == user.id, Membership.status == "active", Organization.status == "active").all()
    return {"id": user.id, "email": user.email, "email_verified": user.email_verified, "name": user.full_name, "organizations": [org_payload(o, m.role) for m,o in rows]}

@router.get("/organizations")
def list_organizations(user: User=Depends(current_user), db: Session=Depends(get_db)):
    rows = db.query(Membership, Organization).join(Organization, Membership.organization_id == Organization.id).filter(Membership.user_id == user.id, Membership.status == "active", Organization.status == "active").all()
    return [org_payload(o, m.role) for m,o in rows]

@router.post("/organizations", status_code=201)
def create_organization(body: OrganizationCreate, user: User=Depends(current_user), db: Session=Depends(get_db)):
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Verify your email address before creating a workspace")
    if body.org_type == "internal" and user.email.rsplit("@", 1)[-1].lower() not in get_settings().internal_domains:
        raise HTTPException(status_code=403, detail="Only approved TierShift email domains can create internal workspaces")
    org = Organization(id=str(uuid4()), name=body.name.strip(), slug=slugify(body.name), org_type=body.org_type, created_by=user.id)
    db.add(org)
    db.flush()
    db.add(Membership(id=str(uuid4()), organization_id=org.id, user_id=user.id, role="owner"))
    audit(db, org.id, user, "organization.created", "organization", org.id)
    db.commit()
    db.refresh(org)
    return org_payload(org, "owner")

@router.get("/organizations/{org_id}")
def get_organization(org_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    m = membership(db, org_id, user)
    org = db.query(Organization).filter_by(id=org_id, status="active").one_or_none()
    if not org: raise HTTPException(status_code=404, detail="Organization not found")
    return org_payload(org, m.role)

@router.patch("/organizations/{org_id}")
def update_organization(org_id: str, body: OrganizationUpdate, user: User=Depends(current_user), db: Session=Depends(get_db)):
    require_org_admin(db, org_id, user)
    org = db.query(Organization).filter_by(id=org_id, status="active").one_or_none()
    if not org: raise HTTPException(status_code=404, detail="Organization not found")
    if body.name: org.name = body.name.strip()
    audit(db, org_id, user, "organization.updated", "organization", org_id)
    db.commit()
    return org_payload(org, membership(db, org_id, user).role)

@router.post("/organizations/{org_id}/archive")
def archive_organization(org_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    require_org_admin(db, org_id, user, owner_only=True)
    org = db.query(Organization).filter_by(id=org_id, status="active").one_or_none()
    if not org: raise HTTPException(status_code=404, detail="Organization not found")
    org.status = "archived"
    audit(db, org_id, user, "organization.archived", "organization", org_id)
    db.commit()
    return {"ok": True}

@router.post("/organizations/{org_id}/transfer-ownership")
def transfer_ownership(org_id: str, target_user_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    org = db.query(Organization).filter_by(id=org_id, status="active").with_for_update().one_or_none()
    if not org: raise HTTPException(status_code=404, detail="Organization not found")
    current = db.query(Membership).filter_by(organization_id=org_id, user_id=user.id, status="active").with_for_update().one_or_none()
    if not current or current.role != "owner": raise HTTPException(status_code=403, detail="Only the current owner can transfer ownership")
    target = db.query(Membership).filter_by(organization_id=org_id, user_id=target_user_id, status="active").with_for_update().one_or_none()
    if not target: raise HTTPException(status_code=404, detail="Target member not found")
    current.role, target.role = "admin", "owner"
    audit(db, org_id, user, "organization.ownership_transferred", "membership", target.id)
    db.commit()
    return {"ok": True, "new_owner_user_id": target_user_id}


@router.post("/organizations/{org_id}/leave")
def leave_organization(org_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    row = db.query(Membership).filter_by(organization_id=org_id, user_id=user.id, status="active").with_for_update().one_or_none()
    if not row or not db.query(Organization).filter_by(id=org_id, status="active").one_or_none(): raise HTTPException(status_code=404, detail="Organization not found")
    if row.role == "owner":
        raise HTTPException(status_code=409, detail="Transfer ownership before leaving this organization")
    row.status = "removed"
    project_ids = select(Project.id).where(Project.organization_id == org_id)
    db.query(ProjectMembership).filter(ProjectMembership.user_id == user.id, ProjectMembership.project_id.in_(project_ids)).delete(synchronize_session=False)
    team_ids = select(Team.id).where(Team.organization_id == org_id)
    db.query(TeamMember).filter(TeamMember.user_id == user.id, TeamMember.team_id.in_(team_ids)).delete(synchronize_session=False)
    audit(db, org_id, user, "member.left", "membership", row.id)
    db.commit()
    return {"ok": True}

@router.get("/organizations/{org_id}/members")
def list_members(org_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    membership(db, org_id, user)
    rows = db.query(Membership, User).join(User, Membership.user_id == User.id).filter(Membership.organization_id == org_id, Membership.status == "active").all()
    return [{"user_id": u.id, "email": u.email, "name": u.full_name, "role": m.role, "joined_at": m.created_at} for m,u in rows]

@router.patch("/organizations/{org_id}/members/{member_id}")
def change_member_role(org_id: str, member_id: str, body: MemberRoleUpdate, user: User=Depends(current_user), db: Session=Depends(get_db)):
    actor = require_org_admin(db, org_id, user)
    target = db.query(Membership).filter_by(organization_id=org_id, user_id=member_id, status="active").with_for_update().one_or_none()
    if not target: raise HTTPException(status_code=404, detail="Member not found")
    if target.role == "owner": raise HTTPException(status_code=409, detail="Transfer ownership before changing the owner role")
    if actor.role != "owner" and (body.role == "admin" or target.role == "admin"): raise HTTPException(status_code=403, detail="Only the owner can change an admin role")
    target.role = body.role
    audit(db, org_id, user, "member.role_changed", "membership", target.id, body.role)
    db.commit()
    return {"user_id": member_id, "role": target.role}

@router.delete("/organizations/{org_id}/members/{member_id}")
def remove_member(org_id: str, member_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    actor = require_org_admin(db, org_id, user)
    target = db.query(Membership).filter_by(organization_id=org_id, user_id=member_id, status="active").one_or_none()
    if not target: raise HTTPException(status_code=404, detail="Member not found")
    if target.role == "owner": raise HTTPException(status_code=409, detail="Transfer ownership before removing the owner")
    if actor.role != "owner" and target.role == "admin": raise HTTPException(status_code=403, detail="Only the owner can remove an admin")
    target.status = "removed"
    project_ids = select(Project.id).where(Project.organization_id == org_id)
    db.query(ProjectMembership).filter(ProjectMembership.user_id == member_id, ProjectMembership.project_id.in_(project_ids)).delete(synchronize_session=False)
    team_ids = select(Team.id).where(Team.organization_id == org_id)
    db.query(TeamMember).filter(TeamMember.user_id == member_id, TeamMember.team_id.in_(team_ids)).delete(synchronize_session=False)
    audit(db, org_id, user, "member.removed", "membership", target.id)
    db.commit()
    return {"ok": True}

@router.post("/organizations/{org_id}/invitations", status_code=201)
def create_invitation(org_id: str, body: InvitationCreate, user: User=Depends(current_user), db: Session=Depends(get_db)):
    actor = require_org_admin(db, org_id, user)
    email = str(body.email).lower()
    if actor.role != "owner" and body.role == "admin": raise HTTPException(status_code=403, detail="Only the owner can invite admins")
    org = db.query(Organization).filter_by(id=org_id, status="active").one_or_none()
    if not org: raise HTTPException(status_code=404, detail="Organization not found")
    existing_user = db.query(User).filter_by(email=email).one_or_none()
    if existing_user and db.query(Membership).filter_by(organization_id=org_id, user_id=existing_user.id, status="active").first():
        raise HTTPException(status_code=409, detail="This person is already a member")
    raw = token_urlsafe(40)
    invitation = Invitation(id=str(uuid4()), organization_id=org_id, email=email, role=body.role, token_hash=hash_invitation_token(raw), invited_by=user.id, expires_at=datetime.now(timezone.utc)+timedelta(hours=get_settings().invitation_token_ttl_hours))
    db.add(invitation)
    db.flush()
    invite_url = f"{get_settings().app_base_url.rstrip('/')}/?invite={raw}"
    try:
        sent = send_invite(email, org, body.role, invite_url)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=502, detail="Invitation email could not be sent")
    audit(db, org_id, user, "invitation.created", "invitation", invitation.id, email)
    db.commit()
    return {"id": invitation.id, "email": email, "role": body.role, "expires_at": invitation.expires_at, "email_sent": sent, "invite_url": invite_url if get_settings().app_env != "production" else None}

@router.get("/organizations/{org_id}/invitations")
def list_invitations(org_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    require_org_admin(db, org_id, user)
    rows = db.query(Invitation).filter(Invitation.organization_id == org_id, Invitation.accepted_at.is_(None), Invitation.revoked_at.is_(None), Invitation.expires_at > datetime.now(timezone.utc)).all()
    return [{"id": x.id, "email": x.email, "role": x.role, "expires_at": x.expires_at, "created_at": x.created_at} for x in rows]

@router.delete("/organizations/{org_id}/invitations/{invitation_id}")
def revoke_invitation(org_id: str, invitation_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    require_org_admin(db, org_id, user)
    item = db.query(Invitation).filter_by(id=invitation_id, organization_id=org_id, accepted_at=None, revoked_at=None).one_or_none()
    if not item: raise HTTPException(status_code=404, detail="Invitation not found")
    item.revoked_at = datetime.now(timezone.utc)
    audit(db, org_id, user, "invitation.revoked", "invitation", item.id)
    db.commit()
    return {"ok": True}

@router.post("/invitations/accept")
def accept_invitation(body: InvitationAccept, user: User=Depends(current_user), db: Session=Depends(get_db)):
    if not user.email_verified: raise HTTPException(status_code=403, detail="Verify your email address before accepting invitations")
    item = db.query(Invitation).filter_by(token_hash=hash_invitation_token(body.token), accepted_at=None, revoked_at=None).with_for_update().one_or_none()
    if not item or item.expires_at < datetime.now(timezone.utc): raise HTTPException(status_code=404, detail="Invitation is invalid or expired")
    if item.email.lower() != user.email.lower(): raise HTTPException(status_code=403, detail="This invitation belongs to a different email address")
    if not db.query(Organization).filter_by(id=item.organization_id, status="active").one_or_none(): raise HTTPException(status_code=404, detail="Organization not found")
    existing = db.query(Membership).filter_by(organization_id=item.organization_id, user_id=user.id).one_or_none()
    if existing:
        existing.status, existing.role = "active", item.role
    else:
        db.add(Membership(id=str(uuid4()), organization_id=item.organization_id, user_id=user.id, role=item.role))
    item.accepted_at = datetime.now(timezone.utc)
    audit(db, item.organization_id, user, "invitation.accepted", "invitation", item.id)
    db.commit()
    return {"ok": True, "organization_id": item.organization_id, "role": item.role}

@router.get("/organizations/{org_id}/projects")
def list_projects(org_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    org_member = membership(db, org_id, user)
    query = db.query(Project).filter_by(organization_id=org_id)
    if org_member.role not in {"owner", "admin"}:
        query = query.join(ProjectMembership, ProjectMembership.project_id == Project.id).filter(ProjectMembership.user_id == user.id)
    result = []
    for project in query.order_by(Project.created_at.desc()).all():
        project_member = db.query(ProjectMembership).filter_by(project_id=project.id, user_id=user.id).one_or_none()
        result.append({"id": project.id, "name": project.name, "description": project.description, "platform": project.platform, "status": project.status, "my_role": project_member.role if project_member else org_member.role, "created_at": project.created_at})
    return result

@router.post("/organizations/{org_id}/projects", status_code=201)
def create_project(org_id: str, body: ProjectCreate, user: User=Depends(current_user), db: Session=Depends(get_db)):
    require_org_admin(db, org_id, user)
    project = Project(id=str(uuid4()), organization_id=org_id, name=body.name.strip(), description=body.description, platform=body.platform, created_by=user.id)
    db.add(project)
    db.flush()
    db.add(ProjectMembership(id=str(uuid4()), project_id=project.id, user_id=user.id, role="project_owner"))
    audit(db, org_id, user, "project.created", "project", project.id)
    db.commit()
    return {"id": project.id, "name": project.name, "description": project.description, "platform": project.platform, "status": project.status}

@router.get("/projects/{project_id}/members")
def list_project_members(project_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    project = db.query(Project).filter_by(id=project_id).one_or_none()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    require_project_access(db, project, user)
    rows = db.query(ProjectMembership, User).join(User, ProjectMembership.user_id == User.id).filter(ProjectMembership.project_id == project_id).all()
    return [{"user_id": u.id, "email": u.email, "name": u.full_name, "role": m.role} for m,u in rows]

@router.put("/projects/{project_id}/members/{member_id}")
def set_project_member(project_id: str, member_id: str, body: ProjectMemberUpsert, user: User=Depends(current_user), db: Session=Depends(get_db)):
    project = db.query(Project).filter_by(id=project_id).with_for_update().one_or_none()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    require_project_manager(db, project, user)
    org_member = db.query(Membership).filter_by(organization_id=project.organization_id, user_id=member_id, status="active").one_or_none()
    if not org_member: raise HTTPException(status_code=400, detail="Project members must belong to the organization")
    row = db.query(ProjectMembership).filter_by(project_id=project_id, user_id=member_id).one_or_none()
    if row and row.role == "project_owner" and body.role != "project_owner":
        another_owner = db.query(ProjectMembership).filter(ProjectMembership.project_id == project_id, ProjectMembership.role == "project_owner", ProjectMembership.user_id != member_id).first()
        if not another_owner: raise HTTPException(status_code=409, detail="Assign another project owner before changing this role")
    if body.role == "project_owner":
        previous_owner = db.query(ProjectMembership).filter_by(project_id=project_id, role="project_owner").one_or_none()
        if previous_owner and previous_owner.user_id != member_id:
            previous_owner.role = "architect"
    if row: row.role = body.role
    else: db.add(ProjectMembership(id=str(uuid4()), project_id=project_id, user_id=member_id, role=body.role))
    audit(db, project.organization_id, user, "project.member_changed", "project_membership", project_id, f"{member_id}:{body.role}")
    db.commit()
    return {"user_id": member_id, "role": body.role}

@router.delete("/projects/{project_id}/members/{member_id}")
def remove_project_member(project_id: str, member_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    project = db.query(Project).filter_by(id=project_id).with_for_update().one_or_none()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    require_project_manager(db, project, user)
    row = db.query(ProjectMembership).filter_by(project_id=project_id, user_id=member_id).one_or_none()
    if not row: raise HTTPException(status_code=404, detail="Project member not found")
    if row.role == "project_owner": raise HTTPException(status_code=409, detail="Transfer project ownership before removing this member")
    db.delete(row)
    audit(db, project.organization_id, user, "project.member_removed", "project_membership", project_id, member_id)
    db.commit()
    return {"ok": True}


@router.get("/organizations/{org_id}/teams")
def list_teams(org_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    membership(db, org_id, user)
    teams = db.query(Team).filter_by(organization_id=org_id, status="active").order_by(Team.name).all()
    return [{"id": t.id, "name": t.name, "description": t.description, "member_count": db.query(TeamMember).filter_by(team_id=t.id).count(), "created_at": t.created_at} for t in teams]

@router.post("/organizations/{org_id}/teams", status_code=201)
def create_team(org_id: str, body: TeamCreate, user: User=Depends(current_user), db: Session=Depends(get_db)):
    require_org_admin(db, org_id, user)
    team = Team(id=str(uuid4()), organization_id=org_id, name=body.name.strip(), description=body.description, created_by=user.id)
    db.add(team)
    db.flush()
    db.add(TeamMember(id=str(uuid4()), team_id=team.id, user_id=user.id, role="lead"))
    audit(db, org_id, user, "team.created", "team", team.id)
    db.commit()
    return {"id": team.id, "name": team.name, "description": team.description}

@router.get("/teams/{team_id}/members")
def list_team_members(team_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    team = db.query(Team).filter_by(id=team_id, status="active").one_or_none()
    if not team: raise HTTPException(status_code=404, detail="Team not found")
    membership(db, team.organization_id, user)
    rows = db.query(TeamMember, User).join(User, TeamMember.user_id == User.id).filter(TeamMember.team_id == team_id).all()
    return [{"user_id": u.id, "email": u.email, "name": u.full_name, "role": m.role} for m,u in rows]

@router.patch("/teams/{team_id}")
def update_team(team_id: str, body: TeamUpdate, user: User=Depends(current_user), db: Session=Depends(get_db)):
    team = db.query(Team).filter_by(id=team_id, status="active").one_or_none()
    if not team: raise HTTPException(status_code=404, detail="Team not found")
    require_org_admin(db, team.organization_id, user)
    if body.name is not None: team.name = body.name.strip()
    if body.description is not None: team.description = body.description
    audit(db, team.organization_id, user, "team.updated", "team", team.id)
    db.commit()
    return {"id": team.id, "name": team.name, "description": team.description}

@router.delete("/teams/{team_id}")
def archive_team(team_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    team = db.query(Team).filter_by(id=team_id, status="active").one_or_none()
    if not team: raise HTTPException(status_code=404, detail="Team not found")
    require_org_admin(db, team.organization_id, user)
    team.status = "archived"
    audit(db, team.organization_id, user, "team.archived", "team", team.id)
    db.commit()
    return {"ok": True}

@router.put("/teams/{team_id}/members/{member_id}")
def upsert_team_member(team_id: str, member_id: str, body: TeamMemberUpsert, user: User=Depends(current_user), db: Session=Depends(get_db)):
    team = db.query(Team).filter_by(id=team_id, status="active").one_or_none()
    if not team: raise HTTPException(status_code=404, detail="Team not found")
    actor_membership = membership(db, team.organization_id, user)
    actor_team = db.query(TeamMember).filter_by(team_id=team_id, user_id=user.id).one_or_none()
    if actor_membership.role not in {"owner", "admin"} and (not actor_team or actor_team.role != "lead"):
        raise HTTPException(status_code=403, detail="Organization admin or team lead access required")
    target_org_member = db.query(Membership).filter_by(organization_id=team.organization_id, user_id=member_id, status="active").one_or_none()
    if not target_org_member: raise HTTPException(status_code=400, detail="Team members must belong to this organization")
    if body.role == "lead" and actor_membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=403, detail="Only organization admins can assign team leads")
    row = db.query(TeamMember).filter_by(team_id=team_id, user_id=member_id).one_or_none()
    if row: row.role = body.role
    else: db.add(TeamMember(id=str(uuid4()), team_id=team_id, user_id=member_id, role=body.role))
    audit(db, team.organization_id, user, "team.member_changed", "team_member", team_id, f"{member_id}:{body.role}")
    db.commit()
    return {"user_id": member_id, "role": body.role}

@router.delete("/teams/{team_id}/members/{member_id}")
def remove_team_member(team_id: str, member_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    team = db.query(Team).filter_by(id=team_id, status="active").one_or_none()
    if not team: raise HTTPException(status_code=404, detail="Team not found")
    actor_membership = membership(db, team.organization_id, user)
    actor_team = db.query(TeamMember).filter_by(team_id=team_id, user_id=user.id).one_or_none()
    if actor_membership.role not in {"owner", "admin"} and (not actor_team or actor_team.role != "lead"):
        raise HTTPException(status_code=403, detail="Organization admin or team lead access required")
    target = db.query(TeamMember).filter_by(team_id=team_id, user_id=member_id).one_or_none()
    if not target: raise HTTPException(status_code=404, detail="Team member not found")
    if target.role == "lead" and actor_membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=403, detail="Only organization admins can remove a team lead")
    db.delete(target)
    audit(db, team.organization_id, user, "team.member_removed", "team_member", team_id, member_id)
    db.commit()
    return {"ok": True}

@router.get("/organizations/{org_id}/audit")
def organization_audit(org_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    require_org_admin(db, org_id, user)
    events = db.query(AuditEvent).filter_by(organization_id=org_id).order_by(AuditEvent.created_at.desc()).limit(100).all()
    return [{"id": e.id, "actor_user_id": e.actor_user_id, "action": e.action, "resource_type": e.resource_type, "resource_id": e.resource_id, "detail": e.detail, "created_at": e.created_at} for e in events]

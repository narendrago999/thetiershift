from uuid import uuid4
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.database import Base
from app.models import User, Organization, Membership, Project, ProjectMembership, Team, TeamMember
from app.api import membership, require_org_admin, require_project_access, require_project_manager, remove_member, leave_organization

@pytest.fixture
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    Base.metadata.drop_all(engine)
    engine.dispose()

def seed_user(db, email):
    user = User(id=str(uuid4()), clerk_user_id="clerk_" + str(uuid4()), email=email, email_verified=True, full_name=email.split("@")[0])
    db.add(user)
    db.flush()
    return user

def seed_org(db, owner, name):
    org = Organization(id=str(uuid4()), name=name, slug=name.lower() + "-" + uuid4().hex[:6], org_type="client", status="active", created_by=owner.id)
    db.add(org)
    db.flush()
    return org

def test_user_cannot_access_another_tenant(db):
    alice = seed_user(db, "alice@example.com")
    bob = seed_user(db, "bob@example.com")
    org_a = seed_org(db, alice, "Client A")
    org_b = seed_org(db, bob, "Client B")
    db.add(Membership(id=str(uuid4()), organization_id=org_a.id, user_id=alice.id, role="owner", status="active"))
    db.add(Membership(id=str(uuid4()), organization_id=org_b.id, user_id=bob.id, role="owner", status="active"))
    db.commit()
    with pytest.raises(HTTPException) as error:
        membership(db, org_b.id, alice)
    assert error.value.status_code == 404

def test_member_cannot_manage_organization(db):
    user = seed_user(db, "member@example.com")
    org = seed_org(db, user, "Client")
    db.add(Membership(id=str(uuid4()), organization_id=org.id, user_id=user.id, role="member", status="active"))
    db.commit()
    with pytest.raises(HTTPException) as error:
        require_org_admin(db, org.id, user)
    assert error.value.status_code == 403

def test_project_access_requires_project_membership(db):
    owner = seed_user(db, "owner@example.com")
    engineer = seed_user(db, "engineer@example.com")
    org = seed_org(db, owner, "Client")
    db.add_all([
        Membership(id=str(uuid4()), organization_id=org.id, user_id=owner.id, role="owner", status="active"),
        Membership(id=str(uuid4()), organization_id=org.id, user_id=engineer.id, role="member", status="active"),
    ])
    project = Project(id=str(uuid4()), organization_id=org.id, name="Restricted Project", description="", platform="Microsoft Fabric", status="active", created_by=owner.id)
    db.add(project)
    db.commit()
    with pytest.raises(HTTPException) as error:
        require_project_access(db, project, engineer)
    assert error.value.status_code == 404

def test_project_owner_can_manage_project_members(db):
    owner = seed_user(db, "orgowner@example.com")
    project_owner = seed_user(db, "projectowner@example.com")
    org = seed_org(db, owner, "Client")
    db.add_all([
        Membership(id=str(uuid4()), organization_id=org.id, user_id=owner.id, role="owner", status="active"),
        Membership(id=str(uuid4()), organization_id=org.id, user_id=project_owner.id, role="member", status="active"),
    ])
    project = Project(id=str(uuid4()), organization_id=org.id, name="Managed Project", description="", platform="Microsoft Fabric", status="active", created_by=owner.id)
    db.add(project)
    db.flush()
    db.add(ProjectMembership(id=str(uuid4()), project_id=project.id, user_id=project_owner.id, role="project_owner"))
    db.commit()
    assert require_project_manager(db, project, project_owner).role == "project_owner"

def test_removing_org_member_clears_project_and_team_memberships(db):
    owner = seed_user(db, "owner2@example.com")
    member = seed_user(db, "member2@example.com")
    org = seed_org(db, owner, "Client Cleanup")
    db.add_all([
        Membership(id=str(uuid4()), organization_id=org.id, user_id=owner.id, role="owner", status="active"),
        Membership(id=str(uuid4()), organization_id=org.id, user_id=member.id, role="member", status="active"),
    ])
    project = Project(id=str(uuid4()), organization_id=org.id, name="Project", description="", platform="Fabric", status="active", created_by=owner.id)
    team = Team(id=str(uuid4()), organization_id=org.id, name="Engineering", description="", status="active", created_by=owner.id)
    db.add_all([project, team])
    db.flush()
    db.add_all([
        ProjectMembership(id=str(uuid4()), project_id=project.id, user_id=member.id, role="viewer"),
        TeamMember(id=str(uuid4()), team_id=team.id, user_id=member.id, role="member"),
    ])
    db.commit()
    remove_member(org.id, member.id, owner, db)
    assert db.query(Membership).filter_by(organization_id=org.id, user_id=member.id, status="active").count() == 0
    assert db.query(ProjectMembership).filter_by(project_id=project.id, user_id=member.id).count() == 0
    assert db.query(TeamMember).filter_by(team_id=team.id, user_id=member.id).count() == 0

def test_owner_must_transfer_before_leaving_org(db):
    owner = seed_user(db, "owner3@example.com")
    org = seed_org(db, owner, "Client Owner")
    db.add(Membership(id=str(uuid4()), organization_id=org.id, user_id=owner.id, role="owner", status="active"))
    db.commit()
    with pytest.raises(HTTPException) as error:
        leave_organization(org.id, owner, db)
    assert error.value.status_code == 409

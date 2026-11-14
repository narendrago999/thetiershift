# TierShift Data Factory API — Identity & Tenant Core

FastAPI service for Clerk-backed identity, Neon PostgreSQL persistence, organization tenancy, invitations, organization roles, project membership and audit events.

## Implemented

- Clerk RS256 session JWT signature, issuer, expiry and authorized-party verification.
- Server-side Clerk user lookup and verified-email synchronization.
- Organization create/list/read/update/archive and ownership transfer.
- Organization roles: owner, admin, member.
- Secure email invitations: random one-time tokens, SHA-256 token hashes, expiry, revocation and verified-email acceptance.
- Member listing, role changes and removal with owner/admin boundaries.
- Project creation/listing and project-level roles: project owner, architect, data engineer, BI developer, QA engineer, viewer.
- Organization-scoped audit events.
- CORS allowlist and health/readiness endpoints.
- Alembic schema migration.

## Local setup

1. Create a Clerk application. Enable the sign-in methods you want and require email verification.
2. Create a Neon PostgreSQL database.
3. Copy .env.example to .env and set the database URL, Clerk publishable/secret keys, exact issuer, JWKS URL, frontend origins and app base URL.
4. Install dependencies with python -m venv .venv, activate it, then pip install -r requirements.txt.
5. Run alembic upgrade head.
6. Start with uvicorn app.main:app --reload --port 8000.
7. Check /health/ready and inspect /docs in development.

CLERK_ISSUER must exactly match the iss claim in a real Clerk session token. CLERK_JWKS_URL must be the JWKS endpoint for that issuer. CORS_ORIGINS must include the exact browser origin. The API validates the azp claim when present.

## Invitation email

Configure SMTP_HOST, SMTP_PORT, SMTP_FROM_EMAIL and credentials. Development mode without SMTP returns a one-time invite URL for testing. Production fails closed unless SMTP is configured. The raw invitation token is never stored; only its SHA-256 hash is persisted. The invited user must sign in with the invited email and verify it before acceptance.

## Tenant and role boundaries

- Every organization endpoint checks an active membership. Unknown or unauthorized organization IDs return not found.
- Owner and admin can manage organization settings. Only owner can grant admin access, remove admins, transfer ownership or archive the organization.
- Admin cannot alter the owner or other admins. The owner cannot be removed or demoted without ownership transfer.
- Project routes resolve the project and then check organization membership. Project membership is separate from organization membership.
- Project owners can manage project membership; organization owners/admins can also manage projects.
- Client-supplied organization IDs are never treated as authorization.
- Audit events are written for organization, membership, invitation and project membership changes.

## Deployment

A Render Blueprint is provided at render.yaml. Create a Render Blueprint from this branch and set every sync:false secret in the Render dashboard. Use the health check /health/ready. Run Alembic migrations as part of the release command.

Required production values:
- DATABASE_URL — Neon PostgreSQL connection string using SSL.
- CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.
- CLERK_ISSUER and CLERK_JWKS_URL from the Clerk instance.
- CORS_ORIGINS — exact allowed frontend origins.
- APP_BASE_URL — https://thetiershift.com/ai-data-factory/
- SMTP settings for invitations.

Never commit .env. Use HTTPS and managed secrets. Configure database backups, monitoring, rate limiting and retention before onboarding external customers.

## Not yet live

The source code is committed, but it is not connected to a real Clerk instance, Neon database or deployed API until you configure those accounts and deploy the service. Do not onboard client data before staging integration tests and a security review.

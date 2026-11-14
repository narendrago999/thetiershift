# TierShift Data Factory API — Identity & Tenant Core

FastAPI service for Clerk-backed identity, Neon PostgreSQL persistence, organization tenancy, invitations, organization roles, project membership and audit events.

## Implemented

- Clerk RS256 session JWT signature, issuer, expiry and authorized-party verification.
- Server-side Clerk user lookup and verified-email synchronization.
- Organization create/list/read/update/archive and ownership transfer.
- Organization roles: owner, admin, member.
- Secure email invitations: random one-time tokens, SHA-256 token hashes, expiry, revocation and verified-email acceptance.
- Member listing, role changes and removal with owner/admin boundaries; removed members also lose project and team memberships.
- Team create/list/update/archive, team leads and team member assignment/removal.
- Project creation/listing and project-level roles: project owner, architect, data engineer, BI developer, QA engineer, viewer; single-owner transfer is serialized.
- Organization-scoped audit events.
- CORS allowlist and health/readiness endpoints.
- Alembic schema migration.

## Browser-based development with GitHub Codespaces

The repository includes a root `.devcontainer/devcontainer.json` for a Python 3.12 and Node 22 Codespace. Open the repository in GitHub Codespaces; dependency installation runs automatically and ports 8000 (API) and 5500 (frontend) are forwarded.

1. In the Codespaces terminal, copy `ai-data-factory/backend/.env.example` to `ai-data-factory/backend/.env`.
2. Populate development-only Clerk and Neon values using GitHub Codespaces Secrets or a local untracked `.env`. Never paste secrets into committed files.
3. Start the API from `ai-data-factory/backend` with `.venv/bin/uvicorn app.main:app --reload --port 8000`.
4. In a second terminal, serve `ai-data-factory/frontend` on port 5500 (for example, `npx http-server ai-data-factory/frontend -p 5500` from the repository root).
5. Check `/health/live` and `/health/ready` on the forwarded API port. The readiness endpoint requires a reachable configured database.

Codespaces is a development environment, not production hosting. Its setup has been defined in the repository; an actual Codespaces launch still needs to be exercised by a repository contributor.

## Local setup

1. Create a Clerk application. Enable the sign-in methods you want and require email verification.
2. Create a Neon PostgreSQL database.
3. Copy .env.example to .env and set the database URL, Clerk publishable/secret keys, exact issuer, JWKS URL, frontend origins and app base URL.
4. Install dependencies with python -m venv .venv, activate it, then pip install -r requirements.txt.
5. Run alembic upgrade head. This creates the tenant core schema and enables PostgreSQL pgvector through migration 0002.
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
- SMTP settings for invitations (deferred until a real provider and verified sender are supplied).
- LLM_BASE_URL, LLM_API_KEY, LLM_MODEL and LLM_TIMEOUT_SECONDS when the LLM adapter is implemented; current example values are placeholders and must not be used for requests.

Never commit .env. Use HTTPS and managed secrets. Configure database backups, monitoring, rate limiting and retention before onboarding external customers.

## Not yet live

Neon, Clerk and Render provisioning have been confirmed by the product owner. Repository-side integration code is present, but live connectivity and staging security tests still need to be run against those environments. SMTP delivery and LLM inference remain intentionally unavailable until real provider credentials are supplied. Do not onboard client data before staging integration tests and a security review.

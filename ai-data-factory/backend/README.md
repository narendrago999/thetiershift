# TierShift Data Factory API — Identity & Tenant Core

FastAPI service for Clerk-backed identity, Neon PostgreSQL persistence, organization tenancy, invitations, organization roles, project membership and audit events.

## Implemented in this foundation

- Clerk RS256 session-token verification against configured JWKS and issuer.
- Server-side Clerk user lookup; email verification state is sourced from Clerk, not browser input.
- User synchronization into PostgreSQL.
- Organization create/list/read/update/archive and ownership transfer.
- Organization roles: owner, admin, member.
- Email invitations with random one-time tokens stored only as SHA-256 hashes, expiry, revocation and verified-email acceptance.
- Member listing, role changes and removal with owner/admin boundaries.
- Project creation/listing and project-level roles.
- Organization-scoped audit events.
- CORS allowlist and live/readiness health checks.
- Alembic schema migration.

## Local setup

1. Create a Clerk application and enable your chosen sign-in methods. Enable email verification.
2. Create a Neon PostgreSQL database.
3. Copy .env.example to .env; set DATABASE_URL, Clerk publishable/secret keys, issuer, JWKS URL, frontend origin, API URL and SMTP settings.
4. Install dependencies: python -m venv .venv, activate it, then pip install -r requirements.txt.
5. Run migrations: alembic upgrade head.
6. Start API: uvicorn app.main:app --reload --port 8000.
7. Verify /health/ready and inspect /docs in development.

CLERK_ISSUER must exactly match the iss claim in a real Clerk session token. CLERK_JWKS_URL must be the JWKS endpoint for that issuer. Do not disable signature or issuer verification.

## Frontend connection

The static frontend needs the Clerk publishable key and API base URL in frontend/config.js. The Clerk secret key and database URL stay only in backend environment variables. Browser requests send Clerk session JWTs as Bearer tokens; /api/v1/auth/sync synchronizes the signed-in Clerk identity before protected APIs are used.

## Invitation email

Set SMTP host, port, sender and credentials to send invitations. In development without SMTP, the API returns a one-time invitation URL for local testing. In production, invitation creation fails closed unless SMTP is configured. The raw token is never stored in the database; only its SHA-256 hash is persisted.

## Tenant security model

Every organization route checks an active membership for the authenticated user. Every project route resolves the project first and then checks membership in its owning organization. Project membership cannot grant access to an organization the user does not belong to. Organization IDs supplied by clients are never treated as authorization. Admins cannot grant admin roles or modify/remove the owner; only the owner can grant admin access. Ownership transfer is restricted to the current owner.

## Production checklist

- Use managed secrets for all backend environment variables.
- Set APP_ENV=production; set exact Clerk issuer, JWKS URL, DATABASE_URL, CORS_ORIGINS, APP_BASE_URL and SMTP credentials.
- Deploy behind HTTPS; configure Clerk allowed origins and redirect URLs.
- Run alembic upgrade head as a release step.
- Configure database backups, connection limits, rate limiting, alerting and log retention.
- Add integration tests against a staging Clerk instance and isolated Neon database before onboarding external clients.

This repository contains application code, not live Clerk or Neon credentials. The service is not live until configured and deployed.

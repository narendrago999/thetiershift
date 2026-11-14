# Live Authentication & Tenant Setup

This checklist takes the committed Clerk + FastAPI + Neon integration from source code to a connected staging deployment.

## 1. Create the Clerk application

1. Open the Clerk Dashboard and create a dedicated application for TierShift Data Factory.
2. Enable Email + Password (or the sign-in methods you want to support).
3. Require email verification.
4. Add the application origins / allowed domains:
   - https://thetiershift.com
   - http://localhost:5500 (development only)
5. Copy the Publishable Key and Secret Key.
6. Record the exact issuer / Frontend API domain shown for the instance. The session token issuer must match this value exactly.
7. Set the JWKS URL to the instance Frontend API domain followed by /.well-known/jwks.json.

Use test keys for staging. Switch to live Clerk keys only when production domains and redirect URLs are configured.

## 2. Create Neon PostgreSQL

1. Create a Neon project and database for the Data Factory application.
2. Copy the connection string (pooled or direct) and ensure SSL is required.
3. Do not put the connection string in frontend/config.js.
4. Set it as DATABASE_URL in the backend deployment environment. The backend normalizes standard postgres:// and postgresql:// URLs to the psycopg SQLAlchemy driver.

## 3. Deploy the API on Render

1. Open Render and create a new Blueprint.
2. Select this repository and branch: feat/ai-data-factory-foundation.
3. Select the Blueprint file: ai-data-factory/backend/render.yaml.
4. Set the secret / sync:false variables in the Render dashboard:

| Variable | Value |
|---|---|
| DATABASE_URL | Neon PostgreSQL connection string |
| CLERK_PUBLISHABLE_KEY | Clerk publishable key |
| CLERK_SECRET_KEY | Clerk secret key |
| CLERK_ISSUER | Exact issuer from Clerk session tokens |
| CLERK_JWKS_URL | Clerk Frontend API JWKS URL |
| SMTP_HOST | SMTP provider host |
| SMTP_USERNAME | SMTP username |
| SMTP_PASSWORD | SMTP password |
| SMTP_FROM_EMAIL | Verified sender address |

5. Confirm the Blueprint values for APP_ENV, APP_BASE_URL, CORS_ORIGINS and INTERNAL_EMAIL_DOMAINS.
6. Deploy. The start command applies Alembic migrations and starts Uvicorn.
7. Confirm the health endpoint returns ready: https://YOUR-API-HOST/health/ready.

The free Render web service may sleep when idle. Use a paid always-on runtime before promising production-grade availability to client organizations.

## 4. Connect the static frontend

Edit ai-data-factory/frontend/config.js:

- clerkPublishableKey: use the Clerk Publishable Key (public key only).
- apiBaseUrl: use the deployed HTTPS Render API URL, without a trailing slash.

Do not add CLERK_SECRET_KEY, DATABASE_URL, SMTP credentials or any other secret to config.js. The publishable key is designed for browser use.

The frontend target remains https://thetiershift.com/ai-data-factory/. Ensure the static deployment serves the frontend directory at that path and preserves the existing TierShift homepage.

## 5. SMTP invitation delivery

The API stores only a SHA-256 hash of each random invitation token. In development without SMTP, it returns a test invitation URL. In production, invitation creation fails closed unless SMTP is configured. The invited person must authenticate with the invited email and verify it before accepting.

## 6. First-user and internal organization setup

1. Open the Data Factory URL and create the first Clerk account using a verified @thetiershift.com address.
2. The first user can create an Internal organization because INTERNAL_EMAIL_DOMAINS defaults to thetiershift.com.
3. External users can create Client organizations, but cannot create Internal organizations unless their email domain is explicitly allowlisted.
4. Invite a second test account and verify invitation acceptance.

## 7. Staging security test

Use two separate test accounts and two separate client organizations.

- User A can only list and read organizations where A has active membership.
- User A cannot list members, projects, teams, invitations or audit records from User B's organization.
- Team membership requires active membership in the parent organization; team leads cannot grant lead privileges.
- A project member must have both active organization membership and project membership.
- Project access can be granted, updated, transferred to a new project owner or removed; only one project owner is maintained.
- Organization admins cannot grant admin access, modify/remove the owner, transfer ownership or archive the organization.
- Only the owner can transfer ownership and archive.
- Invitation tokens expire, are one-time, are stored hashed, and are bound to the verified invited email.
- Archived organizations are no longer accessible through tenant endpoints.

Do not onboard customer data until these checks pass against the staging Clerk and Neon instances.

## Current implementation boundary

Authentication and organization management are connected to the FastAPI APIs when configured. Other dashboard sections still contain illustrative foundation data; their data APIs are separate upcoming work.

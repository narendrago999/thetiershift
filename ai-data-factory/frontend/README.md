# Frontend — TierShift AI Data Factory

This is the static frontend foundation for the TierShift AI Data Factory SaaS application.

## Preview

The frontend is plain HTML, CSS, and JavaScript. ClerkJS is loaded from the Clerk Frontend API at runtime; FastAPI is the authenticated application API.

- Entry point: `index.html`
- Styles: `css/app.css`
- Interactions and preview fixtures: `js/app.js`

For local development, serve this directory with a static file server and run the FastAPI backend separately. Set the public Clerk publishable key and API base URL in config.js.

## Product identity and deployment target

- Product identity: **TierShift Data Factory**, a distinct product identity under TierShift Technologies.
- Deployment target: `https://thetiershift.com/ai-data-factory` (path-based deployment; DNS remains on the existing domain).
- Audience: internal TierShift teams and external client organizations, using organization/project-scoped access.
- Theme: dark and light modes with a browser-local preview preference. Production preferences should be stored per authenticated user.

## Identity and organization onboarding preview\n\n- Sign-in, sign-up, password recovery and email verification screens are UI-only.\n- Organization switcher opens an organization setup panel with internal workspace context, client/internal organization type, and invite preview.\n- Invitation roles are illustrative. No emails, accounts, memberships or permissions are created.\n- Passwords and verification codes are never persisted or transmitted by this preview.\n- Real identity and organization access must be implemented with Clerk plus server-side FastAPI RBAC and tenant checks.\n\n## Current screens

- Overview dashboard
- Projects (search, filters, create-project preview)
- AI Workforce
- Workflow blueprint
- Live Operations
- Connections
- Fabric Resources
- Knowledge Base
- Approvals
- Settings

## Important preview behavior

All displayed projects, agent definitions, counts, and approval requests are illustrative frontend fixtures. Creating a project only updates in-memory browser state; refreshing the page resets it. No Fabric, LLM, database, or authentication API is called. Approval controls do not execute actions. This is intentional until the backend and identity layer are implemented.

## Next integration work

1. Define and document API contracts.
2. Replace the identity preview with Clerk sign-up, sign-in, email verification and recovery flows; enforce protected routes through backend authorization.
3. Connect project/workspace data to FastAPI.
4. Replace fixture data with authenticated API responses.
5. Add live run updates through SSE/WebSockets or polling fallback.
6. Add secure connection setup and approval flows.

Never put Neon credentials, Clerk secret keys, LLM API keys, or Microsoft Fabric credentials in frontend JavaScript. Only public client-side configuration may be exposed in browser assets.

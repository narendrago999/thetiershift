# Frontend — TierShift AI Data Factory

This is the static frontend foundation for the TierShift AI Data Factory SaaS application.

## Preview

The frontend is plain HTML, CSS, and JavaScript. It does not require Python or a build step.

- Entry point: `index.html`
- Styles: `css/app.css`
- Interactions and preview fixtures: `js/app.js`

For a local static preview, serve this directory with any static file server (for example, the VS Code Live Server extension). The browser loads the frontend only; no backend is connected yet.

## Product identity and deployment target

- Product identity: **TierShift Data Factory**, a distinct product identity under TierShift Technologies.
- Deployment target: `https://thetiershift.com/ai-data-factory` (path-based deployment; DNS remains on the existing domain).
- Audience: internal TierShift teams and external client organizations, using organization/project-scoped access.
- Theme: dark and light modes with a browser-local preview preference. Production preferences should be stored per authenticated user.

## Current screens

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
2. Add Clerk authentication UI and protected route behavior.
3. Connect project/workspace data to FastAPI.
4. Replace fixture data with authenticated API responses.
5. Add live run updates through SSE/WebSockets or polling fallback.
6. Add secure connection setup and approval flows.

Never put Neon credentials, Clerk secret keys, LLM API keys, or Microsoft Fabric credentials in frontend JavaScript. Only public client-side configuration may be exposed in browser assets.

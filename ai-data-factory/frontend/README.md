# TierShift AI Data Factory — Frontend

Static HTML, CSS and JavaScript application shell. ClerkJS provides the real authentication UI; FastAPI is the authorization and tenant API.

## Local development

1. Edit frontend/config.js.
2. Set clerkPublishableKey to the Clerk publishable key (public browser key only).
3. Set apiBaseUrl to the FastAPI URL, for example http://localhost:8000.
4. Serve this directory over HTTP using VS Code Live Server or python -m http.server 5500.
5. Start the backend separately; see ../backend/README.md.

The Clerk SDK and Clerk UI bundle are loaded from the Frontend API domain encoded in the publishable key. Clerk handles registration, sign-in, password recovery, verification and session lifecycle.

## Configuration

frontend/config.js contains only public settings: clerkPublishableKey and apiBaseUrl. Never place Clerk secret keys, Neon connection strings, SMTP passwords, LLM keys or Fabric credentials in frontend assets.

## Live identity and tenant features

- Clerk prebuilt sign-in UI with sign-up, password recovery and verification.
- Session token sent as an Authorization Bearer token to FastAPI.
- Server-side user synchronization with Clerk Backend API.
- Organization list and switching.
- Create client or internal organizations.
- Member list, role changes and member removal.
- Organization invitations, pending invitation list, revocation and verified-email acceptance.
- Organization and project roles enforced by FastAPI, not by frontend visibility.
- User must be authenticated to access tenant controls.

## Current product boundary

Authentication and organization controls call live APIs when correctly configured. The rest of the dashboard still contains foundation/demo project, agent and operations fixtures. Those areas must not be mistaken for live business data until their APIs are connected.

## Deployment

The target public path remains https://thetiershift.com/ai-data-factory/. Configure the Clerk application with that domain and set the deployed API URL in config.js. Keep the existing TierShift public site and main branch untouched while validating this feature branch.

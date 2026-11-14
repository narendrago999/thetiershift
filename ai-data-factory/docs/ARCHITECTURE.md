# TierShift AI Data Factory — Architecture

## 1. High-level components

- **Frontend:** Static HTML/CSS/JavaScript application deployed through GitHub Pages. The existing TierShift public website remains independent.
- **Identity provider:** Clerk for registration, login, email verification, password reset, and session tokens.
- **Backend API:** Python/FastAPI hosted on a cloud application runtime. It verifies identity tokens, enforces authorization, exposes application APIs, and coordinates work.
- **Agent workers:** Cloud-hosted Python worker process(es) for long-running LangGraph workflows. Jobs must not depend on a user's browser tab or personal computer.
- **Operational database:** Neon-hosted PostgreSQL for users, organizations, projects, memberships, agents, metadata, workflow records, approvals, and audit events.
- **Vector search:** pgvector for authorized semantic retrieval.
- **Agent orchestration:** LangGraph for stateful workflows, routing, checkpoints, retries, and human interrupts.
- **LLM adapter:** A provider-independent interface for the existing hosted model API.
- **Fabric tool layer:** Typed, permission-aware Python wrappers around Microsoft Fabric APIs and other approved execution interfaces.
- **Live updates:** SSE or WebSockets for activity, status, notifications, and approvals, subject to hosting support.
- **CI/CD:** GitHub Actions for tests, build validation, and deployment automation; not the persistent API server or durable job queue.
- **Development:** GitHub Codespaces is the preferred browser-based development option; local Python development is optional.

## 2. End-user experience and hosting boundary

This is a browser-based SaaS product. End users need only a supported browser and an account. They do not install Python, create virtual environments, install packages, run FastAPI, or start workers.

1. User opens the TierShift frontend hosted as a static site.
2. User authenticates through Clerk.
3. Frontend sends a short-lived session token to the cloud FastAPI API over HTTPS.
4. FastAPI validates the token and authorizes the organization/project action.
5. API records the request and starts or enqueues the workflow.
6. A cloud worker runs LangGraph and persists checkpoints/results.
7. Frontend receives status through polling or SSE/WebSockets.
8. Neon stores durable application state; Fabric resources remain in the customer's authorized tenant.

The browser must never receive privileged Neon credentials, Fabric secrets, or private LLM API keys.

## 3. Request and authorization flow

1. User signs in through Clerk.
2. Frontend obtains a short-lived session token.
3. Frontend sends the token to FastAPI over HTTPS.
4. FastAPI validates token signature, issuer, audience, expiry, and relevant claims using Clerk's supported verification approach.
5. Backend resolves the local user and organization membership.
6. Backend authorizes the requested project action using project membership and role.
7. Only then does it read project data or start an agent workflow.
8. Every state-changing action records actor, project, action, timestamp, and outcome.

The frontend is never the authorization boundary.

## 4. Multi-tenant data model

Core relationships:

- Organization has many organization memberships.
- Organization owns many projects.
- User can belong to many organizations.
- Project has many project memberships.
- User can belong to many projects.
- Project can contain teams and team memberships.
- Project owns requirements, source metadata, business rules, KPIs, workflows, resources, and knowledge references.

Every tenant-owned record carries an organization identifier. Project-owned records also carry a project identifier. Queries must scope by the authenticated organization and project. PostgreSQL RLS may provide defence in depth; it does not replace backend authorization.

## 5. Agent runtime model

Agent definitions are data:
- role and description
- versioned system instructions
- model configuration
- input/output schemas
- tool allowlist
- memory access scope
- execution limits

Agent implementations and tools are trusted application code. A database prompt or configuration must never be able to register arbitrary Python code, execute shell commands, or bypass tool permissions.

At runtime:
1. Load active agent version.
2. Validate task input.
3. Load only authorized project context.
4. Retrieve relevant approved knowledge.
5. Expose only allowlisted tools.
6. Execute with bounded steps/timeouts.
7. Validate structured output.
8. Save outputs and execution records.

## 6. Workflow and collaboration

A project workflow has a persistent identifier and a LangGraph checkpoint thread. Business records (tasks, approvals, decisions, audit logs) are separate from internal graph checkpoints.

Concurrency controls include:
- idempotency keys for state-changing requests
- task leases/locks with expiry
- optimistic version checks for shared metadata
- explicit ownership of long-running runs
- approval records with actor and timestamp
- cancellation and bounded retry policies

Independent tasks may run in parallel. Tasks that modify the same resource or depend on upstream outputs must be serialized or coordinated.

## 8. Human approval policy

Require explicit approval for:
- production changes
- destructive operations
- credential or connection changes
- publishing/deployment
- broad permission changes
- irreversible actions

Approval records must capture the proposed action, target resource, risk summary, requester, approver, decision, and execution result. The backend must re-check authorization immediately before execution.

## 9. Fabric tool contract

Each tool declares:
- stable tool name and version
- input and output schema
- supported authentication methods
- required permissions
- supported Fabric item types and API version
- read/write/destructive classification
- approval requirement
- timeout and retry policy
- idempotency behavior
- normalized errors

The tool layer validates parameters, authorizes the actor/agent, checks approvals, executes the API call, stores the result, and emits a UI event. API capabilities and service-principal/managed-identity support must be verified per endpoint; do not assume uniform support.

## 10. Knowledge and memory boundaries

Memory categories:
- workflow checkpoint state
- project requirements and decisions
- execution history
- approved reusable engineering patterns
- document chunks and vector embeddings

Knowledge retrieval must enforce organization/project scope. Cross-client reuse is disabled by default. Any future cross-tenant pattern library must contain explicitly approved, sanitized, non-confidential templates.

## 11. Security requirements

- No database URL, LLM key, Clerk secret, or Fabric secret in browser code or Git.
- Use HTTPS for hosted environments.
- Use environment variables for local secrets and a managed secret store when deployed.
- Never log passwords, access tokens, refresh tokens, connection secrets, or raw credential payloads.
- Use least-privilege Fabric identities and project-scoped permissions.
- Validate generated SQL/code before execution.
- Restrict execution to controlled workspaces and approved runtimes.
- Keep immutable audit records for security-relevant operations.
- Apply rate limits and request-size limits.
- Test cross-tenant access denial.

## 7. Cloud deployment topology

- Static frontend: GitHub Pages, with an app subdomain configured when ready.
- API: cloud-hosted FastAPI service with HTTPS, health checks, CORS allowlist, and environment-specific secrets.
- Worker: separate cloud-hosted Python worker/job runtime for long-running agent tasks.
- Database: Neon PostgreSQL with SSL and least-privilege credentials.
- Authentication: Clerk.
- CI/CD: GitHub Actions builds/tests and deploys approved commits; it is not the permanent API host or durable worker queue.

Select a hosting provider only after verifying free-tier quotas, sleep/cold starts, worker support, job duration, SSE/WebSocket support, outbound networking, secrets, logs, rollback, and overage pricing. A sleeping web service may be acceptable for a prototype API but is not automatically suitable for reliable agent execution. Keep durable state in Neon, not ephemeral disk. If no free provider supports a required capability, reduce MVP scope or request approval before adding paid hosting.

For development, use GitHub Codespaces for browser-based Python work if desired; local setup is optional. Codespaces is not production hosting. Keep development, staging, and production credentials/workspaces separate.

## 12. Observability and operations

- Structured logs include request/run IDs, agent/tool names, durations, and normalized outcomes.
- Never log secrets or sensitive source data.
- Track API/worker health, queue depth, job age, retries, failures, token usage, and hosting quotas.
- Alert on stuck jobs, repeated failures, and exhausted quotas.
- Provide cancellation, retry, and operator recovery controls.
- Document backup, restore, deployment rollback, and incident procedures.

## 13. Initial MVP topology

- Frontend: GitHub Pages.
- Backend API: cloud-hosted FastAPI staging service.
- Agent worker: cloud-hosted Python worker/job runtime where supported.
- Database: Neon PostgreSQL; authentication: Clerk.
- LLM: existing hosted API through backend only.
- Fabric operations: dedicated development workspace only, with approval for writes.
- Development: GitHub Codespaces or optional local setup.

This keeps the customer experience browser-only while private credentials and Python execution remain server-side.

# TierShift AI Data Factory — Cloud Deployment Plan

## 1. Objective

Deliver a browser-based SaaS experience. Customers use a browser and never install Python, configure a virtual environment, or run a local service. Python/FastAPI and the AI workforce run on cloud infrastructure controlled by TierShift.

The MVP targets free or low-cost services, but reliability and security take priority over a misleading free-tier claim.

## 2. Target topology

| Layer | Responsibility | Initial target |
| --- | --- | --- |
| Web frontend | UI and project dashboard | GitHub Pages |
| API | Authenticated endpoints, projects, approvals, event stream | Cloud-hosted FastAPI |
| Agent worker | LangGraph jobs, Fabric tools, retries, resumable execution | Cloud-hosted Python worker/job runtime |
| Durable state | Users, organizations, projects, runs, checkpoints, audit logs, vector knowledge | Neon PostgreSQL + pgvector |
| Identity | Signup, login, verification, sessions | Clerk |
| AI inference | Model calls and tool planning | Existing hosted LLM API, called only by backend |
| Source control | Code and reviews | GitHub |
| CI/CD | Tests, builds, staging deployment | GitHub Actions |

Frontend and backend are separate deployable services. The browser talks to the backend over HTTPS. The backend talks to Neon, the LLM provider, and Microsoft APIs.

## 3. Development without local Python installation

Preferred developer experience:
1. Open the repository in GitHub Codespaces.
2. Configure Codespaces secrets for non-production credentials.
3. Install dependencies using repository setup instructions.
4. Run FastAPI in the Codespaces terminal.
5. Use forwarded ports to preview the API and frontend.
6. Push a branch and open a pull request.
7. GitHub Actions runs automated checks.

Local Python setup remains optional for contributors. Codespaces is a development environment, not production hosting. Its usage allowance and limits must be checked for the user's plan.

## 4. Backend hosting selection checklist

Evaluate candidate providers using the same small test application. Do not select a provider based only on a free-tier headline.

Verify:
- Python/FastAPI container or service support.
- Separate background worker, scheduled job, or durable job execution support.
- Sleep/scale-to-zero behavior and cold-start time.
- Request timeout, job duration, memory, CPU, and concurrency limits.
- SSE and/or WebSocket support and connection limits.
- Outbound HTTPS access to Neon, Clerk, the LLM provider, and Microsoft APIs.
- Secure environment secrets, logs, health checks, metrics, and rollback.
- Persistent disk behavior. Durable application state must live in Neon or approved object storage, not ephemeral local disk.
- Free quota, card requirement, region options, and charges after quota.
- Independent deployment of API and worker.

### Decision rule

A sleeping free web service may be acceptable for early UI integration if the cold-start and availability limits are clear. Long-running agent work must not depend on one HTTP request staying open. If the free plan cannot run a reliable worker, use a compatible managed job/queue pattern or restrict the MVP to short resumable tasks. Do not claim production readiness for an unreliable worker. Do not introduce paid hosting without making the expected cost and reason explicit.

## 5. Deployment environments

### Development
- GitHub Codespaces or optional local machine.
- Development Clerk instance.
- Development Neon database/schema.
- Non-production LLM key with usage limits.
- Dedicated Fabric development workspace and test credentials.
- No production customer data.

### Staging
- HTTPS frontend and API.
- Separate staging secrets, database, Clerk configuration, and Fabric workspace.
- Test accounts and synthetic/sample datasets.
- Smoke tests for login, authorization, API, worker, checkpoint/resume, and UI events.

### Production (later gate)
- Custom app hostname, for example app.thetiershift.com.
- Production Clerk and Neon configuration.
- Production backend and worker services with monitoring and alerting.
- Least-privilege Fabric identities and customer-approved connections.
- Backups, recovery drills, incident process, rate limits, and cost alerts.
- Protected release and rollback process.

## 6. CI/CD workflow

1. Developer pushes a feature branch.
2. Pull request triggers formatting, linting, unit tests, dependency checks, and build validation in GitHub Actions.
3. Required checks pass before merge.
4. Merge to the agreed integration branch deploys to staging.
5. Deployment runs health and smoke tests.
6. Production deployment is a separate protected release step after explicit readiness approval.
7. Rollback returns to the last known-good build. Database migrations follow backward-compatible expand/migrate/contract practices.

GitHub Actions runs finite CI/CD jobs. It is not the continuously available FastAPI host, durable message broker, or agent worker.

## 7. Security and secrets

Keep all of these server-side:
- Neon connection string and database credentials.
- LLM API keys.
- Clerk secret key and webhook signing secrets.
- Microsoft Entra/Fabric credentials, certificates, and refresh tokens.
- Source-system credentials.

Rules:
- Never commit secrets or place them in frontend JavaScript, HTML, source maps, or public GitHub Pages assets.
- Use host-managed environment secrets or a secret manager for deployed services.
- Use Codespaces secrets for development.
- Restrict CORS to exact approved app origins.
- Validate Clerk tokens and enforce organization/project RBAC on every protected backend operation.
- Use least privilege and separate credentials across development, staging, and production.
- Redact tokens, credentials, and sensitive source data from logs.
- Rotate credentials and document revocation procedures.

## 8. Background jobs and live progress

The API validates a request, creates a run record, and hands work to a worker/job mechanism. The worker:
- claims a job using a lease;
- loads authorized project context;
- executes a bounded LangGraph workflow;
- persists checkpoints and outputs;
- renews or releases its lease;
- records errors and retries safely;
- supports cancellation and resume.

The browser can close and reopen without losing the run. The UI reads durable run state and subscribes to events using SSE/WebSockets where supported, with polling as a fallback. An in-memory queue or browser connection is never the source of truth.

## 9. Cost controls

Track monthly:
- backend API and worker usage;
- Neon storage, compute, connections, and backup limits;
- Clerk active users and plan quotas;
- LLM requests, tokens, and model pricing;
- GitHub Actions/Codespaces usage;
- Microsoft Fabric capacity and API usage;
- logs, monitoring, and object storage.

Add per-project/user rate limits, maximum agent steps, execution timeouts, token budgets, and approval gates for expensive or destructive actions. Alert before free quotas are exhausted.

## 10. Rollout sequence and exit criteria

### Gate A — Development foundation
- Codespaces setup documented and verified.
- FastAPI starts and connects securely to development Neon.
- GitHub Actions tests pass.

### Gate B — Hosting proof of concept
- Candidate provider runs FastAPI over HTTPS.
- Secrets are configured securely.
- Health check and Clerk-token verification work.
- Outbound connection to development Neon and test LLM endpoint succeeds.
- Free-tier limitations and estimated overage costs are recorded.

### Gate C — Worker proof of concept
- A separate worker/job executes a sample LangGraph task.
- Task state survives worker restart through persistent checkpoints.
- Retry, cancellation, timeout, and duplicate-submission tests pass.
- Browser closure does not cancel a durable job.

### Gate D — Staging SaaS
- GitHub Pages frontend calls the hosted API.
- Clerk login works end to end.
- Tenant and project authorization tests pass.
- UI shows real run state and events, not fabricated progress.
- No secrets appear in frontend assets or logs.

### Gate E — Production readiness
- Security review, load test, backup/restore test, monitoring, quota alerts, runbooks, and rollback are complete.
- Hosting cost and ownership are approved.
- Custom app domain and production credentials are configured.
- No end user needs local Python setup.

## 11. Explicit non-goals

- Do not use GitHub Pages to run Python.
- Do not treat GitHub Actions as a permanent web server or durable queue.
- Do not put database, LLM, Clerk, or Fabric secrets in browser code.
- Do not claim always-on or production-ready behavior when the selected free plan sleeps, limits workers, or cannot resume jobs reliably.
- Do not require customers to install Python or run agents on their own computers.

# TierShift AI Data Factory

**A browser-based AI workforce for planning, building, validating, and documenting Microsoft Fabric data platforms.**

TierShift AI Data Factory is an independent application module within the TierShift Technologies repository. It is designed as a multi-user, multi-organization platform where human teams collaborate with specialized AI agents on data engineering projects.

## End-user experience

The product is browser-only for customers: open the TierShift app, register or sign in, create or join a project, provide requirements, approve proposed actions, and monitor agent runs and deliverables in the dashboard.

**End users do not install Python, create virtual environments, install packages, or run a local backend.** Python and LangGraph execute on cloud-hosted application services and workers.

## Product goals

- Capture client requirements, source systems, KPIs, business rules, and delivery constraints.
- Design reviewable data architectures and implementation plans.
- Orchestrate specialist AI agents with LangGraph.
- Execute approved operations against Microsoft Fabric through a controlled Python tool layer.
- Generate metadata-driven ingestion, transformation, modelling, and QA assets.
- Preserve project history and approved reusable engineering knowledge.
- Support organizations, project teams, invitations, roles, approvals, and audit trails.

## Initial technology decisions

| Area | Initial choice |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Frontend hosting | GitHub Pages; keep the current public site unchanged |
| Backend API | Python + FastAPI on a cloud runtime |
| Agent execution | Cloud-hosted Python worker(s) for long-running LangGraph jobs |
| Operational database | Neon-hosted PostgreSQL |
| Database access | SQLAlchemy + psycopg |
| Migrations | Alembic |
| Vector search | pgvector |
| Authentication | Clerk |
| Authorization | Application-managed RBAC and project membership checks |
| Agent orchestration | LangGraph |
| Agent/model utilities | LangChain where useful |
| LLM | Existing hosted model through a provider adapter |
| Fabric execution | Microsoft Fabric REST APIs through typed Python tools |
| Live updates | Server-Sent Events or WebSockets, based on host support |
| CI/CD | GitHub Actions for tests and deployment, not permanent backend hosting |
| Cloud development | GitHub Codespaces preferred; local Python development optional |
| Secrets | Codespaces/host-managed environment secrets; never commit secrets |

## Cloud hosting strategy

- Use the Neon free tier within its published limits.
- Target a no/low-cost MVP using verified free-tier services.
- Deploy FastAPI as an HTTPS API and run long-running agent work in a compatible cloud worker/job runtime.
- Choose the backend provider only after checking quotas, sleep/cold starts, worker support, job duration, networking, live-update support, secrets, logs, and overage pricing.
- Use GitHub Actions for CI/CD, not as a permanent API server or durable queue.
- Use GitHub Codespaces for browser-based development; local Python setup is optional.
- Keep the existing static website deployment independent.
- Never expose backend secrets or database credentials to the public browser.
- Track LLM usage, Neon/Clerk quotas, hosting usage, and Fabric capacity; model inference and Fabric capacity may incur separate costs.
- Track model/API usage and free-tier quotas.

## Repository layout

```text
ai-data-factory/
├── frontend/
│   ├── index.html
│   ├── assets/
│   ├── css/
│   └── js/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── agents/
│   │   ├── orchestration/
│   │   ├── tools/
│   │   │   └── fabric/
│   │   ├── memory/
│   │   ├── knowledge/
│   │   ├── security/
│   │   ├── services/
│   │   └── schemas/
│   ├── migrations/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── infrastructure/
│   ├── database/
│   └── fabric/
└── docs/
    ├── ARCHITECTURE.md
    ├── MASTER_ROADMAP.md
    └── DEPLOYMENT_PLAN.md
```

## Security principles

1. The browser never receives database credentials, LLM API keys, or Fabric client secrets.
2. Every protected API request authenticates the user and authorizes organization/project access.
3. Organization and project boundaries are enforced in backend queries; PostgreSQL RLS is an additional defence where appropriate.
4. AI agents can call only registered, typed tools granted to them.
5. Destructive operations and production changes require explicit approval.
6. All tool calls, approvals, state transitions, and important changes are auditable.
7. Generated SQL and code are validated and executed in controlled environments.

## Current status

The identity and tenant foundation is now implemented in this feature branch: ClerkJS frontend integration, FastAPI JWT verification, Neon/PostgreSQL models and migrations, organization RBAC, invitations, project membership, audit events, Render deployment blueprint and GitHub Actions checks. It is not yet live because a real Clerk application, Neon database, SMTP sender and deployed API still need to be configured. The remaining dashboard data and AI/Fabric execution modules are not yet connected.

See:
- [Master development roadmap](docs/MASTER_ROADMAP.md)
- [Architecture and security decisions](docs/ARCHITECTURE.md)
- [Cloud deployment plan](docs/DEPLOYMENT_PLAN.md)

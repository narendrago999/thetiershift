# TierShift AI Data Factory

**Autonomous AI workforce for planning, building, validating, and documenting Microsoft Fabric data platforms.**

TierShift AI Data Factory is an independent application module within the TierShift Technologies repository. It is designed as a multi-user, multi-organization platform where human teams collaborate with specialized AI agents on data engineering projects.

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
| Existing website | GitHub Pages; keep the current public site unchanged |
| Backend | Python + FastAPI, initially run locally |
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
| Live updates | Server-Sent Events or WebSockets, selected per use case |
| Secrets | Local environment variables during development; never commit secrets |

## Cost-conscious development model

- Use the Neon free tier within its published limits.
- Run FastAPI and background workers locally during initial development.
- Keep the existing static website deployment independent.
- Do not expose a local backend or database credentials to the public browser.
- Do not introduce paid hosting until the MVP has passed its acceptance tests.
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
    └── MASTER_ROADMAP.md
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

The project is in the foundation/planning stage. No database, Clerk application, Fabric connection, or live AI agent is assumed to exist until it has been configured and tested.

See:
- [Master development roadmap](docs/MASTER_ROADMAP.md)
- [Architecture and security decisions](docs/ARCHITECTURE.md)

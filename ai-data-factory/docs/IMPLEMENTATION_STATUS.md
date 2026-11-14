# AI Data Factory — Verified Implementation Status

Last reviewed: 2026-11-14
Source of truth: `docs/MASTER_ROADMAP.md`

## Status definitions

- **Implemented in code:** Relevant source/configuration exists in the repository.
- **Verified:** The acceptance criteria have passed repeatable tests or direct checks.
- **Live verified:** The deployed service and its external integrations have been exercised successfully.
- **Blocked / owner action:** Requires account access, credentials, tenant permissions, a decision, or an action from the product owner.

A phase is not complete merely because code exists.

## Current phase assessment

| Roadmap phase | Status | Evidence / remaining work |
|---|---|---|
| 0 — Cloud accounts and development foundation | Partial | FastAPI, SQLAlchemy, Alembic, Clerk JWT verification, Neon configuration, health endpoint and CI exist. LLM connectivity and pgvector are not implemented/verified. Actual Neon/Clerk/API deployment and Codespaces setup require live verification. CI was updated to run on pushes to main and to audit Python dependencies; its resulting run must pass. |
| 1 — Product shell and command-centre UI | Partial | Responsive application shell, navigation, dashboard, projects and authentication UI exist. The AI command centre, real agent/workflow activity, artifacts and approval experience remain incomplete. |
| 2 — Identity, organizations and authorization | Implemented in code; live verification pending | Clerk integration, organizations, memberships, teams, projects, invitations, roles, audit events and tenant authorization tests exist. Invitation delivery/acceptance needs end-to-end staging verification. |
| 3 — Operational database and AI Brain | Partial | Tenant-core SQLAlchemy models and one initial migration exist. AI schemas, project requirements/context, source metadata, decisions, workflow records, knowledge chunks, embeddings, pgvector and scoped retrieval remain outstanding. |
| 4 — LLM adapter and dynamic Agent Registry | Not implemented | No provider adapter, versioned agent registry, structured agent execution, tool allowlists or usage logging found. |
| 5 — LangGraph orchestration and human-in-the-loop | Not implemented | No LangGraph runtime, persistent graph checkpoints, task routing, resumability, event stream or approval interrupts found. |
| 5A — Cloud runtime, staging and CI/CD | Partial | Render API blueprint and GitHub Actions workflow exist. Separate durable worker/job runtime, staging proof, restart/resume tests and deployment smoke tests remain outstanding. |
| 6 — Planning, source discovery and architecture workforce | Not implemented | No operational requirement-analysis, source-discovery or architecture agents found. |
| 7 — Microsoft Fabric integration | Not implemented | No typed Fabric API tool layer, resource inventory or approved provisioning implementation found. |
| 8 — Data Engineering workforce | Not implemented | No operational ingestion, transformation, modelling or SCD2 agents/execution framework found. |
| 9 — QA, BI and DevOps workforce | Not implemented | No operational QA, reconciliation, BI or DevOps agents found. |
| 10 — Knowledge learning | Not implemented | No approved reusable knowledge capture/retrieval or agent evaluation framework found. |
| 11 — Production readiness | Partial / not verified | Some security and deployment foundations exist. Worker reliability, backups/recovery, observability, rate limits, load/security testing and production release gates remain outstanding. |

## Verified repository facts

- Backend dependencies currently include FastAPI, Uvicorn, SQLAlchemy, psycopg, Pydantic Settings, PyJWT, HTTPX, Alembic, email-validator and pytest.
- Backend package requirements do not yet include LangGraph, LangChain, pgvector integration or an LLM provider SDK.
- The backend currently has one tenant-core Alembic migration.
- The current database models cover users, organizations, organization memberships, invitations, projects, project memberships, audit events, teams and team members.
- The current backend API is documented as the identity and tenant core.
- The current backend CI workflow compiles modules, runs pytest and checks frontend JavaScript syntax. It has been updated to run on pushes to main as well as the foundation branch, and to run a Python dependency audit. The new workflow run is not yet verified.
- No claim is made here that Clerk, Neon, SMTP, Render, LLM or Microsoft Fabric is live and correctly configured; those require external environment verification.

## Execution order and gates

1. **Phase 0:** Verify development foundation, CI, live Clerk/Neon/API configuration, LLM access and pgvector. Do not proceed to AI feature implementation until required development services are available.
2. **Phase 1:** Complete the AI-first project workspace using real API contracts and honest empty/loading/error states.
3. **Phase 2:** Run end-to-end authentication, invitation, RBAC and cross-tenant tests in staging.
4. **Phase 3:** Design and migrate the operational/AI database schema; verify project-scoped knowledge access.
5. **Phase 4:** Implement and test the LLM adapter and first versioned agent.
6. **Phase 5:** Implement LangGraph orchestration, durable checkpoints and human approval.
7. **Phase 5A:** Prove cloud API/worker execution and resume after restart.
8. **Phase 6:** Deliver the first planning/architecture workforce vertical slice.
9. **Phases 7–10:** Add Fabric tools, engineering, QA/BI/DevOps and knowledge learning in roadmap order.
10. **Phase 11:** Complete production hardening and release readiness.

## Product-owner dependencies (to collect when reached)

- Access to the actual Clerk staging instance and its configuration.
- Access to Neon project settings and a non-production database connection.
- Access to Render service settings/logs and permission to configure environment secrets.
- SMTP provider and verified sender details for invitation delivery.
- Confirmation of the existing hosted LLM provider, API endpoint, model identifier and non-production API credentials.
- Microsoft Entra/Fabric development tenant, workspace and least-privilege test permissions before Fabric integration.
- Approval before introducing any paid hosting, model usage or Fabric capacity costs.

Never commit credentials to this file or the repository.

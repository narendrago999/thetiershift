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
| 0 — Cloud accounts and development foundation | Partial | Owner confirms Neon, Clerk and Render provisioning/setup are already complete. FastAPI, SQLAlchemy, Alembic, Clerk JWT verification, Neon configuration, health endpoint and CI exist. Still required: verify deployed API-to-Neon connectivity, Clerk token flow and Render health; verify CI run; implement/verify pgvector; configure and test the LLM adapter when real endpoint/key are supplied. Placeholder LLM values may be used in development configuration only. |
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
- Backend package requirements include pgvector client support; LangGraph, LangChain and an LLM provider SDK are not yet included. A new Alembic migration enables the PostgreSQL vector extension without dropping it on downgrade.
- The backend currently has one tenant-core Alembic migration.
- The current database models cover users, organizations, organization memberships, invitations, projects, project memberships, audit events, teams and team members.
- The current backend API is documented as the identity and tenant core.
- The current backend CI workflow compiles modules, runs pytest, audits Python dependencies and checks frontend JavaScript syntax. Its first run compiled successfully and passed all existing tests, but dependency auditing failed on the vulnerable pytest 8.4.2 constraint. The requirement was raised to pytest 9.0.3 or newer; CI reruns for the fix and pgvector addition are queued/in progress.
- Product-owner confirmation (2026-11-14): Neon, Clerk and Render setup/provisioning are already complete. This is recorded as owner-confirmed, not independently live-verified by this repository review.
- SMTP is intentionally deferred. Use clearly marked placeholders in examples/development configuration; do not insert fake credentials into Render or claim email delivery works. Invitation email delivery remains unverified until a real SMTP provider and sender are supplied.
- The LLM endpoint and API key will be supplied later. Use clearly marked non-secret placeholders for now; do not send requests using dummy credentials or claim provider connectivity. The adapter/configuration can be prepared, with live connectivity testing deferred.

## Execution order and gates

1. **Phase 0:** Verify the already-provisioned Neon, Clerk and Render integrations, development foundation and CI; implement pgvector and prepare LLM configuration/adapter with placeholders. Defer live LLM connectivity until the real endpoint/key are supplied. SMTP is not a Phase 0 blocker; defer invitation-delivery verification until real SMTP details are supplied.
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

- Access to the already-provisioned Clerk, Neon and Render environments may be needed for live verification or changes; no new provisioning is assumed.
- SMTP provider and verified sender details for invitation delivery (deferred; not a blocker for current foundation work).
- Existing hosted LLM provider, API endpoint, model identifier and non-production API credentials (deferred until the LLM adapter is ready for live testing).
- Microsoft Entra/Fabric development tenant, workspace and least-privilege test permissions before Fabric integration.
- Approval before introducing any paid hosting, model usage or Fabric capacity costs.

Never commit credentials to this file or the repository.

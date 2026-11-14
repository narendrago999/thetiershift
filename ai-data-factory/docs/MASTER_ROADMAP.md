# TierShift AI Data Factory — Master Development Roadmap

## Product deployment principle

**Browser-only for end users; cloud-hosted execution for the application.** Customers use the product through a browser and never install Python or run a local service. The frontend remains on GitHub Pages; FastAPI runs on a cloud application runtime; long-running LangGraph jobs run in a cloud worker/job runtime; Neon stores durable state; Clerk handles identity. GitHub Actions provides CI/CD, not a permanent API server. GitHub Codespaces is the preferred optional browser-based development environment; local Python setup is optional.

The backend hosting provider will be selected only after its free-tier quotas, sleep/cold-start behavior, background-worker support, job duration, networking, SSE/WebSocket support, secrets, logs, and post-quota pricing have been verified.

## Delivery principle

Build a vertical slice that works end to end before expanding the workforce. Each phase has measurable acceptance criteria. A phase is not complete merely because code has been written; its tests and evidence must pass.

## Phase 0 — Cloud accounts, repository, and development foundation

**Scope**
- Create Neon project and PostgreSQL database.
- Create Clerk application for authentication.
- Confirm the hosted LLM API contract, model identifier, structured-output support, and tool-calling capabilities.
- Prepare GitHub Codespaces as the preferred browser-based Python development path; keep local setup optional.
- Configure FastAPI skeleton and health endpoint.
- Add .env.example, secret-handling guidance, and Git ignore rules.
- Add GitHub Actions checks for linting, tests, and dependency/security checks.
- Verify Neon SSL connectivity from Python.
- Enable and verify pgvector.
- Add SQLAlchemy and Alembic.

**Acceptance**
- A contributor can start the backend in Codespaces without installing Python on their own machine.
- Backend health endpoint responds.
- CI checks run on pull requests.
- Backend connects to Neon using SSL.
- pgvector extension is available.
- LLM connectivity test passes without exposing secrets.
- No credentials are committed to Git.

## Phase 1 — Product shell and command-centre UI

**Scope**
- Build independent frontend under `ai-data-factory/frontend`.
- Establish design tokens, responsive layout, navigation, empty states, loading/error states.
- Build dashboard, projects, AI workforce, workflows, live operations, knowledge, connections, Fabric resources, approvals, activity logs, and settings screens.
- Define API contracts before connecting screens.
- Use clearly labelled fixtures only where backend endpoints do not yet exist.

**Acceptance**
- UI works locally on desktop and mobile widths.
- Navigation and core interactions work.
- No mock status is presented as live execution.
- Existing TierShift public website remains unchanged.

## Phase 2 — Identity, organizations, collaboration, and authorization

**Scope**
- Clerk sign-up, sign-in, email verification, password reset, and session handling.
- Verify Clerk JWTs in FastAPI.
- Synchronize identity records into PostgreSQL.
- Organizations, memberships, invitations, projects, project memberships, teams, and team memberships.
- Organization roles and project-level RBAC.
- Project invitation and acceptance workflow.
- Tenant isolation, audit events, and authorization tests.

**Initial roles**
- Organization: Owner, Admin, Member.
- Project: Owner, Project Admin, Architect, Data Engineer, BI Developer, QA Engineer, Viewer.

**Acceptance**
- A user can belong to multiple organizations and projects.
- Multiple users can collaborate on one project.
- Users cannot read or mutate another tenant's data without authorization.
- Role changes take effect on the next authorized request.
- Invitation lifecycle is tested end to end.

## Phase 3 — Operational database and AI Brain

**Scope**
- Create versioned Alembic migrations.
- Establish schemas: `core`, `agents`, `orchestration`, `knowledge`, `metadata`, `business`, `fabric`, `execution`, and `governance`.
- Store projects, requirements, source systems, source objects, KPIs, business rules, mappings, decisions, resources, and execution records.
- Configure pgvector and document chunking/embedding metadata.
- Define project-scoped retrieval and tenant filters.
- Separate workflow checkpoints from business/audit history.

**Acceptance**
- Migrations can create a clean database from scratch.
- Project metadata persists and can be retrieved.
- Similarity search is filtered by authorization scope.
- Database backup/export and recovery procedure is documented within free-tier constraints.

## Phase 4 — LLM adapter and dynamic Agent Registry

**Scope**
- Implement provider-independent LLM interface for the existing hosted model.
- Store agent definitions, versions, prompts, input/output schemas, model settings, tool permissions, and limits in PostgreSQL.
- Load agents dynamically from the registry.
- Add structured output validation, timeouts, retries, token/usage logging, and prompt versioning.
- Keep trusted tool code in the application; database records configure tools but never execute arbitrary code.

**Acceptance**
- An agent can be loaded by ID and version.
- It can receive validated input and return schema-valid output.
- Tool access is restricted to its allowlist.
- Execution and model usage are logged.

## Phase 5 — LangGraph orchestration and human-in-the-loop

**Scope**
- Master orchestrator and typed workflow state.
- Task routing, dependency management, bounded retries, cancellation, and resumability.
- PostgreSQL-backed checkpoints.
- Human approval and clarification interrupts.
- Project-scoped execution threads.
- Concurrency controls, task leases, idempotency keys, and conflict detection.
- Real-time event stream to the UI.

**Acceptance**
- Multi-agent workflow completes a test scenario.
- Workflow resumes after a human response without restarting from the beginning.
- Duplicate requests do not duplicate side effects.
- Concurrent users see consistent task and approval state.

## Phase 5A — Cloud runtime, staging, and CI/CD

**Scope**
- Evaluate hosting candidates using docs/DEPLOYMENT_PLAN.md; do not choose based only on a free-tier headline.
- Deploy a non-production FastAPI staging service with HTTPS, health checks, CORS allowlist, and secure environment secrets.
- Prove a separate worker/job runtime can run and resume LangGraph tasks using persistent PostgreSQL checkpoints.
- Configure GitHub Actions to test, build, deploy to staging, and run smoke tests.
- Separate development, staging, and production credentials and Fabric workspaces.

**Acceptance**
- A user can access staging from a browser without installing Python.
- No private key or database credential is exposed to frontend assets or browser responses.
- A worker can resume a test job after restart.
- Hosting limits, sleep/restart behavior, job duration, and estimated cost are documented.
- If a free plan cannot safely support a capability, limit the MVP or defer that capability rather than using an unreliable workaround.

## Phase 6 — Planning, source discovery, and architecture workforce

**Scope**
- Planning Agent captures client requirements.
- Source Discovery Agent profiles schemas and metadata.
- Knowledge retrieval finds relevant approved patterns.
- Architect Agent generates architecture, medallion layout, logical/physical models, mappings, lineage plan, security design, and delivery tasks.
- Reviewable diagrams and documents.
- Human approval and change-request loop.

**Acceptance**
- A sample client brief produces a structured requirements specification and architecture package.
- All assumptions and unanswered questions are explicit.
- Approval and revisions are versioned.

## Phase 7 — Microsoft Fabric integration and controlled tools

**Scope**
- Microsoft Entra authentication and API-specific permission checks.
- Typed Fabric API client and tool registry.
- Workspace, connection, lakehouse, warehouse, pipeline, notebook, job, and monitoring operations where supported by the relevant API.
- Resource inventory synchronization.
- API version tracking, retries, rate limits, and error normalization.
- Secret references and credential-safe logging.
- Separate development/test/production policies.

**Acceptance**
- Read-only discovery works in an authorized test workspace.
- Approved development resource provisioning works.
- Actual Fabric resource IDs and states appear in the UI.
- Destructive and production operations are blocked without explicit approval.

## Phase 8 — Data Engineering workforce

**Scope**
- Ingestion Agent and connector-specific adapters.
- Metadata-driven pipeline configuration.
- Full and incremental ingestion, watermark management, schema drift handling.
- Transformation Agent for validated PySpark and SQL generation.
- Data Modelling Agent for facts, dimensions, keys, and SCD Type 1/2.
- Bronze/Silver/Gold conventions and reusable templates.
- Execution monitoring and recovery.

**Initial connector order**
1. SQL Server.
2. SFTP/Azure Blob.
3. REST APIs.
4. Salesforce.
5. SAP BW, subject to supported connectivity and tenant access.

**Acceptance**
- One approved source is ingested into Bronze.
- Silver and Gold transformations execute.
- SCD2 history is tested against known test cases.
- Re-running a completed load does not create unintended duplicates.

## Phase 9 — QA, BI, and DevOps workforce

**Scope**
- QA Agent: row counts, duplicates, nulls, schema, aggregates, referential integrity, SCD2, and business-rule checks.
- Reconciliation reports and exception workflows.
- BI Agent: semantic model, relationships, measures, and supported Power BI/Fabric operations.
- DevOps Agent: deployment plans, environment configuration, versioning, monitoring, and rollback proposals.
- Human release approvals.

**Acceptance**
- Test datasets pass expected validations.
- Failed checks produce actionable exceptions.
- BI assets are verified through supported APIs and actual tenant permissions.
- Deployment actions are auditable and reversible where supported.

## Phase 10 — Knowledge learning and reusable engineering intelligence

**Scope**
- Capture approved architecture, mappings, templates, execution outcomes, fixes, and lessons.
- Semantic and metadata-based retrieval.
- Similar-project recommendations with compatibility checks.
- Agent evaluation datasets and scorecards.
- Human-reviewed prompt/template version promotion.
- Provenance links from reusable knowledge to its source project and approval.

**Acceptance**
- A second project can retrieve relevant approved patterns from the first.
- Retrieved knowledge respects tenant and project access policies.
- Unverified suggestions are not treated as approved engineering standards.

## Phase 11 — Production readiness and scale

**Scope**
- Background worker deployment and job processing.
- Production-grade API and worker deployment with explicit service ownership.
- Re-evaluate free-tier suitability; upgrade only when reliability, security, capacity, or usage requires it.
- Secure frontend-to-backend deployment and CORS configuration.
- Monitoring, backups, rate limits, secrets management, disaster recovery, and cost controls.
- Multi-tenant security review and load testing.
- Documentation and operational runbooks.

**Acceptance**
- Security and tenant-isolation tests pass.
- Recovery and rollback procedures are exercised.
- Production deployment has explicit cost and operational ownership.

## First end-to-end MVP scenario

A user creates a project and supplies a client brief containing SQL Server or another supported source, target Fabric workspace, Bronze/Silver/Gold requirements, SCD2 rules, and business KPIs.

The system:
1. Captures and validates requirements.
2. Retrieves authorized reusable knowledge.
3. Generates an architecture and mapping package.
4. Obtains human approval.
5. Discovers the authorized Fabric environment.
6. Provisions approved development resources.
7. Generates and runs ingestion and transformation assets.
8. Performs reconciliation and QA.
9. Produces documentation and a delivery summary.
10. Saves approved learnings for future projects.

## Cost policy

Use free tiers and local execution during development. Monitor Neon storage/compute quotas, Clerk plan limits, LLM usage, and Fabric capacity. Do not assume that model inference or Fabric capacity is free. No paid hosting is required to begin local development.

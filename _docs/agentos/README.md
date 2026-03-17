# AgentOS Computer Workspace (Design + Pixel-Agent Mapping)

This folder captures an **AgentOS Computer Workspace** design (personal cloud workspace + agent kernel + tool ecosystem), written to map directly onto the existing **Pixel-Agent** architecture.

## What already exists in Pixel-Agent (strong alignment)

Pixel-Agent already implements several “Agent Kernel” pillars:

- **Multi-tenancy root**: `companies` (tenant) with budget + circuit breaker (`lib/db/src/schema/companies.ts`).
- **Governance + approvals**: `governance_requests` and `GovernanceService` with post-approval actions (including swarm approval triggering swarm run).
- **Durable-ish orchestration scaffold**: `SwarmEngine` has a defined 6-phase lifecycle, phase assertions, and async/background execution.
- **Memory store**: `memory_entries` used to archive synthesized swarm output.
- **Tool-call tracing**: `tool_calls` table includes `traceId/spanId/parentSpanId`, token counts, model, cost.
- **Real-time UX**: SSE events are already a first-class primitive (see `_docs/validation-contracts-ui-integration.md`).

## What is *not* implemented yet (AgentOS “workspace computer” gaps)

To reach the “personal cloud computer per user/workspace” model, Pixel-Agent needs new primitives:

- **Workspace runtime**: a first-class “workspace” entity (per user or per company) with an isolated runtime (container/VM), filesystem, and long-lived processes.
- **Tool runtime sandbox**: process/container sandboxing for high-risk tools (see `_docs/contracts/val-tool-swarm.md`).
- **MCP tool registry**: a registry of MCP servers/connectors per workspace, with scoped credentials and policy.
- **Snapshot/rollback**: workspace snapshots (filesystem + state) to support safe experimentation and rollback.
- **Durable workflows**: a workflow engine for long-running jobs with pause/resume for approvals (Temporal-like semantics).

## Docs in this folder

- `architecture.md`: proposed system architecture, data flows, and responsibility boundaries.
- `mvp-scope.md`: an MVP that fits Pixel-Agent’s current shape (API-server first).
- `data-model.md`: proposed minimal DB model additions for `workspaces`, `tool_registry`, `snapshots`, and `workflow_runs`.


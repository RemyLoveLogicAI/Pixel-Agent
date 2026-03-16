# OpenAPI Endpoints Catalog

All routes are mounted under the `/api` prefix.

---

## Health

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/healthz` | Health check | None | `{ status: "ok" }` | 200 | No auth required |

---

## Companies

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies` | List all companies | None | `Company[]` | 200 | Needs auth |
| POST | `/api/companies` | Create a company | `{ name, mission, status?, budgetMonthlyUsd?, budgetUsedUsd?, circuitBreaker?, settings? }` | `Company` | 201, 400 | Needs auth |
| GET | `/api/companies/:companyId` | Get a single company | None | `Company` | 200, 404 | Needs auth |
| PATCH | `/api/companies/:companyId` | Update a company | Partial `Company` fields | `Company` | 200, 404 | Needs auth |
| DELETE | `/api/companies/:companyId` | Delete a company | None | (empty) | 204, 404 | Needs auth |

---

## Agents

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/agents` | List agents for a company | None | `Agent[]` | 200 | Needs auth |
| POST | `/api/companies/:companyId/agents` | Create an agent | `{ name, role, level, title, managerId?, model?, systemPrompt?, tools?, budgetMonthlyUsd?, status?, deskX?, deskY?, spriteKey?, ... }` | `Agent` | 201, 400 | Needs auth |
| GET | `/api/companies/:companyId/agents/org-chart` | Get hierarchical org chart tree | None | `OrgNode[]` (recursive `{ agent, children }`) | 200 | Needs auth |
| GET | `/api/companies/:companyId/agents/:agentId` | Get a single agent | None | `Agent` | 200, 404 | Needs auth |
| PATCH | `/api/companies/:companyId/agents/:agentId` | Update an agent | Partial `Agent` fields | `Agent` | 200, 404 | Needs auth |
| DELETE | `/api/companies/:companyId/agents/:agentId` | Delete an agent | None | (empty) | 204, 404 | Needs auth |

### Agent - Capability Tokens

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/agents/:agentId/capability-tokens` | List active (non-revoked) tokens | None | `CapabilityToken[]` | 200, 404 | Needs auth |
| POST | `/api/companies/:companyId/agents/:agentId/capability-tokens` | Issue a new capability token | `{ scopes: string[], maxSingleSpendUsd?, expiresInSeconds?, issuedBy? }` | `CapabilityToken` | 201, 400, 404 | Needs auth. Revokes existing active tokens (single-active-token policy). |
| DELETE | `/api/companies/:companyId/agents/:agentId/capability-tokens/:tokenId` | Revoke a capability token | None | (empty) | 204, 404 | Needs auth |

### Agent - Delegation

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| POST | `/api/companies/:companyId/agents/:agentId/validate-delegation` | Dry-run delegation validation | `{ toAgentId, scopes: string[] }` | `{ valid: boolean, reason?: string }` | 200, 400, 404 | Needs auth |
| POST | `/api/companies/:companyId/agents/:agentId/delegate` | Delegate scopes to a direct report | `{ toAgentId, scopes: string[], maxSingleSpendUsd?, ttlSeconds? }` | `CapabilityToken` | 201, 400, 404 | Needs auth. Validates hierarchy rules (direct report, level, scope subset). |

### Agent - Hierarchy

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/agents/:agentId/reporting-chain` | Get upward reporting chain to root | None | `Agent[]` | 200, 404 | Needs auth |
| GET | `/api/companies/:companyId/agents/:agentId/direct-reports` | Get direct reports | None | `Agent[]` | 200, 404 | Needs auth |

---

## Goals

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/goals` | List goals for a company | None | `Goal[]` | 200 | Needs auth |
| POST | `/api/companies/:companyId/goals` | Create a goal | `{ title, description?, parentId?, assignedAgentId?, priority?, status?, ... }` | `Goal` | 201, 400 | Needs auth |
| GET | `/api/companies/:companyId/goals/tree` | Get hierarchical goal tree | None | `GoalNode[]` (recursive `{ goal, children }`) | 200 | Needs auth |
| GET | `/api/companies/:companyId/goals/:goalId` | Get a single goal | None | `Goal` | 200, 404 | Needs auth |
| PATCH | `/api/companies/:companyId/goals/:goalId` | Update a goal | Partial `Goal` fields | `Goal` | 200, 404 | Needs auth. Auto-sets `completedAt` when status changes to "completed". |

---

## Tasks

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/tasks` | List tasks | None | `AgentTask[]` | 200 | Needs auth. Supports `?status=` and `?agentId=` query filters. |
| POST | `/api/companies/:companyId/tasks` | Create a task | `{ title, description?, goalId?, priority?, ... }` | `AgentTask` | 201, 400 | Needs auth. Initializes `version: 0`. |
| PATCH | `/api/companies/:companyId/tasks/:taskId` | Update a task | Partial `AgentTask` fields | `AgentTask` | 200, 404 | Needs auth. Auto-increments `version`. |
| POST | `/api/companies/:companyId/tasks/:taskId/claim` | Claim a task (optimistic lock) | `{ agentId, version }` | `AgentTask` | 200, 400, 404, 409 | Needs auth. Returns 409 on version conflict or already-claimed task. |

---

## Swarms

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/swarms` | List swarm runs | None | `SwarmRun[]` | 200 | Needs auth |
| POST | `/api/companies/:companyId/swarms` | Create a swarm run | `{ goalId?, leaderAgentId?, taskDescription?, specialistRoles?, maxAgents?, ... }` | `SwarmRun` | **202**, 400 | Needs auth. **Async**: returns 202 Accepted. Phase starts as "proposed". |
| GET | `/api/companies/:companyId/swarms/:swarmId` | Get swarm with its agents | None | `SwarmRun & { agents: SwarmAgent[] }` | 200, 404 | Needs auth |
| POST | `/api/companies/:companyId/swarms/:swarmId/cancel` | Cancel a swarm run | None | `SwarmRun` | 200, 404, 409 | Needs auth. Returns 409 if already in terminal phase (completed/failed/dissolved/cancelled). |
| GET | `/api/companies/:companyId/swarms/:swarmId/messages` | Get inter-agent messages | None | `SwarmMessage[]` | 200, 404 | Needs auth |

---

## Governance

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/governance` | List governance requests | None | `GovernanceRequest[]` | 200 | Needs auth. Supports `?status=` query filter. |
| POST | `/api/companies/:companyId/governance` | Create a governance request | `{ requestType, description, requestingAgentId?, metadata?, estimatedCostUsd?, ttlSeconds? }` | `GovernanceRequest` | 201, 400 | Needs auth. `requestType` is one of: hire, fire, budget_override, swarm_approval, escalation, tool_access, strategy_change. Auto-computes `expiresAt` from `ttlSeconds`. |
| POST | `/api/companies/:companyId/governance/:requestId/approve` | Approve a governance request | `{ decidedBy?, note? }` | `GovernanceRequest` | 200, 404, 409 | Needs auth. Returns 409 if request is not pending. |
| POST | `/api/companies/:companyId/governance/:requestId/reject` | Reject a governance request | `{ decidedBy?, note? }` | `GovernanceRequest` | 200, 404, 409 | Needs auth. Returns 409 if request is not pending. |

---

## Budget

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/budget` | Get budget summary | None | `{ companyId, budgetMonthlyUsd, budgetUsedUsd, utilizationPct, circuitBreaker, agents: [{ agentId, name, budgetMonthlyUsd, budgetUsedUsd, utilizationPct }] }` | 200, 404 | Needs auth |
| GET | `/api/companies/:companyId/budget/alerts` | List budget alerts | None | `BudgetAlert[]` | 200 | Needs auth |
| PATCH | `/api/companies/:companyId/budget/agents/:agentId` | Update agent budget | `{ budgetMonthlyUsd?, budgetUsedUsd? }` | `Agent` | 200, 404 | Needs auth |

---

## Tools

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/tools` | List all tools in the registry | None | `{ name, description, category }[]` | 200 | No tenant scope. Needs auth. Returns static tool registry (15 tools across research, engineering, data, communication, creative, memory, management categories). |
| POST | `/api/companies/:companyId/agents/:agentId/tools` | Assign a tool to an agent | `{ toolName }` | `Agent` | 200, 400, 404 | Needs auth. Idempotent: returns agent unchanged if tool already assigned. |
| DELETE | `/api/companies/:companyId/agents/:agentId/tools` | Remove a tool from an agent | `{ toolName }` | `Agent` | 200, 400, 404 | Needs auth |

---

## Memory

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/agents/:agentId/memory` | List memory entries for an agent | None | `MemoryEntry[]` | 200, 404 | Needs auth. Supports `?category=` query filter. |
| POST | `/api/companies/:companyId/agents/:agentId/memory` | Create a memory entry | `{ key, value, category?, importance?, ... }` | `MemoryEntry` | 201, 400, 404 | Needs auth |

---

## Traces

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/traces` | List tool call traces | None | `ToolCall[]` | 200 | Needs auth. Supports `?limit=` (max 200, default 50) and `?agentId=` query filters. |
| GET | `/api/companies/:companyId/traces/:traceId` | Get all spans for a trace | None | `ToolCall[]` | 200 | Needs auth. Returns spans ordered by creation time (OpenTelemetry-style with traceId/spanId/parentSpanId). |

---

## Heartbeat

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| POST | `/api/companies/:companyId/heartbeat` | Trigger a heartbeat run | `{ trigger?: "scheduled" \| "manual" \| "event" }` | `{ runId, status, agentsTotal, agentsSucceeded, agentsFailed, totalCostUsd }` | **202** | Needs auth. **Async**: returns 202 Accepted. Processes all due agents with bounded concurrency. Can return `status: "blocked"` if company circuit breaker is open or budget is exhausted. |
| GET | `/api/companies/:companyId/heartbeat/runs` | List heartbeat runs | None | `HeartbeatRun[]` | 200 | Needs auth. Supports `?limit=` (max 100, default 20). |
| GET | `/api/companies/:companyId/heartbeat/runs/:runId` | Get a heartbeat run with agent results | None | `HeartbeatRun & { agentRuns: HeartbeatAgentRun[] }` | 200, 404 | Needs auth |

### Heartbeat - Dead-Letter Queue

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/heartbeat/dead-letters` | List unresolved dead-letter entries | None | `HeartbeatDeadLetter[]` | 200 | Needs auth. Supports `?limit=` (max 200, default 50). Only returns unresolved entries. |
| POST | `/api/companies/:companyId/heartbeat/dead-letters/:entryId/resolve` | Manually resolve a dead-letter entry | None | `HeartbeatDeadLetter` | 200, 404 | Needs auth |
| POST | `/api/companies/:companyId/heartbeat/dead-letters/:entryId/retry` | Retry a failed dead-letter entry | None | `{ resolved: boolean, error?: string }` | 200, 404, 409 | Needs auth. Returns 409 if entry already resolved. Re-runs the agent with timeout and circuit breaker. |

### Heartbeat - Scheduler (Global, no tenant scope)

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/heartbeat/scheduler` | Get scheduler status | None | `{ running, intervalMs, lastTick?, ... }` | 200 | Needs auth (admin-only). No tenant scope. |
| POST | `/api/heartbeat/scheduler/start` | Start the global scheduler | None | `{ running, intervalMs, ... }` | 200 | Needs auth (admin-only). No tenant scope. |
| POST | `/api/heartbeat/scheduler/stop` | Stop the global scheduler | None | `{ running, intervalMs, ... }` | 200 | Needs auth (admin-only). No tenant scope. |
| POST | `/api/heartbeat/scheduler/tick` | Force an immediate scheduler tick | None | `{ triggered: true, running, ... }` | 200 | Needs auth (admin-only). No tenant scope. Processes all active companies. |

---

## Events (SSE)

| Method | Path | Description | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|-------------|----------|-------------|-------|
| GET | `/api/companies/:companyId/events` | Subscribe to real-time events | None | `text/event-stream` (SSE) | 200 | Needs auth. **SSE stream**. Sends `event: connected` on open. Pings every 30s. Use `broadcastEvent(companyId, {type, data})` server-side to publish events. Connection-scoped (closes on client disconnect). |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total endpoints | 44 |
| GET endpoints | 24 |
| POST endpoints | 16 |
| PATCH endpoints | 4 |
| DELETE endpoints | 3 (note: 1 DELETE on tools uses request body) |
| Async (202) endpoints | 2 (POST heartbeat, POST swarms) |
| SSE endpoints | 1 (GET events) |
| No-tenant-scope endpoints | 5 (healthz, GET /tools, 4x scheduler routes) |
| Endpoints needing auth | 43 (all except healthz) |

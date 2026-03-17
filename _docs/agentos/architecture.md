# AgentOS Computer Workspace — Architecture (mapped to Pixel-Agent)

## Goal

Deliver a “personal cloud workspace” where **user intents** are handled by an **Agent Kernel** that plans, gates (governance/budget), and executes multi-agent work with auditable tool calls—while the **workspace runtime** provides persistent compute + filesystem.

## Mapping the AgentOS layers to Pixel-Agent

### Control Plane (tenant + policy)

- **Tenant root**: `companies` table already exists and is a good control-plane anchor.
- **Policy & approvals**: `governance_requests` + `GovernanceService` already implement “human-in-loop gating” and post-approval actions.
- **Budgets**: company and agent budgets exist (company in `companies`, agent in `agents`), plus `budget_alerts`.

### Agent Gateway + Kernel

In Pixel-Agent terms:

- **Intent ingress**: API routes (Express) accept “start work” requests (e.g., create swarm, enqueue tasks).
- **Kernel**: `SwarmEngine` + `HeartbeatRunner` + `GovernanceService` together form the current “kernel surface area”.

Key observation: Pixel-Agent already has the right *control* semantics; what’s missing is the **workspace runtime substrate**.

### Orchestration / lifecycle engine

- Today: `SwarmEngine.runSwarm()` runs phases in-process and records phase state in `swarm_runs`.
- Needed for AgentOS: a durable workflow abstraction that can pause/resume across deploys and persist step-by-step state (especially around approvals and long-running tools).

Recommended approach for this repo’s trajectory:

- **Short-term (MVP)**: keep `SwarmEngine` but route each phase through a persisted “workflow step” record (so you can resume).
- **Later**: plug in Temporal (or a similar engine) and map `swarm_runs` to workflow instances.

### Runtime environments (the “workspace computer”)

AgentOS requires an isolated compute + filesystem boundary per workspace. Pixel-Agent currently has “company” and “agents”, but not a first-class runtime.

Proposed responsibility boundary:

- **Workspace Runtime** (new): isolated execution environment with
  - filesystem root (mounted volume),
  - sandbox tool runner (process or container based),
  - optional long-lived services (e.g., local vector DB, web apps).

### Tool layer (MCP + native tools)

Pixel-Agent already has `tool_calls` as an audit/trace substrate. AgentOS needs:

- **Tool registry**: what tools exist, their input schema, risk class, and required scopes.
- **Tool execution**: sandboxing rules (see `_docs/contracts/val-tool-swarm.md`).
- **MCP connectors**: per-workspace managed connectors (OAuth secrets, health checks, allowlists).

### Memory layer

Pixel-Agent’s `memory_entries` currently behaves like a key-value store.

AgentOS “Memory Graph” can evolve incrementally:

- **MVP**: continue with `memory_entries` + embeddings stored in metadata, with a simple retrieval API.
- **Next**: add a graph model (nodes/edges) or integrate a graph/vector store, but keep `memory_entries` as the canonical journal for “what the agent learned”.

## Data flows (updated for Pixel-Agent)

```mermaid
flowchart TD
  U[User prompt via UI/CLI] --> API[Express API / Agent Gateway]
  API --> GOV{GovernanceService: allowed?}
  GOV -- no --> APR[governance_requests: pending approval]
  GOV -- yes --> ORCH[Orchestrator: SwarmEngine / HeartbeatRunner]
  ORCH --> A[Agent instances (roles)]
  A --> TOOLS[Tool Runner + MCP Clients]
  TOOLS --> FS[(Workspace filesystem)]
  TOOLS --> EXT[(External APIs)]
  TOOLS --> TC[(tool_calls + traces)]
  ORCH --> MEM[(memory_entries)]
  ORCH --> SSE[SSE events stream]
```

## Security model (repo-aligned)

Pixel-Agent already models:

- **Capability scopes** via capability tokens + governance validation.
- **Traceability** via `tool_calls` with trace/span IDs.

AgentOS requires hardening in these areas:

- **Egress controls**: default-deny outbound network from sandboxed tools (allowlist when explicitly enabled).
- **Sandbox**: run high-risk tools in containerized or restricted-process sandboxes (no host env leakage).
- **Approval gates**: extend governance gating beyond swarms to include tool access and irreversible filesystem operations.
- **Snapshots**: create restore points prior to high-risk operations (deploying services, bulk file reorg, destructive edits).


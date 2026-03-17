# AgentOS Computer Workspace — MVP Scope (fits Pixel-Agent)

## MVP outcome (what “done” looks like)

In a single company (tenant), a user can:

- Provision a **workspace runtime** (container-backed directory + sandbox runner).
- Run **skills** that:
  - read/write workspace files,
  - call MCP-backed connectors (at least one),
  - emit tool-call traces and SSE events,
  - request governance approvals for risky operations.
- Roll back to a **snapshot** created before a risky operation.

## MVP constraints (optimize for shipping)

- Keep the existing “company” multi-tenant model as the control-plane root.
- Do not require Temporal in MVP; introduce a resumable “workflow step journal” so Temporal is a later swap.
- Start with 3–5 skills only, aligned with existing Pixel-Agent primitives.

## MVP components (by repo area)

### 1) Workspace Runtime (new)

Add a minimal “workspace” abstraction that points at a filesystem root and a tool sandbox runner.

- **Filesystem**: a directory/volume per workspace (local dev: under repo-runner config; prod: persistent volume).
- **Sandbox runner**:
  - low-risk tools: restricted child process,
  - high-risk tools: container sandbox (network off by default).

### 2) Tool Registry + Execution (extend existing)

Build on `tool_calls`:

- Add an in-process tool registry (name, schema, risk class, required scopes).
- On every tool execution:
  - validate schema,
  - check agent scopes / governance,
  - execute in sandbox,
  - write `tool_calls` (with trace/span),
  - broadcast SSE event.

### 3) Governance gates (extend existing)

Leverage `GovernanceService`:

- Add a request type for `tool_access` (already present as a union type).
- Add “filesystem destructive” gates (delete/move/overwrite) routed through governance.

### 4) Snapshots (new)

Implement snapshots as “workspace restore points”:

- create snapshot (tar/zip + metadata record),
- list snapshots,
- restore snapshot (guarded by governance if restoring overwrites current state).

### 5) Starter skills (MVP set)

Pick skills that exercise the whole stack:

- **DocSummarizer**: reads files, writes summary to workspace, logs tool calls.
- **ResearchSynthesizer**: calls one MCP connector (web search fetcher), writes cited report, guarded for injection risk.
- **FileOrganizer (safe mode)**: proposes changes first; apply requires approval + snapshot.
- **DeployMicroApp (gated)**: builds/serves a small app *inside the workspace runtime*; opening public ports requires approval.

## MVP acceptance checks (high-signal)

- **Auditability**: every tool invocation creates a `tool_calls` row (success/fail/timeout).
- **Guardrails**: attempting a high-risk operation triggers `governance_requests` and pauses execution.
- **Sandboxing**: sandboxed commands cannot read host secrets or escape workspace root.
- **Undo**: snapshot restore returns filesystem to the pre-run state.
- **UX**: SSE events update the UI (or a simple log stream) during runs.


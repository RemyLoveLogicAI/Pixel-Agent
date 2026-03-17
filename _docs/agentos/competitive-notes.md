# Competitive Notes — Zo-style “Personal AI Cloud Computer”

This is a **checklist** that translates “Zo Computer–like” expectations into build targets for Pixel-Agent’s AgentOS direction.

## Feature checklist (Now vs MVP vs Later)

Legend: **Now** = exists today in Pixel-Agent; **MVP** = planned in `mvp-scope.md`; **Later** = post-MVP.

| Capability | Pixel-Agent Now | AgentOS MVP | Later |
|---|---:|---:|---:|
| Persistent tenant root (budget + circuit breaker) | ✅ (`companies`) | ✅ | ✅ |
| Human-in-loop approvals | ✅ (`governance_requests`) | ✅ (expanded) | ✅ |
| Multi-agent orchestration lifecycle | ✅ (`SwarmEngine`) | ✅ | ✅ (durable engine) |
| Tool-call tracing (cost/tokens/trace IDs) | ✅ (`tool_calls`) | ✅ | ✅ |
| SSE real-time events | ✅ | ✅ | ✅ |
| **Workspace runtime** (persistent compute + filesystem boundary) | ❌ | ✅ | ✅ (VM/microVM tier) |
| **Tool sandbox execution** (proc/container; net off by default) | Partial (spec exists) | ✅ | ✅ |
| **Snapshots / rollback** | ❌ | ✅ | ✅ (incremental) |
| MCP connector registry (workspace-scoped) | ❌ | ✅ (minimal) | ✅ (marketplace) |
| Skill packages + versioning/signing | ❌ | optional | ✅ |
| Durable workflow engine (pause/resume across deploys) | ❌ | “workflow journal” | ✅ (Temporal-like) |
| External “expose MCP endpoint” for workspace | ❌ | optional | ✅ |

## Differentiation angles (where Pixel-Agent can outperform)

- **Governance-first**: approvals/scopes/budgets/audit are not add-ons; they’re first-class tables and services.
- **Observability-first**: `tool_calls` already matches distributed tracing semantics; extend it to cover workspace + workflows.
- **Enterprise-grade safety**: sandbox + egress controls + snapshot-before-risky-write can be the default posture.

## MVP “Zo parity” success criteria

- A user can run a skill that reads workspace files + calls a connector + writes output.
- Any risky side-effect pauses into a governance request and resumes cleanly after approval.
- Every tool call is audited with trace correlation and (where relevant) token/cost attribution.
- A snapshot taken before the run can be restored to undo changes.


# Parallel SAR (Swarm Agent Run) — Full Sprint Specification

## 1. Overview

**Project:** Pixel-Agent Platform — Parallel Swarm Agent Run  
**Scope:** All sprints needed to achieve full parallel swarm execution capability  
**Approach:** Spec-first, then implement iteratively  

This specification covers the complete implementation of parallel Swarm Agent Runs (SARs) — the ability for multiple autonomous agents within a swarm to execute tasks truly in parallel, communicate via a rich message bus, leverage multiple LLM providers, and produce synthesized deliverables through iterative refinement.

---

## 2. Design Decisions (from Interview)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Parallelism model | **Full parallel** — all agents execute simultaneously | Maximize throughput; leader orchestrates |
| LLM providers | **OpenAI + Anthropic + Ollama (local)** | Multi-provider resilience + local dev support |
| Timeout strategy | **Leader-managed timeouts** | Leader agent monitors and escalates; no global hard-kill |
| Message bus | **Full pub/sub + request/reply** | Rich inter-agent communication patterns |
| Company concurrency | **Soft limit with warning** | Non-blocking; emits budget_alert, doesn't reject |
| Request/reply timeout | **3 retries, 4-second timeout** | Balanced between responsiveness and resilience |
| Orchestration scope | **Full orchestration** | Leader manages task assignment, re-assignment, and synthesis |
| Synthesis strategy | **Iterative refinement** | Agents refine each other's outputs in rounds |
| LLM routing | **Hybrid: static default + dynamic override** | Agents have a default provider/model; tasks can override |
| Synthesis output | **Both: deliverable + selective memory injection** | Produces a final artifact AND injects key learnings into agent memory |
| Governance tiers | **All three tiers** | Auto-approve (low risk), single-approve (medium), quorum (high) |
| Conflict resolution | **Majority vote among agents** | Democratic; leader breaks ties |

---

## 3. Architecture

### 3.1 Current State

The codebase has stub implementations for the core services:

- **SwarmEngine** — 6-phase lifecycle (`proposed → pending_approval → spawning → executing → synthesizing → completed/failed/dissolved/cancelled`). Currently stubs that update DB status.
- **AgentPool** — Controlled concurrency wrapper. Executes functions in parallel with a configurable concurrency limit. Returns `null` for failures.
- **AgentExecutor** — Stub. `executeAgent()` returns a mock result after a random delay. This is where LLM integration goes.
- **HeartbeatRunner** — Orchestrates per-agent scheduled execution with circuit breakers and budget checks.
- **CircuitBreaker** — 3-state pattern (closed → open → half-open). Per-agent instances.
- **GovernanceService** — Capability token management and approval workflows. Currently stubs.
- **SynthesisService** — Stub. `synthesize()` returns a placeholder summary.
- **SwarmMessageBus** — Stub. `publish()`, `subscribe()`, `request()` are no-ops.
- **SandboxService** — Stub. `createSandbox()` and `destroySandbox()` are no-ops.

### 3.2 Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                    API Layer                          │
│  POST /swarms → SwarmEngine.proposeSwarm()           │
│  POST /swarms/:id/start → SwarmEngine.startSwarm()   │
│  GET  /swarms/:id/status → live status + SSE         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  SwarmEngine                          │
│  Lifecycle orchestrator — 6-phase state machine       │
│  Manages: spawning, parallel execution, synthesis     │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
┌──────────▼──────────┐ ┌────────▼────────────────────┐
│     AgentPool        │ │     SwarmMessageBus          │
│  Concurrency control │ │  pub/sub + request/reply     │
│  Parallel execution  │ │  topic-based routing         │
└──────────┬──────────┘ └──────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│                  AgentExecutor                        │
│  LLM adapter layer — multi-provider                  │
│  OpenAI │ Anthropic │ Ollama                         │
│  Static default + dynamic override routing           │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────┐ ┌─────────────────────────────┐
│   SandboxService     │ │   SynthesisService           │
│   Isolated execution │ │   Iterative refinement       │
│   Per-agent sandbox  │ │   Majority vote conflicts    │
└─────────────────────┘ │   Deliverable + memory inject │
                        └─────────────────────────────┘
```

---

## 4. Sprint Breakdown

### Sprint 1: LLM Adapter Layer (AgentExecutor)

**Goal:** Replace the stub AgentExecutor with a real multi-provider LLM adapter.

#### 4.1.1 LLM Provider Interface

```typescript
interface LLMProvider {
  name: "openai" | "anthropic" | "ollama";
  chat(params: LLMChatParams): Promise<LLMChatResult>;
  stream(params: LLMChatParams): AsyncIterable<LLMStreamChunk>;
  isAvailable(): Promise<boolean>;
}

interface LLMChatParams {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
  tools?: LLMToolDefinition[];
  toolChoice?: "auto" | "required" | "none";
}

interface LLMChatResult {
  content: string;
  toolCalls?: LLMToolCall[];
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
  provider: string;
  latencyMs: number;
}
```

#### 4.1.2 Provider Implementations

- **OpenAIProvider** — Uses `openai` npm package. Models: `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`.
- **AnthropicProvider** — Uses `@anthropic-ai/sdk`. Models: `claude-sonnet-4-20250514`, `claude-haiku-4-20250414`.
- **OllamaProvider** — HTTP client to local Ollama server (`http://localhost:11434`). Models: configurable (e.g., `llama3`, `mistral`, `codellama`).

#### 4.1.3 Routing Strategy

- Each agent has a `defaultProvider` and `defaultModel` stored in the agents table.
- Tasks can specify a `providerOverride` and `modelOverride`.
- The `LLMRouter` resolves the final provider/model:
  1. Task override (if specified)
  2. Agent default (if no override)
  3. Company default (fallback)
- If the selected provider is unavailable (`isAvailable()` returns false), fall back to the next available provider in priority order.

#### 4.1.4 Database Changes

Add columns to `agents` table:
- `default_provider TEXT DEFAULT 'openai'`
- `default_model TEXT DEFAULT 'gpt-4o-mini'`

Add columns to `companies` table:
- `default_provider TEXT DEFAULT 'openai'`
- `default_model TEXT DEFAULT 'gpt-4o-mini'`

Add columns to `agent_tasks` table:
- `provider_override TEXT`
- `model_override TEXT`

#### 4.1.5 Cost Tracking

- Each `LLMChatResult` includes token usage.
- AgentExecutor records cost in `tool_calls` table using `costUsd` field (already exists).
- Cost calculation: provider-specific pricing table (hardcoded initially, configurable later).

**Deliverables:**
- `services/llm/types.ts` — Shared interfaces
- `services/llm/openaiProvider.ts`
- `services/llm/anthropicProvider.ts`
- `services/llm/ollamaProvider.ts`
- `services/llm/router.ts` — LLMRouter with fallback logic
- `services/agentExecutor.ts` — Rewritten to use LLMRouter
- DB migration for new columns

---

### Sprint 2: SwarmMessageBus (Real Implementation)

**Goal:** Replace the stub message bus with a full pub/sub + request/reply system.

#### 4.2.1 Pub/Sub

```typescript
interface SwarmMessageBus {
  // Pub/Sub
  publish(swarmRunId: string, topic: string, message: SwarmMessage): Promise<void>;
  subscribe(swarmRunId: string, topic: string, handler: MessageHandler): Unsubscribe;
  
  // Request/Reply
  request(swarmRunId: string, targetAgentId: string, message: SwarmMessage, opts?: RequestOpts): Promise<SwarmMessage>;
  onRequest(swarmRunId: string, agentId: string, handler: RequestHandler): Unsubscribe;
  
  // Lifecycle
  createBus(swarmRunId: string): void;
  destroyBus(swarmRunId: string): void;
}

interface RequestOpts {
  timeoutMs: number;   // Default: 4000ms
  retries: number;     // Default: 3
}
```

#### 4.2.2 Topic Convention

- `swarm:{swarmRunId}:broadcast` — All agents receive
- `swarm:{swarmRunId}:agent:{agentId}` — Direct to agent
- `swarm:{swarmRunId}:role:{role}` — All agents with a specific role
- `swarm:{swarmRunId}:leader` — Leader agent only

#### 4.2.3 Request/Reply Pattern

1. Requester publishes to target agent's topic with a `correlationId` and `replyTo` topic.
2. Target agent processes and publishes response to `replyTo` topic.
3. If no response within 4 seconds, retry (up to 3 times).
4. After exhausting retries, the leader is notified for escalation.
5. Leader can reassign the task or invoke governance escalation.

#### 4.2.4 Persistence

All messages are persisted in the existing `swarm_messages` table for:
- Debugging and audit trails
- Replay capability (future)
- Message ordering guarantees (via `createdAt` timestamp)

#### 4.2.5 Implementation

In-process implementation using EventEmitter pattern (no external message broker needed for V1):
- `Map<swarmRunId, EventEmitter>` for pub/sub
- `Map<correlationId, Promise resolver>` for request/reply
- Messages are persisted to DB asynchronously (fire-and-forget with retry)

**Deliverables:**
- `services/swarmMessageBus.ts` — Full rewrite
- `services/messageTypes.ts` — Message type definitions
- Tests for pub/sub and request/reply patterns

---

### Sprint 3: Parallel Execution Engine (SwarmEngine + AgentPool)

**Goal:** Implement true parallel agent execution within swarms.

#### 4.3.1 Execution Flow

```
proposeSwarm() 
  → [governance check] 
  → spawnAgents() — create swarm_agents records
  → executeParallel() — all agents run simultaneously via AgentPool
  → synthesize() — iterative refinement
  → complete()
```

#### 4.3.2 Leader Agent

Every swarm has exactly one leader agent (the first agent, or explicitly designated):

- **Task Assignment:** Leader receives the swarm objective, decomposes it into sub-tasks, and publishes assignments via the message bus.
- **Monitoring:** Leader subscribes to all agent progress topics. Tracks completion percentage.
- **Timeout Management:** Leader sets per-task deadlines. If an agent exceeds its deadline:
  1. Send a "hurry up" message (warning).
  2. After 2x deadline, reassign the task to another agent.
  3. After 3x deadline, escalate to governance if the swarm is blocked.
- **Conflict Resolution:** When agents produce conflicting outputs, leader initiates a majority vote round via the message bus.

#### 4.3.3 AgentPool Enhancements

Current AgentPool is a simple concurrency limiter. Enhancements:

- **Priority queues** — High-priority agents (leader) get slots first.
- **Dynamic concurrency** — Adjust pool size based on company budget remaining.
- **Progress tracking** — Each agent reports progress (0-100%) to the pool.
- **Cancellation** — Support `AbortController` for graceful agent cancellation.

#### 4.3.4 Company-Wide Soft Limit

- Default soft limit: configurable per company (e.g., 20 concurrent swarm agents).
- When exceeded: emit a `budget_alert` with type `concurrency_warning`.
- Do NOT reject new swarm runs — just warn.
- Track active agent count in-memory with periodic DB reconciliation.

#### 4.3.5 Execution Lifecycle per Agent

```
1. Agent receives task assignment from leader (via message bus)
2. Agent enters execution loop:
   a. Build prompt (system prompt + task + context + memory)
   b. Call LLM via AgentExecutor
   c. If LLM returns tool calls → execute tools in sandbox
   d. If LLM returns content → evaluate completeness
   e. Loop until task complete or timeout
3. Agent publishes result to swarm broadcast topic
4. Agent enters idle state (available for reassignment)
```

**Deliverables:**
- `services/swarmEngine.ts` — Full rewrite of execution phases
- `services/agentPool.ts` — Enhanced with priority, progress, cancellation
- `services/leaderAgent.ts` — Leader orchestration logic
- Updated routes for swarm status (progress, active agents, messages)

---

### Sprint 4: Synthesis Engine (Iterative Refinement)

**Goal:** Implement iterative refinement synthesis with conflict resolution.

#### 4.4.1 Synthesis Phases

```
Phase 1: Collection
  - Gather all agent outputs from the swarm run
  - Categorize by task/subtask

Phase 2: First Pass
  - Leader agent produces initial synthesis from all outputs
  - Publishes draft to all agents

Phase 3: Refinement Rounds (configurable, default: 2 rounds)
  - Each agent reviews the draft and submits feedback/corrections
  - Leader incorporates feedback into next draft
  - Repeat for configured number of rounds

Phase 4: Conflict Resolution
  - If agents disagree on specific points after refinement:
    - Leader poses the conflicting options to all agents
    - Majority vote determines the winner
    - Leader breaks ties

Phase 5: Finalization
  - Final deliverable is persisted
  - Key learnings are selectively injected into agent memory_entries
  - Swarm transitions to 'completed' status
```

#### 4.4.2 Memory Injection

After synthesis, the system selectively injects learnings into agent memory:

- **What gets injected:** Key decisions, discovered facts, successful patterns.
- **Selection criteria:** Leader decides what's worth remembering based on novelty and relevance.
- **Memory format:** Stored in `memory_entries` with category `swarm_learning` and metadata linking back to the swarm run.
- **Scope:** Only agents that participated in the swarm receive the memories.

#### 4.4.3 Deliverable Format

```typescript
interface SwarmDeliverable {
  swarmRunId: string;
  summary: string;
  sections: Array<{
    title: string;
    content: string;
    contributingAgents: string[];
    confidence: number; // 0-1, based on agreement level
  }>;
  conflicts: Array<{
    topic: string;
    positions: Array<{ agentId: string; position: string }>;
    resolution: string;
    method: "majority_vote" | "leader_decision";
  }>;
  metadata: {
    totalRounds: number;
    totalMessages: number;
    totalTokensUsed: number;
    totalCostUsd: number;
    durationMs: number;
  };
}
```

**Deliverables:**
- `services/synthesisService.ts` — Full rewrite
- `services/memoryInjector.ts` — Selective memory injection logic
- `types/deliverable.ts` — SwarmDeliverable type definitions

---

### Sprint 5: Governance Integration

**Goal:** Wire governance into the parallel SAR lifecycle.

#### 4.5.1 Three-Tier Governance

| Tier | Risk Level | Action Types | Approval |
|------|-----------|--------------|----------|
| Auto-approve | Low | Read-only tool calls, memory queries, internal messages | Instant |
| Single-approve | Medium | External API calls, budget < $10, non-destructive writes | One approver (leader or designated) |
| Quorum | High | Budget > $10, hiring/firing agents, swarm spawning, destructive actions | Majority of governance committee |

#### 4.5.2 Governance in SAR Lifecycle

- **Swarm Proposal:** Requires governance approval (tier depends on estimated cost).
- **During Execution:** Tool calls are checked against capability tokens. If a tool call exceeds the agent's capability scope, it's escalated.
- **Budget Checks:** Before each LLM call, check remaining budget. If budget is exhausted:
  1. Pause the agent.
  2. Notify the leader.
  3. Leader can request budget override (governance quorum).
- **Timeout Escalation:** If a leader's timeout management fails (3x deadline exceeded), governance is notified to decide: continue, dissolve, or force-complete.

#### 4.5.3 Capability Tokens

The existing `capability_tokens` table is used:
- Each swarm agent gets a capability token at spawn time.
- Token specifies: allowed tool scopes, max spend per action, delegation level, expiration.
- Token is checked before every tool call in the sandbox.

**Deliverables:**
- `services/governanceService.ts` — Full rewrite with three-tier logic
- `services/capabilityManager.ts` — Token creation, validation, revocation
- Integration with SwarmEngine lifecycle hooks

---

### Sprint 6: Sandbox & Tool Execution

**Goal:** Implement sandboxed tool execution for swarm agents.

#### 4.6.1 Sandbox Model

Each agent in a swarm gets an isolated execution context:

```typescript
interface AgentSandbox {
  agentId: string;
  swarmRunId: string;
  allowedTools: string[];
  capabilityToken: CapabilityToken;
  executionLog: ToolExecution[];
  
  executeTool(toolName: string, params: unknown): Promise<ToolResult>;
  destroy(): void;
}
```

#### 4.6.2 Tool Registry

Tools are registered globally and filtered per-agent based on capability tokens:

- **Built-in tools:** `web_search`, `code_execute`, `file_read`, `file_write`, `api_call`, `memory_query`, `memory_store`, `agent_message`.
- **Custom tools:** Defined per-company (future sprint).

#### 4.6.3 Execution Tracing

Every tool call is recorded in the `tool_calls` table with:
- OpenTelemetry-compatible `traceId`, `spanId`, `parentSpanId`.
- Input/output, duration, cost, success/failure.
- Links to the swarm run and agent.

**Deliverables:**
- `services/sandboxService.ts` — Full rewrite
- `services/toolRegistry.ts` — Tool registration and lookup
- Built-in tool implementations (stubs initially, real implementations iteratively)

---

### Sprint 7: Observability & SSE Streaming

**Goal:** Real-time visibility into parallel SAR execution.

#### 4.7.1 SSE Events

Extend the existing SSE endpoint (`GET /companies/:companyId/events`) with swarm-specific events:

| Event Type | Payload | When |
|-----------|---------|------|
| `swarm.started` | swarmRunId, agents, objective | Swarm begins execution |
| `swarm.agent.progress` | agentId, progress%, currentTask | Agent reports progress |
| `swarm.message` | from, to, topic, preview | Inter-agent message sent |
| `swarm.tool.called` | agentId, toolName, status | Tool execution |
| `swarm.synthesis.round` | roundNumber, draft preview | Synthesis round completed |
| `swarm.conflict` | topic, positions, resolution | Conflict detected and resolved |
| `swarm.completed` | deliverable summary, costs | Swarm finished |
| `swarm.failed` | error, phase, recovery | Swarm failed |
| `swarm.governance.required` | requestType, details | Governance action needed |

#### 4.7.2 Trace Aggregation

- Per-swarm trace view: all tool calls, LLM calls, messages in chronological order.
- Per-agent trace view: filtered to a single agent's activity.
- Cost breakdown: per-agent, per-provider, per-tool.

**Deliverables:**
- Enhanced SSE broadcasting in SwarmEngine lifecycle
- `routes/traces.ts` — Enhanced trace query endpoints
- `routes/swarms.ts` — Enhanced status endpoints with live data

---

## 5. Database Migration Summary

### New Columns

| Table | Column | Type | Default |
|-------|--------|------|---------|
| `agents` | `default_provider` | `TEXT` | `'openai'` |
| `agents` | `default_model` | `TEXT` | `'gpt-4o-mini'` |
| `companies` | `default_provider` | `TEXT` | `'openai'` |
| `companies` | `default_model` | `TEXT` | `'gpt-4o-mini'` |
| `companies` | `soft_agent_limit` | `INTEGER` | `20` |
| `agent_tasks` | `provider_override` | `TEXT` | `NULL` |
| `agent_tasks` | `model_override` | `TEXT` | `NULL` |
| `swarm_runs` | `deliverable` | `JSONB` | `NULL` |
| `swarm_runs` | `total_cost_usd` | `NUMERIC(10,4)` | `0` |
| `swarm_runs` | `total_tokens` | `INTEGER` | `0` |
| `swarm_runs` | `synthesis_rounds` | `INTEGER` | `2` |

### New Tables

None — the existing schema covers all needs. The `capability_tokens` and `heartbeat_dead_letters` tables (already defined but recently added) are sufficient.

---

## 6. Sprint Execution Order

```
Sprint 1: LLM Adapter Layer          ← Foundation (no dependencies)
Sprint 2: SwarmMessageBus             ← Foundation (no dependencies)
Sprint 3: Parallel Execution Engine   ← Depends on Sprint 1 + 2
Sprint 4: Synthesis Engine            ← Depends on Sprint 3
Sprint 5: Governance Integration      ← Depends on Sprint 3
Sprint 6: Sandbox & Tool Execution    ← Depends on Sprint 1 + 5
Sprint 7: Observability & SSE         ← Depends on Sprint 3 (can start partially in parallel)
```

**Parallelizable:**
- Sprint 1 and Sprint 2 can run in parallel.
- Sprint 4 and Sprint 5 can run in parallel (both depend on Sprint 3).
- Sprint 7 can start alongside Sprint 4/5 (observability hooks during execution engine work).

---

## 7. Non-Functional Requirements

- **No external message broker** — V1 uses in-process EventEmitter. Redis/NATS can be added later.
- **No external sandbox** — V1 uses in-process isolation. Docker/Firecracker can be added later.
- **Cost tracking is critical** — Every LLM call and tool execution must record cost.
- **Graceful degradation** — If a provider is down, fall back. If an agent fails, the swarm continues with remaining agents.
- **No breaking API changes** — New endpoints are additive. Existing endpoints continue to work.

---

## 8. Open Questions (For Future Sprints)

1. **Persistent swarm memory** — Should swarms have their own shared memory space beyond individual agent memory?
2. **Swarm templates** — Pre-defined swarm configurations (e.g., "Research Team", "Code Review Squad")?
3. **Cross-swarm communication** — Should swarms be able to message other swarms?
4. **Human-in-the-loop** — Should governance support human approval via the UI?
5. **Rate limiting per provider** — How to handle OpenAI/Anthropic rate limits across concurrent agents?

---

## 9. Success Criteria

- [ ] Multiple agents execute LLM calls truly in parallel within a swarm
- [ ] Agents communicate via pub/sub and request/reply patterns
- [ ] Leader agent orchestrates task assignment, monitoring, and timeout management
- [ ] Synthesis produces a structured deliverable through iterative refinement
- [ ] Conflicts are resolved via majority vote
- [ ] All LLM calls go through the multi-provider adapter with fallback
- [ ] Governance gates are enforced at all three tiers
- [ ] Tool calls are sandboxed and traced
- [ ] SSE streams provide real-time visibility into swarm execution
- [ ] Company-wide soft limits emit warnings without blocking
- [ ] Cost tracking is accurate across all providers and tools

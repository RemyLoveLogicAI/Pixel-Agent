# Auto

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step 1: Investigation & Planning
- Analyzed the task description "Run a parallel swarm. Full DevOps engineering. Orchestration. In parallel."
- Identified `parallel-sar-spec.md` as the full sprint specification for the Parallel Swarm Agent Run.
- Copied specification to `.zenflow/tasks/new-task-gemini-3308/spec.md`.
- Broke down the specification into actionable sprint-based steps.

### [ ] Step 2: LLM Adapter Layer (AgentExecutor)
- Define LLMProvider interface in `services/llm/types.ts`.
- Implement `OpenAIProvider`, `AnthropicProvider`, and `OllamaProvider`.
- Build `LLMRouter` with routing strategy (override vs default vs fallback).
- Update database schema (agents, companies, agent_tasks) for overrides and defaults.
- Rewrite `AgentExecutor` to use `LLMRouter` and track cost in `tool_calls`.

### [ ] Step 3: SwarmMessageBus (Pub/Sub & Request/Reply)
- Implement `SwarmMessageBus` with topic routing (broadcast, agent, role, leader).
- Implement request/reply patterns with retries and timeout (4s).
- Persist messages asynchronously into `swarm_messages` table.
- Write tests for pub/sub and request/reply functionality.

### [ ] Step 4: Parallel Execution Engine
- Rewrite `SwarmEngine.ts` to manage 6-phase lifecycle orchestration.
- Enhance `AgentPool` to handle priority queues, dynamic concurrency, progress reporting, and cancellation.
- Implement Leader Agent for task assignment, monitoring, timeout management, and governance escalation.
- Add company-wide soft concurrency limits emitting `budget_alert`.

### [ ] Step 5: Synthesis Engine & Memory Archival
- Implement iterative 5-phase synthesis (Collection -> First Pass -> Refinement Rounds -> Conflict Resolution -> Finalization).
- Use Leader Agent for conflict resolution via majority vote.
- Inject learnings selectively into `memory_entries` (`swarm_learning` category).
- Store final structured deliverable with confidence levels and cost metadata.

### [ ] Step 6: Governance Integration
- Refactor `GovernanceService` for 3-tier checks: Auto-approve, Single-approve, and Quorum.
- Enforce capability tokens per agent (tool scope, max spend, delegation, expiration).
- Wire governance checks into Swarm proposal, budget hooks, and timeout escalations.

### [ ] Step 7: Sandbox & Tool Execution
- Create `SandboxService.ts` for isolated execution context per swarm agent.
- Create `ToolRegistry.ts` for scoping available capabilities to the agent's capability token.
- Build stub capabilities (`web_search`, `code_execute`, `memory_query`, etc.).
- Add execution tracing (traceId, spanId) linked to the swarm.

### [ ] Step 8: Observability & SSE Streaming
- Add swarm-specific SSE events (`swarm.started`, `swarm.agent.progress`, `swarm.message`, etc.).
- Build API routes for trace aggregation.
- Expand Swarm Status endpoints with live real-time metrics.

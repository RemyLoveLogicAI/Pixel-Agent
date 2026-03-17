# Orchestration Engine - Implementation Task List

This document provides an actionable, step-by-step implementation plan for the Orchestration Engine based on the approved Requirements and Design documents.

## Phase 1: Core Data Models & Capability Tokens
- [ ] **Task 1.1:** Update Drizzle ORM schemas in `artifacts/lib/db/src/schema/`.
  - Add `managerId`, `capabilities` (JSONB), `budgetCap`, and `currentSpend` to `agentsTable`.
  - Create the new `tasksTable` with fields: `id`, `parentTaskId`, `assignedTo`, `status`, and `retryCount`.
  - Update `swarmRunsTable` with the new lifecycle enum `phase` and `leaderAgentId`.
- [ ] **Task 1.2:** Run database migrations for the updated schemas.
- [ ] **Task 1.3:** Implement `AgentPool` service methods to query and validate the hierarchy chain (e.g., verifying if Agent A is the manager of Agent B).
- [ ] **Task 1.4:** Implement capability token validation logic in `AgentPool` to verify specific permissions (e.g., `can_spawn_swarm`, `can_execute_code`).

## Phase 2: Heartbeat Scheduler & Structured Concurrency
- [ ] **Task 2.1:** Install and configure an async worker queue library (e.g., BullMQ + Redis connection) in the `api-server`.
- [ ] **Task 2.2:** Refactor `HeartbeatRunner` to push pending tasks onto the worker queue instead of direct execution.
- [ ] **Task 2.3:** Implement the Worker process to consume tasks, enforcing max concurrency limits per agent type (Backpressure).
- [ ] **Task 2.4:** Implement per-agent Circuit Breaker logic in `circuitBreaker.ts`. 
  - Track consecutive failures per agent.
  - Trip breaker after N failures and emit a circuit-breaker event.
- [ ] **Task 2.5:** Create the Dead-Letter Queue (DLQ) mechanism to catch tasks that fail maximum retry limits.

## Phase 3: Dynamic Swarm Orchestration
- [ ] **Task 3.1:** Refactor `SwarmEngine.ts` to fully support the formal state machine: `Propose -> Approve -> Spawn -> Execute -> Synthesize -> Dissolve`.
- [ ] **Task 3.2:** Implement the `Approve` step integration with the `GovernanceService` to evaluate cost estimates.
- [ ] **Task 3.3:** Implement the `Spawn` step to instantiate ephemeral specialist agents with inherited contexts and restricted capability tokens.
- [ ] **Task 3.4:** Build the Inter-Agent Message Bus (via Redis Pub/Sub or DB polling) allowing specialists in the same `swarmId` to publish and subscribe to `IntermediateFinding` events.

## Phase 4: Governance & Cost Control
- [ ] **Task 4.1:** Implement the 3-Tier Budget Enforcement logic in `GovernanceService`.
  - Add soft limits (warning logs).
  - Add hard limits (reject execution and throw BudgetExceededError).
- [ ] **Task 4.2:** Build the Company-Wide Circuit Breaker logic that can dynamically pause the Heartbeat Scheduler queue.
- [ ] **Task 4.3:** Create the API endpoints/routes for the "Board" (User) to approve high-risk operations (e.g., expensive swarms or tool usage).

## Phase 5: Production & Synthesis
- [ ] **Task 5.1:** Implement output sandboxing/sanitization utility functions to strip potential prompt injections from IC (Individual Contributor) agent responses before they are passed to managers.
- [ ] **Task 5.2:** Implement the `Synthesize` step in `SwarmEngine` and `agentExecutor` where the Leader Agent aggregates IC findings into a single deliverable.
- [ ] **Task 5.3:** Update the `Memory & Synthesis Service` to archive finalized goals into long-term structured storage (DB or file artifacts) and cleanup ephemeral task state.

## Phase 6: Testing & Validation
- [ ] **Task 6.1:** Write unit tests for `AgentPool` hierarchy validation and capability checks.
- [ ] **Task 6.2:** Write integration tests for the `HeartbeatRunner` queue and concurrency limits.
- [ ] **Task 6.3:** Write integration tests for the `SwarmEngine` state machine transitions.
- [ ] **Task 6.4:** Perform end-to-end testing simulating a complex user prompt that triggers goal decomposition, swarm spawning, circuit breaker limits, and final synthesis.
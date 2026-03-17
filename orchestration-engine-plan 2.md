# Plan: Orchestration Engine

**Generated**: 2026-03-15
**Estimated Complexity**: High

## Overview
Design and implement a full orchestration engine for a hierarchical autonomous agent platform in the existing TypeScript/Node.js codebase (Express 5, Drizzle/Postgres). The plan delivers: (1) formal requirements, (2) detailed architecture, and (3) a phased, demoable implementation roadmap that integrates with the current heartbeat runner, swarm system, governance, and budget controls.

## Requirements
### Functional
- Enforce strict corporate hierarchy delegation rules (Board → CEO → Managers → ICs) with capability-token scoped delegation and escalation restrictions.
- Support project lifecycle ingestion: high-level goals → decomposition → delegation → execution → synthesis → archival.
- Heartbeat scheduler with structured concurrency, backpressure, per-agent circuit breakers, and dead-letter queues.
- Swarm orchestration with lifecycle state machine: Propose → Approve → Spawn → Execute → Synthesize → Dissolve.
- Lightweight inter-agent message bus for swarm collaboration and intermediate findings.
- Governance gating for high-risk tool usage, expensive swarms, and hierarchical escalations.
- Budget enforcement: per-call soft limit, per-agent hard cap, company-wide circuit breaker, with monthly reset.
- Output sandboxing to prevent prompt injection; synthesis by leader agents; archival to long-term structured memory.

### Non-Functional
- Container-ready, VM/K8s-compatible runtime.
- Reliability: bounded execution with timeouts, retries, and circuit breaking.
- Observability: traces, logs, and metrics for heartbeat runs and swarm lifecycles.
- Security/compliance: audit logging, encryption in transit and at rest, data retention policy hooks.

## Architecture Design
### Core Components
- **Hierarchy Service**: Validates reporting structure, delegation constraints, and escalation paths.
- **Capability Token Service**: Mints, validates, revokes tokens; embeds scopes, delegation limits, TTL.
- **Heartbeat Orchestrator**: Structured-concurrency scheduler with backpressure, agent-level breaker, and dead-letter queue.
- **Swarm Orchestrator**: State machine with governance approvals and swarm lifecycle management.
- **Message Bus**: Topic/channel-based delivery for swarm messages and synthesis signals.
- **Governance Service**: Request creation, approval/rejection, TTL handling, and audit trail.
- **Budget Service**: Multi-tier enforcement with soft/hard/circuit-breaker logic.
- **Sandbox + Synthesis**: Sanitizes outputs, performs safe synthesis, and archives to memory.

### Data Model Extensions (Drizzle/Postgres)
- Delegation graph validation tables or constraints (manager_id, report_id with rules).
- Capability token scope and delegation limit tables.
- Swarm lifecycle state and transition logs.
- Dead-letter queue tables for failed heartbeat tasks.
- Audit log tables for governance and high-risk tool usage.

### APIs
- Extend existing REST/OpenAPI endpoints for hierarchy, delegation, tokens, swarm lifecycle, heartbeat control, and governance approvals.
- Event/SSE updates for swarm and heartbeat run progress.

## Prerequisites
- Confirm deployment target (VM/container/K8s) and infra constraints.
- Choose message bus and queue tech (e.g., Postgres-based queue, Redis, NATS, or SQS).
- Confirm vector DB choice for semantic memory.

## Sprint 1: Requirements & Baseline Architecture
**Goal**: Lock requirements, document architecture, and map existing code to new components.
**Demo/Validation**:
- Review doc with stakeholders; verify mapping to existing endpoints and DB schema.

### Task 1.1: Requirements Spec
- **Location**: docs/requirements/orchestration-engine.md
- **Description**: Write a full requirements spec with acceptance criteria per capability.
- **Dependencies**: None
- **Acceptance Criteria**:
  - Delegation and governance rules are explicit.
  - Budget tiers and thresholds are defined.
- **Validation**: Stakeholder review sign-off.

### Task 1.2: Architecture Doc
- **Location**: docs/architecture/orchestration-engine.md
- **Description**: System diagram, component responsibilities, data flows, and sequence diagrams.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - All required components are covered.
  - Integration points with existing code are identified.
- **Validation**: Architecture review.

### Task 1.3: Codebase Mapping
- **Location**: docs/architecture/orchestration-engine.md
- **Description**: Map current modules (heartbeat, swarm, governance, budgets, executor) to target architecture.
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - Clear list of gaps and overlaps.
- **Validation**: Team review.

## Sprint 2: Hierarchy & Capability Tokens
**Goal**: Enforce delegation rules and token-based capability model.
**Demo/Validation**:
- Create a company with hierarchy, mint tokens, and verify delegation constraints via API tests.

### Task 2.1: Schema Updates
- **Location**: lib/db/src/schema/agents.ts, lib/db/src/schema/capability-tokens.ts (new)
- **Description**: Add delegation limit fields and token metadata tables.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - Tokens store scope, TTL, delegation depth.
- **Validation**: Drizzle migration + schema tests.

### Task 2.2: Delegation Validator
- **Location**: lib/services/hierarchy.ts (new)
- **Description**: Validate “direct report only” delegation and manager escalation rules.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Invalid delegation attempts return explicit errors.
- **Validation**: Unit tests.

### Task 2.3: Capability Token Service
- **Location**: lib/services/capability-tokens.ts (new)
- **Description**: Mint/verify/revoke tokens and enforce delegation limits.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Tokens are verified on task creation and delegation.
- **Validation**: Unit + API tests.

## Sprint 3: Heartbeat Scheduler + DLQ
**Goal**: Replace naive concurrency with structured concurrency, backpressure, and DLQ.
**Demo/Validation**:
- Run heartbeat with simulated failures and confirm DLQ entries and breaker behavior.

### Task 3.1: Heartbeat Concurrency Model
- **Location**: lib/orchestrator/heartbeat-runner.ts
- **Description**: Implement structured concurrency with bounded worker pool and backpressure.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - No unbounded Promise fan-out.
- **Validation**: Integration tests.

### Task 3.2: Dead-Letter Queue
- **Location**: lib/db/src/schema/heartbeat-dead-letters.ts (new)
- **Description**: Persist failed tasks with retry metadata.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Failed tasks are persisted with error cause and retries.
- **Validation**: DB tests.

### Task 3.3: Circuit Breakers
- **Location**: lib/orchestrator/heartbeat-runner.ts
- **Description**: Enforce per-agent and company-wide circuit breaker thresholds.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Breaker prevents execution beyond caps.
- **Validation**: Integration tests.

## Sprint 4: Swarm Lifecycle State Machine
**Goal**: Formalize swarm lifecycle with governance gate and message bus.
**Demo/Validation**:
- Launch swarm and observe state transitions and message exchange.

### Task 4.1: Swarm State Machine
- **Location**: lib/orchestrator/swarm-runner.ts
- **Description**: Implement Propose → Approve → Spawn → Execute → Synthesize → Dissolve.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - Only approved swarms can spawn.
- **Validation**: Integration tests.

### Task 4.2: Swarm Message Bus
- **Location**: lib/services/swarm-message-bus.ts (new)
- **Description**: Lightweight pub/sub for swarm agent collaboration.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Messages delivered to intended swarm agents.
- **Validation**: Unit tests.

## Sprint 5: Governance & Budget Enforcement
**Goal**: Enforce 3-tier budgets and governance approvals on risky actions.
**Demo/Validation**:
- Trigger high-risk tool usage and verify approval requirement.

### Task 5.1: Budget Enforcement Hooks
- **Location**: lib/services/budget.ts
- **Description**: Implement soft limit, hard cap, company breaker logic.
- **Dependencies**: Sprint 3
- **Acceptance Criteria**:
  - Exceeding hard cap blocks execution.
- **Validation**: Unit tests.

### Task 5.2: Governance Gate Integration
- **Location**: lib/services/governance.ts
- **Description**: Require approval for high-risk tool usage, expensive swarms, escalations.
- **Dependencies**: Sprint 4
- **Acceptance Criteria**:
  - Requests are created and expire after TTL.
- **Validation**: API tests.

## Sprint 6: Sandbox + Synthesis + Memory Archival
**Goal**: Safely sanitize outputs, synthesize deliverables, and archive memory.
**Demo/Validation**:
- Run a swarm, synthesize output, and verify archival in memory system.

### Task 6.1: Output Sanitization
- **Location**: lib/services/sandbox.ts (new)
- **Description**: Enforce prompt injection filters and output validation.
- **Dependencies**: Sprint 4
- **Acceptance Criteria**:
  - Unsafe content is quarantined.
- **Validation**: Unit tests.

### Task 6.2: Synthesis Pipeline
- **Location**: lib/services/synthesis.ts (new)
- **Description**: Aggregate outputs into final deliverables with leader agent.
- **Dependencies**: Task 6.1
- **Acceptance Criteria**:
  - Final output references sources.
- **Validation**: Integration tests.

### Task 6.3: Memory Archival
- **Location**: lib/services/memory.ts
- **Description**: Store synthesized outcomes in structured memory with categories.
- **Dependencies**: Task 6.2
- **Acceptance Criteria**:
  - Memory entries are created with metadata.
- **Validation**: DB + API tests.

## Testing Strategy
- Unit tests for hierarchy validation, token service, budget enforcement.
- Integration tests for heartbeat runs, swarm lifecycle, governance gates.
- Load tests for heartbeat concurrency and backpressure.
- Security tests for prompt injection and sandbox enforcement.

## Potential Risks & Gotchas
- Choice of message bus may affect ordering guarantees and latency.
- Swarm state transitions must be idempotent to handle retries.
- Governance approval latency could block execution if not queued properly.
- Budget enforcement must consider in-flight costs to avoid overruns.

## Rollback Plan
- Feature-flag new orchestrator paths.
- Keep existing heartbeat/swarms code path until verification passes.
- Revert to old scheduler if breaker or backpressure logic fails in production.

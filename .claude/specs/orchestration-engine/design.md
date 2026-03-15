# Orchestration Engine - Architecture & Design Document

## 1. System Overview
The Orchestration Engine acts as the central brain of the autonomous agent platform. It manages the lifecycle of all agents and tasks, enforcing a strict corporate hierarchy, maintaining execution resilience through structured concurrency and circuit breakers, and governing operations with strict budgets and capability tokens.

## 2. Architecture Components

### 2.1 Core Services
* **AgentPool**: Manages the available agents, their hierarchical relationships, and capability tokens.
* **Heartbeat Scheduler (Execution Engine)**: A highly available, robust worker queue system (e.g., BullMQ) that executes agent tasks concurrently. It pulls tasks from the database and coordinates the `agentExecutor`.
* **SwarmEngine**: Manages ephemeral swarms of agents through a formal state machine and facilitates their communication via an inter-agent message bus.
* **GovernanceService**: Intercepts all critical operations (tool execution, API calls, delegations) to enforce budget limits and capability checks.
* **Memory & Synthesis Service**: Handles the final reduction of outputs from sub-agents/swarms and archives the structured data for future recall.

## 3. Data Models (Drizzle ORM)

### 3.1 `agentsTable` Updates
* **`managerId`**: Self-referencing foreign key to enforce the corporate hierarchy.
* **`capabilities`**: JSONB array of granted capability tokens (e.g., `["spawn_swarm", "use_external_api", "escalate"]`).
* **`budgetCap`**: Numeric value representing the hard limit on API cost.
* **`currentSpend`**: Numeric value tracking current cycle spend.

### 3.2 `tasksTable` (New/Updated)
* **`id`**: UUID.
* **`parentTaskId`**: Self-referencing FK for goal decomposition.
* **`assignedTo`**: Agent ID.
* **`status`**: `pending` | `running` | `failed` | `completed` | `dlq`.
* **`retryCount`**: Integer for circuit breaker logic.

### 3.3 `swarmRunsTable` Updates
* **`phase`**: Enum `proposed` | `pending_approval` | `spawned` | `executing` | `synthesizing` | `dissolved`.
* **`leaderAgentId`**: ID of the agent that proposed the swarm.

## 4. Execution Engine & Parallel Execution

### 4.1 Heartbeat Scheduler
Instead of a naive `Promise.all` loop, the `HeartbeatRunner` will push pending tasks onto an async worker queue (e.g., BullMQ Redis queue).
* **Structured Concurrency**: Worker threads will process tasks concurrently with a defined maximum concurrency per agent type.
* **Backpressure**: The queue limits the rate at which agents pull work, preventing LLM rate limit exhaustion.

### 4.2 Circuit Breakers & Dead-Letter Queue (DLQ)
* **Per-Agent Breaker**: If an agent fails a task consecutively (e.g., 3 times due to hallucination or API errors), the circuit breaker opens. The agent is paused, and the task is routed to the DLQ.
* **DLQ Management**: Tasks in the DLQ can be manually inspected by a "Manager" agent or human administrator and either retried or aborted.

## 5. Dynamic Swarm Orchestration

### 5.1 Lifecycle State Machine
* **Propose**: Leader agent analyzes the task and drafts a list of required specialist roles.
* **Approve**: The `GovernanceService` evaluates the estimated cost. If it exceeds the leader's threshold, it is sent to the Board/User for approval.
* **Spawn**: Ephemeral specialist agents are created. They inherit scoped context and strict capability tokens.
* **Execute**: Specialists work concurrently.
* **Synthesize**: The Swarm Leader pauses the specialists, reads the intermediate findings, and generates a consolidated deliverable.
* **Dissolve**: Ephemeral agents are marked inactive and context is garbage collected.

### 5.2 Inter-Agent Message Bus
* A lightweight Pub/Sub topic (via Redis or database events) specifically for the active `swarmId`.
* Agents in a swarm can publish `IntermediateFinding` events that other specialists in the same swarm can subscribe to for real-time collaboration.

## 6. Governance & Cost Control

### 6.1 3-Tier Budget Enforcement
* **Per-Call Soft Limit**: Evaluated locally before API execution. Warns on large prompt payloads.
* **Per-Agent Hard Cap**: `GovernanceService` checks `currentSpend + estimatedCost` against `budgetCap`. Rejects execution if exceeded.
* **Company-Wide Circuit Breaker**: Global threshold. If tripped, all async workers pause execution of outward LLM calls.

### 6.2 Security & Sandboxing
* Capability tokens are cryptographically signed or strongly verified at the database level.
* Outputs from individual IC agents are passed through a sanitation check (e.g., markdown parsing without executing embedded commands) before being passed up to the Manager agent, preventing prompt injection cascades.

## 7. Synthesis & Archiving
When a top-level goal is marked `completed`, the CEO/Leader agent calls the `Memory & Synthesis Service` to:
1. Generate a summarized Markdown/JSON artifact of the outcome.
2. Archive the final artifact in the `goalsTable` and structured long-term memory.
3. Clean up any remaining operational state associated with the goal.
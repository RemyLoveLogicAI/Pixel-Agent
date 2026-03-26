# Services Layer Code Review Report

**Reviewed:** 2026-03-15
**Scope:** `artifacts/api-server/src/services/` -- five core service files
**Reviewer:** Claude (automated clean-code analysis)

---

## Summary Scores

| Service           | File                     | Clean Code Score (1-10) | Notes                                                |
|-------------------|--------------------------|:-----------------------:|------------------------------------------------------|
| SwarmEngine       | `swarmEngine.ts`         | 4                       | Heavy duplication, no transactions, sequential I/O   |
| GovernanceService | `governanceService.ts`   | 6                       | Reasonable structure; unsafe `as any` casts, missing expiry filter |
| HeartbeatRunner   | `heartbeatRunner.ts`     | 7                       | Best-structured service; budget race condition, long method |
| AgentPool         | `agentPool.ts`           | 8                       | Small, focused; thread-safety caveat worth noting    |
| CircuitBreaker    | `circuitBreaker.ts`      | 7                       | Clean pattern impl; missing half-open limit          |

---

## BLOCKING

### B-1. SwarmEngine: No database transactions around multi-step mutations
**File:** `artifacts/api-server/src/services/swarmEngine.ts`
**Lines:** 91-141 (`spawnSwarm`), 147-211 (`executeSwarm`)

`spawnSwarm` inserts N `swarmAgents` rows in a loop and then updates the `swarmRuns` phase. If the phase-update fails, orphan agent rows are left behind with no parent phase to match. The same pattern exists in `executeSwarm` -- agent records are updated one-by-one before the run record is updated.

**Recommended fix:** Wrap each phase method in `db.transaction(async (tx) => { ... })`. Pass `tx` instead of `db` to all queries within the phase.

---

### B-2. HeartbeatRunner: Budget update is a read-then-write race condition
**File:** `artifacts/api-server/src/services/heartbeatRunner.ts`
**Lines:** 190-195

```ts
await db.update(companiesTable)
    .set({ budgetUsedUsd: company.budgetUsedUsd + totalCostUsd, ... })
```

The company row is read at line 61-64, then all agents execute concurrently, and the budget is written back at line 190. If two heartbeat runs overlap (or another process updates spend), the write overwrites the intermediate value. This can allow spend to exceed the monthly cap.

**Recommended fix:** Use an atomic SQL increment: `sql\`budget_used_usd + ${totalCostUsd}\`` or perform the read + write inside a serializable transaction.

---

### B-3. GovernanceService: `executeApprovalActions` uses unvalidated `metadata` as DB input
**File:** `artifacts/api-server/src/services/governanceService.ts`
**Lines:** 128-129, 135-139, 145-157

`metadata.agentData` is cast to `any` and inserted directly into the agents table. `metadata.targetId` and `metadata.budgetMonthlyUsd` are cast and used in updates without Zod validation. An attacker who can create a governance request with arbitrary metadata can inject arbitrary agent rows or set arbitrary budget values.

**Recommended fix:** Validate `metadata` with the appropriate Zod schema from `@workspace/api-zod` before using it in DB operations. Each `requestType` case should have a dedicated metadata schema.

---

## IMPORTANT

### I-1. SwarmEngine: Sequential DB writes in a loop (N+1 pattern)
**File:** `artifacts/api-server/src/services/swarmEngine.ts`
**Lines:** 109-127 (`spawnSwarm`), 171-196 (`executeSwarm`)

Agents are inserted/updated one at a time in a `for` loop. For a swarm with 20 agents, this is 20 sequential round-trips.

**Recommended fix:** Batch-insert with a single `db.insert(swarmAgentsTable).values([...allValues])`. For updates in `executeSwarm`, collect results then batch-update using a CTE or `Promise.all` with bounded concurrency.

---

### I-2. SwarmEngine: Massive code duplication -- "fetch swarm, check phase" boilerplate
**File:** `artifacts/api-server/src/services/swarmEngine.ts`
**Lines:** 57-68, 91-103, 147-159, 217-229, 258-270

Every phase method starts with the same 12 lines: fetch the swarm, check if it exists, check if it's in the expected phase. This is repeated six times.

**Recommended fix:** Extract a private helper: `private async loadSwarmInPhase(swarmId: string, expectedPhase: string)` that returns the row or throws.

---

### I-3. HeartbeatRunner: `runHeartbeat` is 140+ lines -- violates SRP
**File:** `artifacts/api-server/src/services/heartbeatRunner.ts`
**Lines:** 56-198

This single method handles: company validation, budget checking, run record creation, agent filtering, agent-run record creation, parallel execution, result persistence, aggregation, run finalization, and company spend update. That is 9-10 distinct responsibilities.

**Recommended fix:** Decompose into private methods: `validateCompany()`, `createRunRecord()`, `fetchDueAgents()`, `persistResults()`, `finalizeRun()`. The main method becomes an orchestrator that calls these in sequence.

---

### I-4. HeartbeatRunner: Sequential agent-run result persistence (N+1)
**File:** `artifacts/api-server/src/services/heartbeatRunner.ts`
**Lines:** 154-171

After parallel execution, results are persisted one-by-one in a `for` loop. With 50 agents, this is 50 sequential DB round-trips.

**Recommended fix:** Use a batched approach -- either `Promise.all` with a bounded pool for the updates, or a single SQL statement with a `VALUES` list and `ON CONFLICT` update.

---

### I-5. GovernanceService: `expirePendingRequests` does not filter by `expiresAt`
**File:** `artifacts/api-server/src/services/governanceService.ts`
**Lines:** 205-223

The method declares `const now = new Date().toISOString()` but never uses it in the WHERE clause. The comment on line 219 says "In production, you'd add a proper where clause for expiresAt." This means calling this method expires ALL pending requests, not just the ones past their TTL.

**Recommended fix:** Add `lte(governanceRequestsTable.expiresAt, now)` to the WHERE clause.

---

### I-6. SwarmEngine: `specialistRoles` cast to `any[]` without validation
**File:** `artifacts/api-server/src/services/swarmEngine.ts`
**Line:** 105

```ts
const specialistRoles = (swarm.specialistRoles as any[]) || [];
```

If the JSON column contains unexpected data, the subsequent `roleSpec.role` and `roleSpec.count` accesses will silently produce `undefined`, leading to agents with role `"undefined-1"` and zero iterations.

**Recommended fix:** Define a Zod schema for `specialistRoles` (e.g., `z.array(z.object({ role: z.string(), count: z.number().int().positive() }))`) and parse it here.

---

### I-7. CircuitBreaker: Half-open state allows unlimited trial requests
**File:** `artifacts/api-server/src/services/circuitBreaker.ts`
**Lines:** 43-56

When the breaker transitions to half-open, `isOpen()` returns `false`. But since `isOpen()` is the only gate, every subsequent call also returns `false` while the state remains `half-open`. The half-open state should allow exactly one trial request -- if that fails, it should re-open; if it succeeds, it closes.

**Recommended fix:** Track a `halfOpenAttemptInFlight` boolean. When transitioning to half-open, set it to `true`. If `isOpen()` is called again while `halfOpenAttemptInFlight` is `true`, return `true` (block). Clear the flag on `recordSuccess()` or `recordFailure()`.

---

### I-8. AgentPool: `nextIndex` increment is not atomic
**File:** `artifacts/api-server/src/services/agentPool.ts`
**Lines:** 29-35

`nextIndex++` is used without synchronization across concurrent workers. While JavaScript is single-threaded and `await` yields control at known points, this relies on the implicit guarantee that no two workers will read `nextIndex` in the same microtask. This is safe in Node.js today but is a fragile assumption if the code is ever ported to a worker-thread model or if `processor` becomes synchronous.

**Recommended fix:** Acceptable as-is for Node.js single-threaded model, but add a comment documenting the safety invariant: `// SAFETY: nextIndex++ is atomic because JS is single-threaded and we only yield at await`.

---

## MINOR

### M-1. SwarmEngine: Hardcoded specialist roles in `proposeSwarm`
**File:** `artifacts/api-server/src/services/swarmEngine.ts`
**Lines:** 23-27

Always proposes the same 5 agents (2 researchers, 2 implementers, 1 reviewer) regardless of input. While documented as a placeholder, this should be clearly marked with a `// TODO` and ideally throw or warn if used in a non-development environment.

---

### M-2. SwarmEngine: `executeSwarm` sets phase to `executing` AFTER execution finishes
**File:** `artifacts/api-server/src/services/swarmEngine.ts`
**Lines:** 199-204

The phase is set to `executing` after all agents have already completed. Semantically, the phase should be set to `executing` before the work begins and to a post-execution phase (e.g., `executed`) after.

---

### M-3. GovernanceService: Inconsistent error handling -- update-then-check vs check-then-update
**File:** `artifacts/api-server/src/services/governanceService.ts`
**Lines:** 74-86 vs 48-63

`approveRequest` updates the row and then checks if the result is empty (line 86). `createRequest` does not verify the insert succeeded. Both patterns should be consistent; prefer checking the result of every mutation.

---

### M-4. HeartbeatRunner: `companyBudgetRemaining` becomes stale during parallel execution
**File:** `artifacts/api-server/src/services/heartbeatRunner.ts`
**Line:** 150

The remaining budget is computed once and passed to all concurrent agent executions. As agents spend budget concurrently, the value becomes stale. This is documented as a "coarse guard" (line 219) which is acceptable, but worth noting.

---

### M-5. SwarmEngine: Singleton exported at module level
**File:** `artifacts/api-server/src/services/swarmEngine.ts`
**Line:** 330

Exporting a singleton (`export const swarmEngine = new SwarmEngine()`) makes testing difficult because the instance cannot be replaced. The same pattern appears in `governanceService.ts` (line 312) and `heartbeatRunner.ts` (line 410).

**Recommended fix:** Export the class and let the DI/composition root instantiate it, or use a factory function that can be overridden in tests.

---

### M-6. GovernanceService: `CapabilityToken` interface defined but never used as a runtime type
**File:** `artifacts/api-server/src/services/governanceService.ts`
**Lines:** 9-19

The `CapabilityToken` interface is exported but never referenced within this file or (based on the delegation to `capabilityTokenService`) in the codebase as a concrete type. It may be dead code.

---

### M-7. CircuitBreaker: No reset/close method
**File:** `artifacts/api-server/src/services/circuitBreaker.ts`

There is no way to manually reset a circuit breaker (e.g., for admin intervention or testing). The only path from open to closed is: wait for timeout, then succeed.

**Recommended fix:** Add a `reset()` method that sets state to `closed` and zeroes the failure count.

---

### M-8. HeartbeatRunner: Circuit breaker map grows unboundedly
**File:** `artifacts/api-server/src/services/heartbeatRunner.ts`
**Lines:** 38, 49-54

`this.circuitBreakers` is a `Map<string, CircuitBreaker>` that grows with every unique agent ID but is never pruned. Over time in a multi-tenant system with agent churn, this becomes a memory leak.

**Recommended fix:** Use an LRU cache (e.g., `lru-cache` package) with a max size, or periodically evict entries for terminated agents.

---

## Cross-cutting Observations

1. **No logging.** None of the five services emit structured log messages. When a circuit breaker opens, a budget is exhausted, or a DLQ entry is created, there is no log trail. Recommend integrating a structured logger (pino) with correlation IDs.

2. **No OpenTelemetry instrumentation.** The schema has `traceId`/`spanId` columns, but no service creates or propagates spans. This is covered in the performance plan.

3. **No input validation at the service layer.** Services trust their callers to provide valid UUIDs, positive numbers, etc. Defense-in-depth suggests validating at both the route and service layers.

4. **`new Date()` called multiple times per operation.** Within a single logical operation (e.g., `runHeartbeat`), `new Date()` is called at different points, meaning timestamps can drift by seconds. Capture a single `now` at the start and reuse it.

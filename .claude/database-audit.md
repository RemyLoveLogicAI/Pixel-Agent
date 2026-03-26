# Database Audit

Reviewed: 2026-03-15
Schema location: `lib/db/src/schema/`

---

## 1. Missing Indexes

No tables define secondary indexes. Every foreign key column and every `status`/`phase` column used in WHERE clauses is doing sequential scans.

### Foreign key columns (create B-tree indexes)

| Table | Column | Why |
|---|---|---|
| `agents` | `company_id` | Every route scopes by company |
| `agents` | `manager_id` | `getDirectReports`, org-chart queries |
| `agent_tasks` | `company_id` | Task listing scoped by company |
| `agent_tasks` | `goal_id` | Joining tasks to goals |
| `agent_tasks` | `claimed_by` | Filtering tasks by agent |
| `goals` | `company_id` | Goal listing scoped by company |
| `goals` | `parent_id` | Hierarchical goal queries |
| `goals` | `assigned_to` | Agent workload queries |
| `governance_requests` | `company_id` | Request listing |
| `governance_requests` | `requesting_agent_id` | Agent-scoped governance history |
| `budget_alerts` | `company_id` | Alert listing |
| `budget_alerts` | `agent_id` | Per-agent alert lookup |
| `memory_entries` | `agent_id` | Agent knowledge retrieval |
| `memory_entries` | `company_id` | Company-scoped memory |
| `tool_calls` | `agent_id` | Trace listing by agent |
| `tool_calls` | `company_id` | Trace listing by company |
| `tool_calls` | `trace_id` | Span grouping in trace view |
| `heartbeat_runs` | `company_id` | Run history per company |
| `heartbeat_agent_runs` | `heartbeat_run_id` | Joining runs to agent runs |
| `heartbeat_agent_runs` | `agent_id` | Agent execution history |
| `heartbeat_dead_letters` | `agent_id` | DLQ lookup for unresolved entries |
| `heartbeat_dead_letters` | `heartbeat_run_id` | DLQ entries per run |
| `swarm_runs` | `company_id` | Swarm listing |
| `swarm_runs` | `goal_id` | Swarms per goal |
| `swarm_runs` | `leader_agent_id` | Swarms led by agent |
| `swarm_agents` | `swarm_run_id` | Agents in a swarm |
| `swarm_messages` | `swarm_run_id` | Messages in a swarm |
| `swarm_messages` | `from_agent_id` | Messages sent by agent |
| `swarm_messages` | `to_agent_id` | Messages received by agent |
| `capability_tokens` | `agent_id` | Tokens for an agent |
| `capability_tokens` | `issued_by` | Tokens issued by an agent |

### Status/phase columns (create B-tree indexes)

| Table | Column | Hot values |
|---|---|---|
| `agents` | `status` | `idle`, `thinking`, `circuit_open`, `terminated` |
| `agent_tasks` | `status` | `pending`, `claimed`, `in_progress` |
| `goals` | `status` | `active`, `proposed` |
| `governance_requests` | `status` | `pending` |
| `swarm_runs` | `phase` | `proposed`, `executing`, `spawning` |
| `heartbeat_runs` | `status` | `running` |
| `heartbeat_agent_runs` | `status` | `queued`, `running` |
| `budget_alerts` | `resolved` | `false` |

---

## 2. Recommended Composite Indexes (Hot Paths)

These cover the most common query patterns observed in routes and services:

```sql
-- Heartbeat: find agents due for execution
CREATE INDEX idx_agents_company_status_heartbeat
  ON agents (company_id, status, next_heartbeat_at);

-- Task claim: optimistic locking lookup
CREATE INDEX idx_tasks_company_status_version
  ON agent_tasks (company_id, status, version);

-- Task filtering by company + claimed agent
CREATE INDEX idx_tasks_company_claimed
  ON agent_tasks (company_id, claimed_by);

-- Trace queries: company-scoped, time-ordered
CREATE INDEX idx_tool_calls_company_created
  ON tool_calls (company_id, created_at DESC);

-- Trace queries: by trace_id for span grouping
CREATE INDEX idx_tool_calls_trace
  ON tool_calls (trace_id, created_at);

-- DLQ: find unresolved entries per agent
CREATE INDEX idx_dlq_agent_unresolved
  ON heartbeat_dead_letters (agent_id)
  WHERE resolved_at IS NULL;

-- Governance: pending requests per company
CREATE INDEX idx_governance_company_pending
  ON governance_requests (company_id, status)
  WHERE status = 'pending';

-- Capability tokens: active tokens per agent
CREATE INDEX idx_cap_tokens_agent_active
  ON capability_tokens (agent_id)
  WHERE revoked_at IS NULL;

-- Memory entries: agent lookup by category
CREATE INDEX idx_memory_agent_category
  ON memory_entries (agent_id, category);

-- Swarm agents by swarm run
CREATE INDEX idx_swarm_agents_run
  ON swarm_agents (swarm_run_id, status);

-- Agents by manager (org chart)
CREATE INDEX idx_agents_manager
  ON agents (manager_id);
```

In Drizzle, add these using the third argument to `pgTable`:

```ts
export const agentsTable = pgTable("agents", {
  // ...columns
}, (table) => [
  index("idx_agents_company_status_heartbeat")
    .on(table.companyId, table.status, table.nextHeartbeatAt),
  index("idx_agents_manager").on(table.managerId),
]);
```

---

## 3. N+1 Query Risks

### Critical: `HierarchyService.getReportingChain()`

Walks the manager chain one query per hop. For a 6-level hierarchy this fires 6 sequential queries. Replace with a recursive CTE:

```sql
WITH RECURSIVE chain AS (
  SELECT * FROM agents WHERE id = $1
  UNION ALL
  SELECT a.* FROM agents a JOIN chain c ON a.id = c.manager_id
)
SELECT * FROM chain;
```

### Critical: `HeartbeatRunner.runHeartbeat()` -- result persistence loop

Line 154-171: iterates `results` and issues one UPDATE per agent run. Replace with a batched update using `CASE` expressions or Drizzle's batch API.

### Moderate: `SwarmEngine.spawnSwarm()`

Line 109-127: inserts swarm agents one at a time inside a loop. Use a single bulk `db.insert(swarmAgentsTable).values([...])` call instead.

### Moderate: `SwarmEngine.executeSwarm()`

Line 171-196: updates each swarm agent individually inside a sequential loop. Batch the updates.

### Moderate: Traces route -- in-memory filtering

`GET /traces` fetches up to 200 rows then filters by `agentId` in JavaScript (line 18-19 of `traces.ts`). Push the `agentId` filter into the SQL WHERE clause.

### Low: Agent existence checks before every sub-resource operation

Routes like `/agents/:agentId/capability-tokens` and `/agents/:agentId/direct-reports` do a full agent SELECT just to verify existence. Consider using `EXISTS` subqueries or relying on FK constraints + error handling.

---

## 4. Other Schema Concerns

### Missing `updatedAt` on several tables

Tables without `updatedAt`: `budget_alerts`, `capability_tokens`, `heartbeat_agent_runs`, `heartbeat_runs`, `swarm_agents`, `swarm_messages`, `tool_calls`. If audit trails matter, add the column.

### `budget_alerts.resolved` uses text enum `"true"/"false"` instead of boolean

Replace with `boolean("resolved").default(false).notNull()`.

### `real` type for monetary values (`budget_monthly_usd`, `budget_used_usd`, `cost_usd`)

IEEE 754 floats accumulate rounding errors. Use `numeric(12, 4)` (Drizzle: `decimal`) for all USD values.

### No `ON DELETE` behavior specified on foreign keys

All `.references()` calls use the default `NO ACTION`. Deleting a company will fail if agents exist, which is probably correct, but should be explicitly documented. Consider `ON DELETE CASCADE` for child tables like `swarm_agents` -> `swarm_runs`.

### Optimistic locking race condition in task claim

The `PATCH /tasks/:taskId` route reads the current version, then updates without conditioning the UPDATE on the old version. Two concurrent patches can both succeed. The `/claim` endpoint does this correctly -- apply the same pattern to `PATCH`.

### `agents.managerId` has no foreign key constraint

The column is defined as `text("manager_id")` with no `.references()`. Add a self-referential FK:

```ts
managerId: text("manager_id").references(() => agentsTable.id),
```

---

## 5. Migration Safety Guidelines

1. **Never add NOT NULL columns without a DEFAULT** -- existing rows will fail the migration. Always add as nullable first, backfill, then alter to NOT NULL.

2. **Create indexes CONCURRENTLY** -- in the migration SQL, use `CREATE INDEX CONCURRENTLY` to avoid locking the table. Drizzle migrations may not do this by default; verify generated SQL before running.

3. **Never rename columns in-place** -- add the new column, backfill, update application code, then drop the old column in a later migration.

4. **Test migrations against a production-size dataset** -- a migration that runs in milliseconds on dev can lock for minutes on a table with millions of rows.

5. **Wrap multi-statement migrations in transactions** -- but note that `CREATE INDEX CONCURRENTLY` cannot run inside a transaction; split it into a separate migration file.

6. **Add indexes before adding application code that depends on them** -- deploy the index migration first, then deploy the code that issues the new query pattern.

7. **Use `drizzle-kit generate` to produce migration files, then review them** -- do not blindly apply generated SQL. Check for destructive operations (DROP, ALTER TYPE).

8. **Keep one concern per migration file** -- do not mix schema changes with data backfills. This makes rollbacks predictable.

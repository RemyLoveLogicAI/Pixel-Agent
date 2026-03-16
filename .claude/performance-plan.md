# Performance Engineering Plan

**Created:** 2026-03-15
**Scope:** Pixel-Agent API server -- observability, connection management, caching, SSE, load testing, SLOs

---

## 1. OpenTelemetry Integration Plan

The database schema already defines `traceId`, `spanId`, and `parentSpanId` columns on `tool_calls`. The goal is to propagate distributed traces through the entire request lifecycle.

### Phase 1: SDK Bootstrap

- Install `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-otlp-http`.
- Create `artifacts/api-server/src/telemetry.ts` that initializes the NodeSDK with:
  - `HttpInstrumentation` (auto-instruments Express)
  - `PgInstrumentation` (auto-instruments `pg.Pool` queries)
  - Resource attributes: `service.name=pixel-agent-api`, `service.version` from `package.json`
- Import `telemetry.ts` as the first line of `index.ts` (must run before Express or pg are loaded).

### Phase 2: Custom Spans in Services

| Service          | Span name                        | Attributes                                      |
|------------------|----------------------------------|-------------------------------------------------|
| HeartbeatRunner  | `heartbeat.run`                  | `company_id`, `trigger`, `agents_total`         |
| HeartbeatRunner  | `heartbeat.agent.execute`        | `agent_id`, `agent_role`, `status`              |
| SwarmEngine      | `swarm.phase.{phaseName}`        | `swarm_id`, `goal_id`, `agent_count`            |
| GovernanceService| `governance.request.{action}`    | `request_id`, `request_type`, `decided_by`      |
| AgentPool        | `agent_pool.map`                 | `batch_size`, `concurrency`                     |

```ts
// Example: HeartbeatRunner.executeOne
import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('heartbeat-runner');

private async executeOne(agent, runId, remaining) {
    return tracer.startActiveSpan('heartbeat.agent.execute', { attributes: { agent_id: agent.id } }, async (span) => {
        try {
            // ... existing logic ...
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (e) {
            span.recordException(e);
            span.setStatus({ code: SpanStatusCode.ERROR });
            throw e;
        } finally {
            span.end();
        }
    });
}
```

### Phase 3: Trace Context Propagation

- When `tool_calls` rows are inserted, populate `traceId` and `spanId` from the active span context: `trace.getActiveSpan()?.spanContext()`.
- For SSE events, include `traceId` in the event payload so frontend can correlate.
- For swarm inter-agent messages, propagate `traceId` through `swarm_messages.metadata` so the entire swarm execution is a single trace.

### Phase 4: Exporter Configuration

- **Development:** Jaeger all-in-one via Docker (`OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`)
- **Production:** OTLP to Grafana Tempo, Honeycomb, or Datadog (env-configured)
- Sampling: start with `AlwaysOn`, switch to `ParentBased(TraceIdRatioBased(0.1))` once volume exceeds 1000 req/s

---

## 2. Connection Pooling Configuration

### Current State

`lib/db/src/index.ts` creates a `new Pool({ connectionString })` with no explicit pool configuration. `pg.Pool` defaults to `max: 10` connections.

### Recommended Configuration

```ts
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    // Pool sizing
    max: parseInt(process.env.PG_POOL_MAX ?? '20', 10),      // max connections
    min: parseInt(process.env.PG_POOL_MIN ?? '5', 10),       // keep warm
    idleTimeoutMillis: 30_000,                                // release idle connections after 30s
    connectionTimeoutMillis: 5_000,                           // fail fast if pool exhausted

    // Statement timeout to prevent runaway queries
    statement_timeout: 10_000,                                // 10s max query time

    // Connection health
    allowExitOnIdle: false,                                   // keep pool alive in long-running server
});

// Monitor pool health
pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected pool error');
});

pool.on('connect', () => {
    poolGauge.set(pool.totalCount);  // OTel metric
});

pool.on('remove', () => {
    poolGauge.set(pool.totalCount);
});
```

### Sizing Rationale

- **HeartbeatRunner** can execute up to `maxConcurrent` (default 10) agent heartbeats in parallel, each doing 2-3 DB queries.
- **SwarmEngine** batch operations may need 5+ connections for a large swarm.
- A pool of 20 provides headroom without exhausting a typical managed PostgreSQL connection limit (100).
- The `min: 5` keeps connections warm to avoid cold-start latency on the first heartbeat.

### PgBouncer (Production)

For multi-instance deployments, place PgBouncer in `transaction` mode between the app and PostgreSQL:
- App pool: `max: 10` per instance
- PgBouncer: `default_pool_size = 20`, `max_client_conn = 200`
- This allows horizontal scaling without exhausting database connections.

---

## 3. Caching Strategy for Hot Paths

### 3.1 Agent Lookups

**Problem:** Every heartbeat, governance check, and swarm operation starts with `SELECT * FROM agents WHERE id = ?`. The heartbeat runner fetches all company agents, then the executor fetches each agent again.

**Strategy:** In-process LRU cache with short TTL.

```
Cache key:    agent:{agentId}
TTL:          10 seconds
Invalidation: On any UPDATE to agents table (status, budget, etc.)
Max entries:  1000 (per-instance)
Library:      lru-cache (already common in Node ecosystem)
```

Implementation:
- Create `services/cache.ts` with a generic `CacheService<K, V>` backed by `lru-cache`.
- Wrap agent lookups in a `getAgent(id)` that checks cache first.
- Invalidate on writes: after any `db.update(agentsTable)`, call `agentCache.delete(agentId)`.

### 3.2 Capability Token Validation

**Problem:** `governanceService.validateCapability` queries the agents table and then delegates to `capabilityTokenService.verify`, which likely queries `capability_tokens`. This happens on every authorized action.

**Strategy:** Cache tokens with TTL matching their `expiresAt`.

```
Cache key:    cap:{agentId}:{scope}
TTL:          min(token.expiresAt - now, 60 seconds)
Invalidation: On token mint, revoke, or agent status change
```

### 3.3 Company Budget (Read-through)

**Problem:** Company budget is read at the start of every heartbeat and is used as a guard. Multiple concurrent heartbeats read stale values.

**Strategy:** Do NOT cache -- use atomic SQL operations instead.

```sql
UPDATE companies
SET budget_used_usd = budget_used_usd + $1
WHERE id = $2
  AND budget_used_usd + $1 <= budget_monthly_usd
RETURNING budget_used_usd;
```

If no row is returned, budget is exhausted. This eliminates the race condition entirely.

### 3.4 Default Role Scopes

**Problem:** `getDefaultScopesForRole()` builds a new object on every call.

**Strategy:** Make the `roleScopes` map a static `readonly` module-level constant. Zero overhead.

---

## 4. SSE Backpressure Handling

### Current State

`artifacts/api-server/src/routes/events.ts` writes to SSE connections with `res.write(data)` and silently catches errors. There is no:
- Connection limit per company
- Backpressure detection (slow consumers)
- Message buffering or dropping policy
- Memory bound on the subscriber map

### Recommended Improvements

#### 4.1 Connection Limits

```ts
const MAX_SSE_PER_COMPANY = 50;
const MAX_SSE_TOTAL = 500;
let totalConnections = 0;

router.get('/companies/:companyId/events', (req, res) => {
    if (totalConnections >= MAX_SSE_TOTAL) {
        return res.status(503).json({ error: 'Too many SSE connections' });
    }
    const subs = subscribers.get(companyId);
    if (subs && subs.size >= MAX_SSE_PER_COMPANY) {
        return res.status(429).json({ error: 'Too many SSE connections for this company' });
    }
    totalConnections++;
    req.on('close', () => { totalConnections--; /* ... */ });
    // ...
});
```

#### 4.2 Backpressure Detection

Check `res.write()` return value. If it returns `false`, the kernel write buffer is full (slow consumer).

```ts
const send = (data: string) => {
    const ok = res.write(data);
    if (!ok) {
        // Slow consumer -- disconnect after grace period
        slowConsumerCount++;
        if (slowConsumerCount > 3) {
            res.end();
        }
    }
};
```

#### 4.3 Message Dropping Policy

For high-throughput scenarios, implement a per-subscriber ring buffer (last 100 messages). If the subscriber is slow, skip intermediate messages and send a `event: gap\ndata: {missed: N}` notification so the client knows to re-fetch state.

#### 4.4 Extracting to a Dedicated Service

Move SSE management out of the route file into `services/sseManager.ts`:
- `SseManager.subscribe(companyId, res): Subscription`
- `SseManager.broadcast(companyId, event)`
- `SseManager.getMetrics(): { totalConnections, byCompany }`

This enables unit testing and metrics collection.

---

## 5. Load Testing Targets (k6)

### Test Scenarios

| Scenario                    | Target RPS | Duration | Success Criteria                    |
|-----------------------------|:----------:|:--------:|-------------------------------------|
| Heartbeat trigger           | 50         | 5 min    | p99 < 2s, error rate < 1%          |
| Agent CRUD                  | 200        | 5 min    | p99 < 200ms, error rate < 0.1%     |
| Governance request lifecycle| 100        | 5 min    | p99 < 500ms, error rate < 0.1%     |
| Swarm full lifecycle        | 10         | 10 min   | p99 < 10s, error rate < 5%         |
| SSE connection storm        | 500 conns  | 5 min    | All connections stay alive, memory < 512MB |
| Mixed workload              | 300        | 15 min   | p99 < 1s, error rate < 1%          |

### k6 Script Structure

```
scripts/
  load-tests/
    k6.config.js          -- shared options (thresholds, scenarios)
    scenarios/
      heartbeat.js        -- POST /api/companies/:id/heartbeat
      agents-crud.js      -- GET/POST/PATCH /api/agents
      governance.js       -- create -> approve -> verify flow
      swarm-lifecycle.js  -- propose -> approve -> spawn -> execute -> synthesize -> dissolve
      sse-connections.js  -- Open N SSE connections, verify events arrive
    helpers/
      auth.js             -- API key / token setup
      data.js             -- test data factories
```

### Key Metrics to Collect

- `http_req_duration` (p50, p95, p99)
- `http_req_failed` (error rate)
- `pg_pool_active_connections` (custom counter via pool events)
- `pg_pool_waiting_count` (queue depth)
- `sse_active_connections` (gauge)
- `circuit_breaker_opens` (counter)
- `heartbeat_agent_latency` (histogram)

### Infrastructure for Load Tests

- Run k6 from a separate machine or container to avoid co-locating load generator and SUT.
- Use a dedicated PostgreSQL instance with production-like data (10K agents, 100 companies).
- Monitor PostgreSQL during tests: `pg_stat_activity`, `pg_stat_statements`, lock waits.

---

## 6. SLI/SLO Recommendations

### Service Level Indicators (SLIs)

| SLI Name                    | Definition                                                    | Measurement                                                 |
|-----------------------------|---------------------------------------------------------------|-------------------------------------------------------------|
| **API Availability**        | Fraction of non-5xx responses                                 | `1 - (count(status >= 500) / count(all requests))`          |
| **API Latency**             | Duration from request received to response sent               | Histogram from OTel HTTP instrumentation                    |
| **Heartbeat Success Rate**  | Fraction of heartbeat runs with status != `failed`            | `count(status in [completed, partial_failure]) / count(all)` |
| **Agent Execution Latency** | Time from agent `thinking` to result stored                   | `heartbeat_agent_runs.completedAt - heartbeat_runs.startedAt`|
| **SSE Delivery Latency**    | Time from `broadcastEvent()` call to client acknowledgment    | Synthetic probe: send event, measure arrival at test client  |
| **Budget Accuracy**         | Drift between `budget_used_usd` and sum of actual costs       | Periodic reconciliation job                                  |
| **Governance TTL Compliance** | Fraction of requests decided before `expiresAt`             | `count(decidedAt < expiresAt) / count(decided)`             |

### Service Level Objectives (SLOs)

| SLO                               | Target      | Window    | Burn Rate Alert              |
|------------------------------------|:-----------:|:---------:|------------------------------|
| API Availability                   | 99.9%       | 30 days   | 14.4x over 1h (page)        |
| API Latency p99 < 500ms           | 99%         | 30 days   | 6x over 6h (ticket)         |
| API Latency p99 < 2s              | 99.9%       | 30 days   | 14.4x over 1h (page)        |
| Heartbeat Success Rate            | 99%         | 7 days    | 3x over 24h (ticket)        |
| Agent Execution Latency p99 < 30s | 95%         | 7 days    | 6x over 6h (ticket)         |
| SSE Delivery Latency p99 < 1s     | 99%         | 7 days    | 6x over 6h (ticket)         |
| Budget Accuracy (drift < 1%)      | 99.9%       | 30 days   | Any violation (page)         |

### Error Budget Policy

- When the remaining error budget for a 30-day window drops below 25%, freeze non-critical deployments.
- When the error budget is exhausted, halt all feature work and focus on reliability improvements.
- Track error budget consumption in a weekly ops review dashboard (Grafana).

### Alerting Strategy

Use multi-window, multi-burn-rate alerting per the Google SRE workbook:

- **Page (fast burn):** 14.4x burn rate over 1 hour AND 6x over 6 hours. Indicates the error budget will be consumed in ~2 days.
- **Ticket (slow burn):** 3x burn rate over 24 hours AND 1x over 72 hours. Indicates a chronic reliability issue.

### Dashboard Layout (Grafana)

1. **Overview:** Request rate, error rate, latency heatmap, active SSE connections
2. **Heartbeat:** Run frequency, agent success/fail/skip breakdown, cost per run, DLQ depth
3. **Swarms:** Active swarms by phase, phase transition latency, cost per swarm
4. **Governance:** Pending requests count, decision latency, expired request rate
5. **Infrastructure:** PG pool utilization, connection wait time, circuit breaker states, Node.js event loop lag
6. **Error Budget:** Remaining budget %, burn rate trend, SLO compliance over time

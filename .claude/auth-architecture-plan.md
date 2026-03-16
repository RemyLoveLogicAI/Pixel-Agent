# Auth & Architecture Plan

## 1. Authentication Strategy: JWT with Tenant-Scoped Claims

### Token Structure

```
Header: { alg: "RS256", typ: "JWT" }
Payload: {
  sub:        "<userId>",           // human user or service account ID
  tid:        "<companyId>",        // tenant ID (maps to companies.id)
  role:       "admin" | "operator" | "viewer" | "agent-service",
  scopes:     ["agents:write", "governance:approve", ...],
  agentId?:   "<agentId>",         // present when a request originates from an agent
  iat:        <unix>,
  exp:        <unix>,
  iss:        "pixel-agent"
}
```

### Token Lifecycle

| Flow | Description |
|------|-------------|
| **Human login** | External IdP (Google / GitHub via OIDC) issues an id_token. Pixel-Agent's `/auth/token` endpoint exchanges it for a platform JWT containing `tid` + `role`. |
| **Agent-to-API** | HeartbeatRunner and SwarmEngine attach a short-lived JWT (5 min TTL) scoped to the agent's `companyId` + `agentId`. The agent's capability token scopes are embedded in the JWT `scopes` claim. |
| **Service-to-service** | Internal callers use a shared secret to obtain a JWT with `role: "agent-service"` and broad scopes. |
| **Refresh** | JWTs are not refreshed. Human sessions use a long-lived JWT (8h). Agents always mint fresh tokens per heartbeat cycle. |

### Key Rotation

- RS256 with JWKS. Public keys served at `GET /api/.well-known/jwks.json`.
- Rotate signing keys via environment variable or Vault integration. Old keys remain in JWKS for `exp` overlap period.

---

## 2. Authorization Model: Mapping to Existing Capability Tokens

The platform already has an internal authorization primitive: **capability tokens** (table `capability_tokens`, service `CapabilityTokenService`). The auth layer bridges external JWTs to internal capability checks.

### Two-Layer Model

```
Layer 1: JWT Authentication Middleware
  - Verifies signature, expiry, issuer
  - Extracts tid (companyId), role, scopes, agentId
  - Attaches parsed claims to req.auth

Layer 2: Authorization Middleware (per-route)
  - For human users: checks req.auth.role + req.auth.scopes against route requirements
  - For agent requests: delegates to CapabilityTokenService.verify(agentId, requiredScope)
  - For governance actions (approve/reject): requires role >= "operator" OR agent with "governance" scope
```

### Scope Mapping

| JWT Scope | Maps to Capability Token Scope | Routes Protected |
|-----------|-------------------------------|------------------|
| `companies:read` | n/a (human-only) | `GET /companies`, `GET /companies/:id` |
| `companies:write` | n/a (human-only) | `POST /companies`, `PATCH /companies/:id`, `DELETE /companies/:id` |
| `agents:read` | `agents` | `GET .../agents`, `GET .../agents/:id`, `GET .../org-chart` |
| `agents:write` | `agents` | `POST .../agents`, `PATCH .../agents/:id`, `DELETE .../agents/:id` |
| `goals:read` | `goals` | `GET .../goals`, `GET .../goals/tree`, `GET .../goals/:id` |
| `goals:write` | `goals` | `POST .../goals`, `PATCH .../goals/:id` |
| `tasks:read` | `goals` | `GET .../tasks` |
| `tasks:write` | `goals` | `POST .../tasks`, `PATCH .../tasks/:id`, `POST .../tasks/:id/claim` |
| `governance:read` | `governance` | `GET .../governance` |
| `governance:approve` | `governance` | `POST .../governance/:id/approve`, `.../reject` |
| `governance:write` | `governance` | `POST .../governance` |
| `budget:read` | `budget` | `GET .../budget`, `GET .../budget/alerts` |
| `budget:write` | `budget` | `PATCH .../budget/agents/:agentId` |
| `swarm:read` | `swarm` | `GET .../swarms`, `GET .../swarms/:id`, `GET .../swarms/:id/messages` |
| `swarm:write` | `swarm` | `POST .../swarms`, `POST .../swarms/:id/cancel` |
| `tools:read` | `tools` | `GET /tools`, `GET .../agents/:id/tools` |
| `tools:write` | `tools` | `POST .../agents/:id/tools`, `DELETE .../agents/:id/tools` |
| `memory:read` | `memory` | `GET .../agents/:id/memory` |
| `memory:write` | `memory` | `POST .../agents/:id/memory` |
| `traces:read` | n/a (observability) | `GET .../traces`, `GET .../traces/:traceId` |
| `heartbeat:read` | n/a (observability) | `GET .../heartbeat/runs`, `GET .../heartbeat/runs/:id`, `GET .../heartbeat/dead-letters` |
| `heartbeat:trigger` | n/a (operator) | `POST .../heartbeat` |
| `heartbeat:admin` | n/a (admin-only) | `POST /heartbeat/scheduler/*` |
| `tokens:read` | `agents` | `GET .../agents/:id/capability-tokens` |
| `tokens:write` | `agents.delegate` | `POST .../agents/:id/capability-tokens`, `DELETE .../capability-tokens/:id` |
| `delegation:write` | `agents.delegate` | `POST .../agents/:id/delegate`, `POST .../agents/:id/validate-delegation` |

### Tenant Isolation

Every query that touches tenant data already filters by `companyId` from the URL path. The auth middleware adds a second check:

```
if (req.params.companyId && req.auth.tid !== req.params.companyId) {
  throw new ApiError(403, "Tenant mismatch");
}
```

This prevents a valid JWT for tenant A from accessing tenant B's resources, even if scopes match.

---

## 3. Middleware Design for Express 5

### Middleware Stack (order matters)

```
app.use(cors())
app.use(express.json())
app.use(requestId())                    // NEW: attach x-request-id
app.use(requestLogger())                // NEW: structured logging
app.use("/api", router)
  router.use(authenticate())           // NEW: verify JWT, attach req.auth
  router.use(healthRouter)             //   (healthz is exempt from auth)
  router.use(tenantGuard())            // NEW: enforce tid === :companyId
  router.use(companiesRouter)
  router.use(agentsRouter)
  ... (all domain routers)
app.use(notFound)
app.use(errorHandler)                  // existing
```

### New Middleware Files

| File | Responsibility |
|------|---------------|
| `middlewares/authenticate.ts` | Decode + verify JWT. Populates `req.auth: { sub, tid, role, scopes, agentId? }`. Returns 401 on missing/invalid token. Skips `/healthz` and `/.well-known/*`. |
| `middlewares/authorize.ts` | Factory: `authorize("goals:write")` returns middleware that checks `req.auth.scopes`. For agent-originated requests, also calls `capabilityTokenService.verify()`. Returns 403 on insufficient permissions. |
| `middlewares/tenant-guard.ts` | Compares `req.auth.tid` to `req.params.companyId`. Returns 403 on mismatch. No-op for routes without `:companyId` (e.g., `GET /tools`, scheduler routes). |
| `middlewares/request-id.ts` | Generates or propagates `x-request-id` header. Attaches to `req.id` for tracing. |
| `middlewares/request-logger.ts` | Logs `{ method, path, status, latencyMs, requestId, tid }` on response finish. |

### Express 5 Considerations

- Express 5 supports `async` route handlers natively (rejected promises auto-call `next(err)`). The existing try/catch wrappers in routes can be removed after upgrading the error handler.
- `req.params` typing: extend `Request` via module augmentation to include `auth` property.

### Type Augmentation

```typescript
// types/express.d.ts
declare namespace Express {
  interface Request {
    auth: {
      sub: string;
      tid: string;
      role: "admin" | "operator" | "viewer" | "agent-service";
      scopes: string[];
      agentId?: string;
    };
    id: string;
  }
}
```

---

## 4. Architecture Refactoring Plan

### Current State: Problems

1. **Routes contain business logic.** Route files directly import `db` and run Drizzle queries. This means:
   - No unit-testable business logic layer
   - Validation, data access, and HTTP concerns are interleaved
   - Route files are 100-270 lines of mixed concerns

2. **Services are singletons with hard-wired dependencies.** `swarmEngine`, `governanceService`, `heartbeatRunner` are module-level singletons importing `db` directly. This prevents:
   - Constructor injection for testing
   - Swapping implementations (e.g., mock executor)

3. **No repository layer.** Every route and service writes raw Drizzle queries. Schema changes ripple across the entire codebase.

4. **Shared module-level state.** SSE subscribers in `events.ts`, circuit breakers in `HeartbeatRunner`, and the scheduler in `heartbeatScheduler.ts` are all module-level globals.

### Target Architecture

```
HTTP Layer          Service Layer           Data Layer
-----------         -------------           ----------
routes/*.ts    -->  services/*.ts      -->  repositories/*.ts
  - Parse req       - Business rules        - Drizzle queries
  - Validate         - Orchestration         - Single table per repo
  - Call service     - Call repos            - Return typed results
  - Format res       - Emit events
```

### Phase 1: Introduce Repositories (non-breaking)

Create a `repositories/` directory with one file per table (or closely related table group):

| Repository | Tables | Replaces queries in |
|-----------|--------|-------------------|
| `CompanyRepository` | `companies` | `companies.ts` route, `heartbeatRunner.ts`, `governanceService.ts` |
| `AgentRepository` | `agents` | `agents.ts` route, `heartbeatRunner.ts`, `governanceService.ts`, `capabilityTokenService.ts`, `hierarchyService.ts` |
| `GoalRepository` | `goals` | `goals.ts` route |
| `TaskRepository` | `agent_tasks` | `tasks.ts` route |
| `GovernanceRepository` | `governance_requests` | `governance.ts` route, `governanceService.ts` |
| `SwarmRepository` | `swarm_runs`, `swarm_agents`, `swarm_messages` | `swarms.ts` route, `swarmEngine.ts` |
| `CapabilityTokenRepository` | `capability_tokens` | `agents.ts` route, `capabilityTokenService.ts` |
| `HeartbeatRepository` | `heartbeat_runs`, `heartbeat_agent_runs`, `heartbeat_dead_letters` | `heartbeat.ts` route, `heartbeatRunner.ts` |
| `MemoryRepository` | `memory_entries` | `memory.ts` route |
| `TraceRepository` | `tool_calls` | `traces.ts` route |
| `BudgetAlertRepository` | `budget_alerts` | `budget.ts` route |

Each repository is a class that accepts a `db` instance via constructor:

```typescript
export class AgentRepository {
  constructor(private db: DrizzleDB) {}
  async findByCompany(companyId: string): Promise<Agent[]> { ... }
  async findById(companyId: string, agentId: string): Promise<Agent | null> { ... }
  async create(data: InsertAgent): Promise<Agent> { ... }
  async update(agentId: string, data: Partial<Agent>): Promise<Agent> { ... }
  async delete(companyId: string, agentId: string): Promise<boolean> { ... }
}
```

### Phase 2: Extract Business Logic from Routes into Services

Move all non-trivial logic out of route handlers. Routes become thin adapters:

```typescript
// BEFORE (agents.ts route, ~30 lines per handler)
router.post("/companies/:companyId/agents", async (req, res, next) => {
  try {
    const parsed = insertAgentSchema.safeParse({ ... });
    if (!parsed.success) return next(new ApiError(400, ...));
    const [agent] = await db.insert(agentsTable).values(parsed.data).returning();
    res.status(201).json(agent);
  } catch (err) { next(err); }
});

// AFTER (agents.ts route, ~5 lines per handler)
router.post("/companies/:companyId/agents",
  authorize("agents:write"),
  async (req, res) => {
    const agent = await agentService.create(req.auth.tid, req.body);
    res.status(201).json(agent);
  }
);
```

New services to create or expand:

| Service | Current State | Target |
|---------|--------------|--------|
| `AgentService` | Does not exist | CRUD + org-chart + tool assignment |
| `GoalService` | Does not exist | CRUD + tree building + status transitions |
| `TaskService` | Does not exist | CRUD + claim with optimistic lock |
| `BudgetService` | Does not exist | Read summaries + update agent budgets + alert queries |
| `TraceService` | Does not exist | Query tool_calls with filtering |
| `MemoryService` | Does not exist | CRUD for agent memory entries |
| `GovernanceService` | Exists but routes bypass it | Routes should call service exclusively |
| `SwarmEngine` | Exists | No change needed (already well-structured) |
| `HeartbeatRunner` | Exists | Inject repos instead of raw db |
| `CapabilityTokenService` | Exists | Inject `AgentRepository` + `CapabilityTokenRepository` |
| `HierarchyService` | Exists | Inject `AgentRepository` |

### Phase 3: Dependency Injection Container

Introduce a lightweight DI container (no framework needed):

```typescript
// container.ts
export function createContainer(db: DrizzleDB) {
  // Repositories
  const agentRepo = new AgentRepository(db);
  const companyRepo = new CompanyRepository(db);
  const goalRepo = new GoalRepository(db);
  const taskRepo = new TaskRepository(db);
  const governanceRepo = new GovernanceRepository(db);
  const swarmRepo = new SwarmRepository(db);
  const tokenRepo = new CapabilityTokenRepository(db);
  const heartbeatRepo = new HeartbeatRepository(db);
  const memoryRepo = new MemoryRepository(db);
  const traceRepo = new TraceRepository(db);
  const budgetAlertRepo = new BudgetAlertRepository(db);

  // Services
  const hierarchyService = new HierarchyService(agentRepo);
  const tokenService = new CapabilityTokenService(agentRepo, tokenRepo);
  const governanceService = new GovernanceService(governanceRepo, agentRepo, companyRepo, tokenService, hierarchyService);
  const agentService = new AgentService(agentRepo, tokenService);
  const goalService = new GoalService(goalRepo);
  const taskService = new TaskService(taskRepo);
  const budgetService = new BudgetService(companyRepo, agentRepo, budgetAlertRepo);
  const memoryService = new MemoryService(memoryRepo, agentRepo);
  const traceService = new TraceService(traceRepo);
  const agentPool = new AgentPool(10);
  const heartbeatRunner = new HeartbeatRunner(agentPool, heartbeatRepo, agentRepo, companyRepo);
  const swarmEngine = new SwarmEngine(swarmRepo, agentRepo);
  const heartbeatScheduler = new HeartbeatScheduler(companyRepo, heartbeatRunner);

  return {
    // Expose services for route injection
    agentService, goalService, taskService, budgetService, memoryService,
    traceService, governanceService, tokenService, hierarchyService,
    heartbeatRunner, heartbeatScheduler, swarmEngine,
  };
}

export type Container = ReturnType<typeof createContainer>;
```

Routes become factory functions that receive the container:

```typescript
// routes/agents.ts
export function agentsRouter(container: Container): Router {
  const router = Router();
  const { agentService } = container;
  // ... route definitions using agentService
  return router;
}
```

### Phase 4: Clean Up Global State

| Global | Resolution |
|--------|-----------|
| SSE subscribers (`events.ts`) | Move to `EventBus` class in container. Pass to services that need to broadcast. |
| Circuit breakers (`HeartbeatRunner`) | Already instance-level (good). Ensure HeartbeatRunner is a singleton in the container. |
| Heartbeat scheduler | Move from `app.ts` module-level `start()` to `index.ts` after container creation. |
| Tool registry (`tools.ts`) | Move to config or DB table. Inject via container. |

### Migration Strategy

All phases are additive and non-breaking:

1. **Phase 1** can be done file-by-file. Each repository is introduced and routes are updated one at a time. Old direct-`db` calls are replaced with repository calls.
2. **Phase 2** extracts logic into services while keeping route signatures identical. Each route file is refactored independently.
3. **Phase 3** wires everything together. The container is created in `index.ts` and passed to route factories.
4. **Phase 4** removes globals. This is the only phase that changes `app.ts` structure.

No existing API contracts change. No database migrations required. The refactoring is purely structural.

# Pixel-Agent — Developer Onboarding Plan

## Product Context
Pixel-Agent is a pnpm monorepo platform for managing autonomous agent swarms — with governance, budgeting, task orchestration, and observability. Primary artifact: Express 5 API + PostgreSQL via Drizzle ORM.

---

## Pre-Start Checklist
- [ ] Node.js 20+ installed
- [ ] pnpm installed globally (`npm i -g pnpm`)
- [ ] PostgreSQL instance available (local or hosted)
- [ ] Git access to repository
- [ ] Editor configured (VSCode recommended, TypeScript support)

## Day 1: Environment & Orientation

### 1. Repository Setup (30 min)
```bash
git clone <repo-url>
cd Pixel-Agent
pnpm install
```

### 2. Workspace Architecture (45 min)
Understand the monorepo structure:

| Package | Purpose |
|---------|---------|
| `artifacts/api-server/` | Express 5 REST API (primary) |
| `artifacts/mockup-sandbox/` | UI mockups and prototypes |
| `lib/db/` | Drizzle ORM schema + migrations |
| `lib/api-zod/` | Shared Zod validation schemas |
| `lib/api-client-react/` | React Query client hooks |
| `lib/api-spec/` | OpenAPI specification |

### 3. Run the API Server (15 min)
```bash
cd artifacts/api-server && pnpm dev
```

### 4. Key Files to Read First
1. `CLAUDE.md` — Complete project architecture guide
2. `lib/db/` — Database schema (11 core tables)
3. `artifacts/api-server/src/app.ts` — Express app setup
4. `artifacts/api-server/src/routes/index.ts` — Route aggregation

---

## Week 1: Core Domain Understanding

### Day 2-3: Database Layer
- [ ] Read all table definitions in `lib/db/`
- [ ] Understand the entity relationships:
  - `companies` → root tenant
  - `agents` → hierarchical via `managerId`
  - `goals` → hierarchical via `parentId`
  - `agent_tasks` → task queue with optimistic locking
  - `swarm_runs` → 6-phase lifecycle
- [ ] Run the dev server and explore API endpoints

### Day 4-5: Service Layer
- [ ] Study `SwarmEngine` — 6-phase lifecycle
- [ ] Study `GovernanceService` — capability tokens & approvals
- [ ] Study `HeartbeatRunner` — scheduled per-agent execution
- [ ] Study `CircuitBreaker` — 3-state fault tolerance
- [ ] Study `AgentPool` — controlled concurrency

### Key Patterns to Internalize
| Pattern | Where | Why |
|---------|-------|-----|
| Optimistic Locking | `PATCH /tasks/:taskId` | Prevents concurrent task overwrites |
| 202 Accepted | Heartbeat, Swarm creation | Async processing pattern |
| SSE Stream | `GET /companies/:companyId/events` | Real-time updates |
| ApiError throws | All route handlers | Centralized error handling |

---

## Week 2: First Contributions

### Good First Tasks
- [ ] Add a new field to an existing table + migration
- [ ] Create a new simple endpoint following existing patterns
- [ ] Add Zod validation to an existing route
- [ ] Fix a type error caught by `pnpm typecheck`

### Development Workflow
```bash
# Type-check before pushing
cd artifacts/api-server && pnpm typecheck

# Build to verify
cd artifacts/api-server && pnpm build
```

### Code Review Checklist
- [ ] TypeScript strict mode compliance
- [ ] Zod schemas for request validation
- [ ] ApiError for error responses
- [ ] Proper async/await in route handlers
- [ ] Database schema changes in `lib/db/`

---

## 30-Day Checkpoint
- [ ] Can explain the full agent → swarm → governance flow
- [ ] Has merged 3+ PRs
- [ ] Can run and type-check the project independently
- [ ] Understands the 6-phase swarm lifecycle
- [ ] Has added at least one new route or service method

## 60-Day Checkpoint
- [ ] Can own a feature end-to-end (schema → route → validation)
- [ ] Understands the budgeting and circuit breaker systems
- [ ] Has contributed to the mockup sandbox
- [ ] Can debug API issues using traces/tool_calls tables

## 90-Day Checkpoint
- [ ] Can design and implement new domain features independently
- [ ] Actively reviews others' code
- [ ] Has proposed at least one architectural improvement
- [ ] Ready to mentor newer contributors

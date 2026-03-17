# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pixel-Agent is a pnpm monorepo platform for managing autonomous agent swarms — with governance, budgeting, task orchestration, and observability. The primary artifact is an Express 5 API server backed by PostgreSQL via Drizzle ORM.

## Workspace Structure

```
artifacts/api-server/   — Express 5 REST API (primary artifact)
artifacts/mockup-sandbox/ — UI mockups
lib/db/                 — Drizzle ORM schema + migrations
lib/api-zod/            — Shared Zod validation schemas
lib/api-client-react/   — React Query client hooks
lib/api-spec/           — OpenAPI spec
scripts/                — Utility scripts
```

Packages reference each other as `@workspace/db`, `@workspace/api-zod`, etc.

## Commands

All commands run from the repo root unless otherwise noted.

```bash
# Install dependencies
pnpm install

# Run API server in dev mode (hot reload)
cd artifacts/api-server && pnpm dev

# Type-check the API server
cd artifacts/api-server && pnpm typecheck

# Production build (uses esbuild)
cd artifacts/api-server && pnpm build
```

There is no test runner configured yet. There is no lint script — typecheck (`tsc --noEmit`) is the primary static check.

## Architecture

### API Server (`artifacts/api-server/src/`)

- **`index.ts`** — Entry point; starts HTTP server
- **`app.ts`** — Express app setup, middleware, route mounting
- **`routes/index.ts`** — Aggregates all routers under `/api`
- **`routes/*.ts`** — One file per domain (agents, goals, tasks, swarms, governance, budget, memory, traces, heartbeat, tools, events, companies, heartbeat)
- **`services/`** — Business logic: `SwarmEngine`, `GovernanceService`, `HeartbeatRunner`, `AgentPool`, `CircuitBreaker`, `AgentExecutor`
- **`middlewares/error-handler.ts`** — `ApiError` class, `notFound` and `errorHandler` middleware

### Database Layer (`lib/db/`)

Drizzle ORM with PostgreSQL. 11 core tables:

| Table | Purpose |
|-------|---------|
| `companies` | Multi-tenant root — holds monthly budget and circuit breaker state |
| `agents` | Autonomous agents; hierarchical via `managerId`; track `deskX/Y`, `spriteKey` for UI |
| `goals` | Hierarchical via `parentId`; status flows: proposed → active → completed/cancelled |
| `agent_tasks` | Task queue with `version` field for optimistic locking |
| `governance_requests` | Approval workflows with TTL and expiration |
| `swarm_runs` | Multi-agent orchestration sessions; 6-phase lifecycle |
| `swarm_agents` | Ephemeral agents spawned inside a swarm |
| `swarm_messages` | Inter-agent messages within a swarm |
| `memory_entries` | Agent knowledge base (key-value with category) |
| `tool_calls` | Execution traces with OpenTelemetry-style `traceId/spanId/parentSpanId` |
| `budget_alerts` | Budget violation notifications |

### Key Service Patterns

**SwarmEngine** — 6-phase lifecycle: `proposed → pending_approval → spawning → executing → synthesizing → completed/failed/dissolved/cancelled`. Each phase is a discrete method.

**GovernanceService** — Handles capability tokens (scopes, delegationLevel, maxSpendUsd, expiresAt). Approval actions are dispatched by `requestType`: hire, fire, budget_override, swarm_approval, etc.

**HeartbeatRunner** — Orchestrates scheduled per-agent execution. Each agent gets its own circuit breaker. Budget is checked before execution. Results are stored in `heartbeat_runs` / `heartbeat_agent_runs`.

**AgentPool** — Controlled concurrency for parallel agent execution. Returns `null` for failed items (never throws from the pool level).

**CircuitBreaker** — 3-state (closed → open → half-open). Per-agent instances in HeartbeatRunner.

**AgentExecutor** — Currently a stub. Real LLM execution is not yet implemented.

### Route Conventions

- All routes mount under `/api`
- Async route handlers throw `ApiError(status, message)` — caught by `errorHandler`
- Heartbeat and swarm creation return **202 Accepted** and process asynchronously
- SSE stream at `GET /companies/:companyId/events` — ping every 30s; use `broadcastEvent(companyId, {type, data})` to publish

### Task Optimistic Locking

`PATCH /tasks/:taskId` increments `version`. `POST /tasks/:taskId/claim` checks that the supplied version matches — rejects with 409 if already claimed.

## Shared Libraries

- **`@workspace/api-zod`** — Zod schemas co-located with Drizzle types via `drizzle-zod`. Import these for request validation in routes.
- **`@workspace/db`** — Re-exports Drizzle `db` client and all table definitions. Never define schema outside this package.
- **`@workspace/api-client-react`** — React Query hooks for the API. Only relevant when working on frontend consumers.

## Memory Files (`.memory/`)

`.memory/` files are project memory for AI assistants. They are intentionally empty right now — fill them in as decisions accumulate:

- `.memory/decisions.md` — Architectural commitments
- `.memory/preferences.md` — Style/naming choices
- `.memory/security.md` — Security rules (always read before changing auth/budget/governance code)
- `.memory/quirks.md` — Non-obvious project-specific behaviour
- `.memory/instructions.md` — Behavioural instructions

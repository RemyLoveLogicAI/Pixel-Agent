# Zero-to-Hero Contributor Guide: Pixel-Agent

## 1. What this project does

Pixel-Agent is a TypeScript pnpm monorepo for running autonomous-agent workflows with governance, budgets, task queues, swarm orchestration, and observability. The main runtime is an Express 5 API server backed by PostgreSQL through Drizzle ORM, with shared schema and API packages in `lib/`. (CLAUDE.md:5-21) (artifacts/api-server/package.json:1-29) (lib/db/src/index.ts:1-16)

## 2. Prerequisites

You need Node.js with pnpm, a PostgreSQL database, and the ability to provide `DATABASE_URL` and `PORT` when starting the API server. The repo enforces pnpm at install time, the DB package throws if `DATABASE_URL` is missing, and the API entrypoint throws if `PORT` is missing or invalid. (package.json:5-10) (lib/db/src/index.ts:7-14) (artifacts/api-server/src/index.ts:3-19)

If you prefer containerized local services, the repo already provides a PostgreSQL development service and an API service definition in `docker-compose.yml`. (docker-compose.yml:3-54)

## 3. Environment setup

1. Install dependencies from the repo root:

```bash
cd /Users/lovelogic/Desktop/Pixel-Agent
pnpm install
```

This works because the root workspace exposes the supported install and build commands and rejects non-pnpm installers in `preinstall`. (package.json:5-10)

2. Start PostgreSQL locally with Docker Compose:

```bash
cd /Users/lovelogic/Desktop/Pixel-Agent
docker compose up -d db
```

The compose file creates a `postgres:16-alpine` container with database `pixel_agent` on port `5432`. (docker-compose.yml:5-25)

3. Start the API server in development mode:

```bash
cd /Users/lovelogic/Desktop/Pixel-Agent/artifacts/api-server
DATABASE_URL=postgres://pixel:pixel@localhost:5432/pixel_agent PORT=3000 pnpm dev
```

The package exposes `pnpm dev`, and successful startup logs `Server listening on port 3000` because `index.ts` prints that after `app.listen()`. (artifacts/api-server/package.json:6-10) (artifacts/api-server/src/index.ts:17-18)

4. Verify the server responds:

```bash
curl http://localhost:3000/api/healthz
curl http://localhost:3000/api/readyz
```

Expected responses are `{"status":"ok"}` for `/healthz`, and either `{"status":"ready"}` or a `503` response with `{"status":"not_ready","reason":"database unreachable"}` for `/readyz`, depending on DB connectivity. (artifacts/api-server/src/routes/health.ts:7-23)

5. Run the repo verification commands before you open a PR:

```bash
cd /Users/lovelogic/Desktop/Pixel-Agent
pnpm typecheck
pnpm build
```

Those are the top-level quality gates currently defined by the workspace. (package.json:5-10)

## 4. Project structure

```text
Pixel-Agent/
|- artifacts/
|  |- api-server/          Express 5 REST API, route handlers, and services.
|  `- mockup-sandbox/      UI mockups and Vite-based frontend sandbox.
|- lib/
|  |- db/                  Drizzle schema, Postgres connection, and generated insert schemas.
|  |- api-zod/             Shared Zod-facing API package.
|  |- api-client-react/    React client fetch helpers.
|  `- api-spec/            OpenAPI source of truth.
|- scripts/                Small workspace utility package.
|- docker-compose.yml      Dev Postgres plus hot-reload API stack.
`- k8s/base/               Deployment, config, service, ingress, and autoscaling manifests.
```

This directory map is grounded in the repo guidance and the manifest layout. (CLAUDE.md:9-21) (docker-compose.yml:1-61) (k8s/base/deployment.yml:1-60)

## 5. Your first task

A safe first contribution is to add a small read-only route, because the pattern is already clear in `health.ts`, route registration is centralized in `routes/index.ts`, and API error handling is already standardized. (artifacts/api-server/src/routes/health.ts:1-25) (artifacts/api-server/src/routes/index.ts:1-34) (artifacts/api-server/src/middlewares/error-handler.ts:3-29)

Use this sequence:

1. Create a new route file in `artifacts/api-server/src/routes/`.
2. Export an Express router from that file, following `health.ts` or `companies.ts`.
3. Register the router in `routes/index.ts`.
4. Add the endpoint to `lib/api-spec/openapi.yaml` if you want client-facing contract coverage.
5. Run `pnpm typecheck` and `pnpm build`.

For example, a minimal read-only route can follow this pattern:

```ts
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/version", (_req, res) => {
  res.json({ version: "dev" });
});

export default router;
```

That shape mirrors the style of the existing health route: small router file, explicit response, no hidden framework magic. (artifacts/api-server/src/routes/health.ts:1-25)

## 6. Development workflow

The repo documents the commands you should run, but it does not define a branch naming policy, commit convention, or PR checklist in the files inspected here. What *is* explicit is the verify-before-merge workflow: install with pnpm, type-check, then build. (CLAUDE.md:23-41) (package.json:5-10)

```mermaid
%%{init: {'theme':'base','themeVariables':{'background':'#0d1117','primaryColor':'#1f2937','primaryTextColor':'#e5e7eb','primaryBorderColor':'#60a5fa','lineColor':'#94a3b8','secondaryColor':'#111827','tertiaryColor':'#0f172a'}}}%%
flowchart LR
    Edit[Edit route or service]
    Register[Register route or schema]
    Typecheck[pnpm typecheck]
    Build[pnpm build]
    Smoke[curl healthz or endpoint]

    Edit --> Register --> Typecheck --> Build --> Smoke
```

This workflow reflects the actual script surface and runtime verification endpoints in the repo. (package.json:5-10) (artifacts/api-server/src/routes/health.ts:7-23)

## 7. Running tests

There is currently no dedicated test runner and no lint script. The documented static verification path is TypeScript type-checking, and the workspace build is the next gate after that. (CLAUDE.md:23-41) (artifacts/api-server/package.json:6-10)

Use:

```bash
cd /Users/lovelogic/Desktop/Pixel-Agent
pnpm typecheck
pnpm build
```

When you change HTTP behavior, also smoke-test the affected endpoint with `curl` because the repo exposes production-style handlers for `/healthz`, `/readyz`, and `/metrics`. (artifacts/api-server/src/routes/health.ts:7-23) (artifacts/api-server/src/routes/metrics.ts:6-14)

## 8. Debugging guide

If the server fails before boot, check environment variables first. Missing `PORT` will crash in `index.ts`, and missing `DATABASE_URL` will crash in the shared DB package during import. (artifacts/api-server/src/index.ts:3-15) (lib/db/src/index.ts:7-10)

If a request returns JSON `{ error: ... }`, that probably came from `ApiError`; if it returns `{ error: "Internal server error" }`, that means an unexpected exception escaped the route and was logged by the global error handler. (artifacts/api-server/src/middlewares/error-handler.ts:17-29)

If a heartbeat-run change behaves strangely, inspect three layers: company state, agent state, and DLQ rows. The runner can block on company circuit state, block on budgets, or move agents to `circuit_open` after repeated dead-letter retries. (artifacts/api-server/src/services/heartbeatRunner.ts:60-91) (artifacts/api-server/src/services/heartbeatRunner.ts:206-275) (artifacts/api-server/src/services/heartbeatRunner.ts:279-407)

If real-time UI updates are missing, remember the event system is in-memory SSE. Restarting the API process clears subscribers, and there is no external broker to replay missed events. (artifacts/api-server/src/routes/events.ts:3-17) (artifacts/api-server/src/routes/events.ts:21-52)

## 9. Key concepts

**Company** is the tenancy root and budget owner. Most routes are nested under `/companies/:companyId/...`, and the `companies` table holds the global monthly budget and company-level circuit breaker. (lib/db/src/schema/companies.ts:5-16) (artifacts/api-server/src/routes/companies.ts:8-76)

**Agent** is a hierarchical worker with a level, manager, budget, tools, and heartbeat cadence. That hierarchy is central to both governance and delegation. (lib/db/src/schema/agents.ts:6-32) (artifacts/api-server/src/services/hierarchyService.ts:64-112)

**Swarm** is a short-lived orchestration run, not a permanent actor. Swarms move through phases, spawn ephemeral swarm agents, publish messages, and eventually archive synthesis into memory. (artifacts/api-server/src/services/swarmEngine.ts:53-155) (artifacts/api-server/src/services/swarmEngine.ts:159-350)

**Capability token** is the authorization unit. It defines scopes, delegation depth, and expiry, and verification checks live DB state instead of trusting only the cached agent snapshot. (artifacts/api-server/src/services/capabilityTokenService.ts:29-106) (artifacts/api-server/src/services/capabilityTokenService.ts:112-143)

## 10. Code patterns

### Pattern: validating and inserting from shared schema

Routes usually create IDs at the edge, pass request bodies through a Zod schema generated from the DB table, and only then call `db.insert()`. Use `companies.ts` and `tasks.ts` as the pattern to copy. (artifacts/api-server/src/routes/companies.ts:17-27) (artifacts/api-server/src/routes/tasks.ts:35-47)

### Pattern: asynchronous orchestration endpoint

Swarm routes do the minimal HTTP work, return `202`, and push the long-running lifecycle into a service. Follow that pattern for any expensive background workflow. (artifacts/api-server/src/routes/swarms.ts:32-60) (artifacts/api-server/src/routes/swarms.ts:113-141)

### Pattern: optimistic locking for claims

If you need race-safe state transitions, copy the task-claim shape: read the current row, compare the version, then include the version in the update predicate. (artifacts/api-server/src/routes/tasks.ts:84-119)

### Pattern: typed error propagation on the client

Frontend consumers should use the generated client fetch layer, which parses error bodies and throws a typed `ApiError` with status, headers, request method, and URL. (lib/api-client-react/src/custom-fetch.ts:100-149)

## 11. Common pitfalls

- **Using npm instead of pnpm.** The root `preinstall` rejects non-pnpm user agents. (package.json:5-7)
- **Forgetting `DATABASE_URL` or `PORT`.** Both are hard runtime requirements for the API path. (lib/db/src/index.ts:7-10) (artifacts/api-server/src/index.ts:3-15)
- **Assuming tests exist.** The current repo relies on type-checking and build verification instead. (CLAUDE.md:41-41) (package.json:7-9)
- **Treating SSE as durable infrastructure.** The current event bus is a process-local map, so it has no persistence or cross-instance fan-out. (artifacts/api-server/src/routes/events.ts:3-17)
- **Expecting real LLM behavior.** The current agent executor and swarm execution path are still stubbed. (artifacts/api-server/src/services/agentExecutor.ts:1-17) (artifacts/api-server/src/services/swarmEngine.ts:248-255)

## 12. Where to get help

Inside the repo, start with `CLAUDE.md` for the intended architecture and command surface, then cross-check against the actual route, service, and schema files because `_docs/README.md` currently describes a different product. (CLAUDE.md:5-41) (_docs/README.md:15-35) (artifacts/api-server/src/app.ts:1-21)

There are no team chat channels, escalation contacts, or PR policies documented in the inspected files, so if you need human guidance you should ask the maintainers directly outside the repo before making broad architectural changes. (CLAUDE.md:1-111) (_docs/README.md:111-138)

## 13. Glossary

- **DLQ**: dead-letter queue for failed heartbeat executions. (artifacts/api-server/src/services/heartbeatRunner.ts:279-407)
- **Heartbeat run**: a scheduled or manual pass over due agents for one company. (artifacts/api-server/src/services/heartbeatRunner.ts:56-198)
- **Capability token**: DB-backed authorization grant with scopes and expiry. (artifacts/api-server/src/services/capabilityTokenService.ts:29-143)
- **Delegation depth**: how far authority can be passed down the management tree. (lib/db/src/schema/agents.ts:27-28) (artifacts/api-server/src/services/hierarchyService.ts:90-96)
- **Swarm phase**: the current lifecycle step for a swarm run, from proposal through completion or failure. (artifacts/api-server/src/services/swarmEngine.ts:53-155)

## 14. Quick reference card

### Most-used commands

```bash
cd /Users/lovelogic/Desktop/Pixel-Agent
pnpm install
pnpm typecheck
pnpm build
pnpm hyper-swarm
```

These commands come from the root workspace scripts. (package.json:5-10)

```bash
cd /Users/lovelogic/Desktop/Pixel-Agent/artifacts/api-server
DATABASE_URL=postgres://pixel:pixel@localhost:5432/pixel_agent PORT=3000 pnpm dev
```

This is the direct package-level development command for the API server. (artifacts/api-server/package.json:6-10) (artifacts/api-server/src/index.ts:3-19)

### Most useful endpoints

```bash
curl http://localhost:3000/api/healthz
curl http://localhost:3000/api/readyz
curl http://localhost:3000/api/metrics
```

Those routes are implemented directly in the API server today. (artifacts/api-server/src/routes/health.ts:7-23) (artifacts/api-server/src/routes/metrics.ts:11-14)

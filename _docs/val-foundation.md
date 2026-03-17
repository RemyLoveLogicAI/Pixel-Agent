# Validation Contract — Foundation Area

> Mission: AgentClipboard · Milestone: Foundation
> Generated: 2026-03-17

---

## 1 · Auth Middleware

### VAL-FOUND-001: Bearer token accepted when valid
When `REQUIRE_AUTH=true` and `API_KEY` is set, a request with `Authorization: Bearer <correct-key>` and a valid `X-Tenant-Id` header receives a 2xx response from any protected endpoint (e.g., `GET /api/companies`).
**Pass:** 2xx status returned with expected body.
**Fail:** 401/403 or connection error.
**Evidence:** HTTP response status + body from `curl` or Vitest `supertest` call with correct Bearer token.

### VAL-FOUND-002: Missing Authorization header returns 401
When `REQUIRE_AUTH=true`, a request with no `Authorization` header is rejected.
**Pass:** Response status is `401` with body `{ "error": "Unauthorized" }`.
**Fail:** Any other status code.
**Evidence:** HTTP response status + JSON body.

### VAL-FOUND-003: Malformed Authorization header returns 401
When `REQUIRE_AUTH=true`, a request with `Authorization: Basic abc123` (wrong scheme) or `Authorization: Bearer` (missing token) is rejected.
**Pass:** Response status is `401`.
**Fail:** Any non-401 status.
**Evidence:** HTTP response for at least two malformed variants (wrong scheme, missing token after Bearer).

### VAL-FOUND-004: Invalid Bearer token returns 401
When `REQUIRE_AUTH=true`, a request with `Authorization: Bearer wrong-token` is rejected.
**Pass:** Response status is `401`.
**Fail:** Any non-401 status.
**Evidence:** HTTP response status + body.

### VAL-FOUND-005: Missing X-Tenant-Id with valid token returns 401
When `REQUIRE_AUTH=true`, a request carries a valid Bearer token but omits the `X-Tenant-Id` header.
**Pass:** Response status is `401` with body mentioning `X-Tenant-Id`.
**Fail:** Any non-401 status.
**Evidence:** HTTP response status + body.

### VAL-FOUND-006: Tenant isolation — cross-tenant access returns 403
A request with `X-Tenant-Id: tenant-A` attempts to access `GET /api/companies/tenant-B/agents`. The `tenantGuard` middleware rejects the mismatch.
**Pass:** Response status is `403` with body `{ "error": "Forbidden: tenant mismatch" }`.
**Fail:** Any non-403 status or data leakage.
**Evidence:** HTTP response status + body for a cross-tenant route.

### VAL-FOUND-007: Tenant guard is no-op when auth is not enforced
When `REQUIRE_AUTH` is unset or `"false"`, a request without `X-Tenant-Id` can still reach `GET /api/companies/:companyId/agents` and receive data.
**Pass:** 2xx response with valid data.
**Fail:** 401 or 403.
**Evidence:** HTTP response demonstrating that the guard is skipped.

### VAL-FOUND-008: authenticate and tenantGuard wired into app.ts
The `authenticate` middleware is registered globally (via `app.use`) before the router. The `tenantGuard` middleware is applied to all routes that contain a `:companyId` parameter.
**Pass:** `app.ts` imports both middlewares and registers them before `app.use("/api", router)`. A request flow confirms both are invoked (via 401/403 behavior tested above).
**Fail:** Middlewares are imported but never used, or are registered after the router.
**Evidence:** Source inspection of `app.ts` showing `app.use(authenticate)` and either global or per-router `tenantGuard` registration.

### VAL-FOUND-009: Server throws 500 when API_KEY missing but REQUIRE_AUTH=true
When `REQUIRE_AUTH=true` and `API_KEY` env var is unset, any authenticated request returns 500 with "Server misconfiguration" message.
**Pass:** Response status `500`, body contains "Server misconfiguration".
**Fail:** Silent bypass or different error.
**Evidence:** HTTP response when API_KEY is deliberately unset.

---

## 2 · Test Infrastructure (Vitest)

### VAL-FOUND-010: Vitest installed as dev dependency
`vitest` appears in `devDependencies` of the root `package.json` or the relevant workspace package(s).
**Pass:** `pnpm why vitest` resolves successfully.
**Fail:** Package not found.
**Evidence:** Output of `pnpm why vitest` or `package.json` excerpt.

### VAL-FOUND-011: Vitest config file exists
A `vitest.config.ts` (or `vite.config.ts` with Vitest `test` block) exists at the API server workspace root and/or the repository root.
**Pass:** File exists and contains valid Vitest configuration (e.g., `defineConfig` with `test` key or `defineProject`).
**Fail:** File missing or invalid.
**Evidence:** File path and content excerpt.

### VAL-FOUND-012: `pnpm test` script runs Vitest
A `test` script is defined in `package.json` (root or `artifacts/api-server`) that invokes `vitest`.
**Pass:** `pnpm test` (or `pnpm --filter @workspace/api-server test`) exits 0 when no tests fail.
**Fail:** Script missing, or exits with "command not found".
**Evidence:** Terminal output of `pnpm test`.

### VAL-FOUND-013: At least one passing smoke test exists
A test file (e.g., `*.test.ts` or `*.spec.ts`) exists and runs successfully under Vitest.
**Pass:** `vitest run` reports ≥1 passed test, 0 failed.
**Fail:** No test files found, or test fails.
**Evidence:** Vitest run output showing pass count.

### VAL-FOUND-014: Vitest configured for TypeScript path aliases
Vitest resolves the same path aliases used in the project (`@workspace/*`, `@/` etc.) without compilation errors.
**Pass:** A test importing from a workspace alias (e.g., `@workspace/db`) compiles and runs.
**Fail:** Module resolution error.
**Evidence:** Vitest output for a test that imports workspace packages.

### VAL-FOUND-015: Test coverage reporting is available
Vitest is configured with a coverage provider (e.g., `@vitest/coverage-v8` or `@vitest/coverage-istanbul`) so that `pnpm test -- --coverage` produces a coverage report.
**Pass:** Coverage report generated (text or HTML) showing file-level coverage.
**Fail:** Error about missing coverage provider or no output.
**Evidence:** Terminal output or coverage report screenshot.

---

## 3 · Seed Data

### VAL-FOUND-016: Seed script exists and is runnable
A seed script (e.g., `scripts/seed.ts` or `pnpm seed` command) exists and can be executed.
**Pass:** Running the seed command completes without error and outputs confirmation.
**Fail:** Script missing, crashes, or connection error.
**Evidence:** Terminal output of seed command execution.

### VAL-FOUND-017: Seed creates at least one company
After seeding, `SELECT * FROM companies` returns ≥1 row.
**Pass:** Query returns rows with realistic `name`, `mission`, and valid `status`.
**Fail:** Empty result set.
**Evidence:** SQL query result or API response from `GET /api/companies`.

### VAL-FOUND-018: Seed creates agents with hierarchy
After seeding, agents exist with varying `level` values and at least one agent has a non-null `managerId` referencing another agent.
**Pass:** `SELECT id, name, level, manager_id FROM agents` shows hierarchical data.
**Fail:** No agents, or all `manager_id` values are null.
**Evidence:** Query result showing parent-child agent relationships.

### VAL-FOUND-019: Seed creates goals with hierarchy
After seeding, goals exist and at least one goal has a non-null `parentId` forming a tree.
**Pass:** `SELECT id, title, parent_id FROM goals` shows hierarchical data.
**Fail:** No goals or flat structure.
**Evidence:** Query result.

### VAL-FOUND-020: Seed creates tasks in various statuses
After seeding, `agent_tasks` rows exist across multiple statuses (at least `pending`, `claimed`, `done`).
**Pass:** `SELECT status, count(*) FROM agent_tasks GROUP BY status` shows ≥3 distinct statuses.
**Fail:** All tasks in same status or none exist.
**Evidence:** Aggregated query result.

### VAL-FOUND-021: Seed data is idempotent
Running the seed script twice does not cause unique-constraint violations or duplicate data.
**Pass:** Second run completes without error; row counts remain stable or script uses upsert/truncate.
**Fail:** Duplicate key error on second run.
**Evidence:** Terminal output of two consecutive seed runs.

### VAL-FOUND-022: Seed creates realistic display-ready data
Seeded agents have non-empty `name`, `role`, `title`, `spriteKey`, and valid `deskX`/`deskY` coordinates for the UI canvas. Company has non-empty `mission`.
**Pass:** All display fields are populated with plausible values (not "test-1", "asdf").
**Fail:** Empty or placeholder-only values.
**Evidence:** Sample rows from agents and companies tables.

### VAL-FOUND-023: Seed creates governance and swarm data
After seeding, at least one `governance_requests` row and one `swarm_runs` row exist to populate the Governance Queue and Swarm Control screens.
**Pass:** Both tables return ≥1 row.
**Fail:** Either table is empty.
**Evidence:** Query results from both tables.

### VAL-FOUND-024: Seed creates memory entries
After seeding, `memory_entries` has ≥1 row with a valid `category` and `value`.
**Pass:** Rows exist with populated fields.
**Fail:** Table empty.
**Evidence:** Query result.

---

## 4 · DB Indexes

### VAL-FOUND-025: Index on agents.company_id
An index exists on `agents.company_id` to accelerate `WHERE company_id = ?` queries used in `GET /api/companies/:companyId/agents`.
**Pass:** `\d agents` (or Drizzle schema inspection) shows an index on `company_id`.
**Fail:** No such index.
**Evidence:** `pg_indexes` query or Drizzle schema showing `.index()`.

### VAL-FOUND-026: Index on agent_tasks.company_id
An index exists on `agent_tasks.company_id` to accelerate filtered task listing.
**Pass:** Index present on `company_id`.
**Fail:** Missing.
**Evidence:** Schema or `pg_indexes` output.

### VAL-FOUND-027: Index on agent_tasks.status
An index exists on `agent_tasks.status` (or a composite including status) to accelerate `WHERE status = 'pending'` queries for task claiming.
**Pass:** Index present.
**Fail:** Missing.
**Evidence:** Schema or `pg_indexes` output.

### VAL-FOUND-028: Index on goals.company_id
An index exists on `goals.company_id`.
**Pass:** Index present.
**Fail:** Missing.
**Evidence:** Schema or `pg_indexes` output.

### VAL-FOUND-029: Index on goals.parent_id
An index exists on `goals.parent_id` to accelerate tree traversal queries.
**Pass:** Index present.
**Fail:** Missing.
**Evidence:** Schema or `pg_indexes` output.

### VAL-FOUND-030: Index on swarm_runs.company_id
An index exists on `swarm_runs.company_id`.
**Pass:** Index present.
**Fail:** Missing.
**Evidence:** Schema or `pg_indexes` output.

### VAL-FOUND-031: Index on governance_requests.company_id
An index exists on `governance_requests.company_id`.
**Pass:** Index present.
**Fail:** Missing.
**Evidence:** Schema or `pg_indexes` output.

### VAL-FOUND-032: Index on tool_calls.trace_id
An index exists on `tool_calls.trace_id` (and optionally `span_id`) to accelerate trace waterfall queries.
**Pass:** Index on `trace_id` present.
**Fail:** Missing.
**Evidence:** Schema or `pg_indexes` output.

### VAL-FOUND-033: Index on heartbeat_agent_runs.run_id
An index exists on `heartbeat_agent_runs.run_id` to accelerate drill-down from heartbeat run to agent-level results.
**Pass:** Index present.
**Fail:** Missing.
**Evidence:** Schema or `pg_indexes` output.

### VAL-FOUND-034: Index on swarm_messages.swarm_run_id
An index exists on `swarm_messages.swarm_run_id` to accelerate message listing per swarm.
**Pass:** Index present.
**Fail:** Missing.
**Evidence:** Schema or `pg_indexes` output.

### VAL-FOUND-035: Index on memory_entries.agent_id
An index exists on `memory_entries.agent_id` (or composite with `category`) for memory lookups.
**Pass:** Index present.
**Fail:** Missing.
**Evidence:** Schema or `pg_indexes` output.

### VAL-FOUND-036: Indexes declared in Drizzle schema
All indexes are defined in the Drizzle `pgTable` definitions (not raw SQL migrations) so they are version-controlled and migratable.
**Pass:** Schema files in `lib/db/src/schema/` use `.index()` or the table's `indexes` option.
**Fail:** Indexes exist only in raw SQL or not at all.
**Evidence:** Source code excerpts from schema files.

---

## 5 · Environment Config

### VAL-FOUND-037: .env.example file exists
A `.env.example` (or `.env.template`) file exists at the project root documenting all required environment variables.
**Pass:** File exists and lists at least `DATABASE_URL`, `PORT`, `API_KEY`, `REQUIRE_AUTH`.
**Fail:** File missing.
**Evidence:** File contents.

### VAL-FOUND-038: DATABASE_URL validation on startup
When `DATABASE_URL` is missing, the server process exits with a clear error message (currently enforced in `lib/db/src/index.ts`).
**Pass:** Process exits with "DATABASE_URL must be set" error.
**Fail:** Silent failure or cryptic error.
**Evidence:** Terminal output when DATABASE_URL is unset.

### VAL-FOUND-039: PORT validation on startup
When `PORT` is missing or invalid (e.g., `"abc"`), the server process exits with a descriptive error.
**Pass:** Process exits with "PORT environment variable is required" or "Invalid PORT value" error.
**Fail:** Server starts on undefined port or crashes with unrelated error.
**Evidence:** Terminal output for missing and invalid PORT values.

### VAL-FOUND-040: .env file loaded automatically in dev
A mechanism (e.g., `dotenv`, `tsx --env-file`, or Vite's built-in .env loading) loads `.env` automatically during development.
**Pass:** Starting the dev server with a `.env` file present picks up the variables without manual `export`.
**Fail:** Must manually export vars or server crashes.
**Evidence:** Dev server startup log showing loaded config or working connection.

### VAL-FOUND-041: .env is gitignored
`.env` is listed in `.gitignore` to prevent secret leakage.
**Pass:** `.gitignore` contains `.env` entry; `git status` does not show `.env` as tracked.
**Fail:** `.env` is tracked or not in gitignore.
**Evidence:** `.gitignore` content and `git status` output.

### VAL-FOUND-042: All required env vars documented
The `.env.example` file includes comments or descriptions for each variable: `DATABASE_URL`, `PORT`, `API_KEY`, `REQUIRE_AUTH`, and any others (e.g., `NODE_ENV`).
**Pass:** Each variable has an inline comment or section header explaining its purpose and valid values.
**Fail:** Bare keys with no guidance.
**Evidence:** File content excerpt.

---

## 6 · OpenAPI Codegen

### VAL-FOUND-043: Orval generates React Query hooks for ALL endpoints
Running `pnpm --filter @workspace/api-spec generate` (or equivalent orval command) produces hooks for every `operationId` in `openapi.yaml`, not just `healthCheck`.
**Pass:** Generated output in `lib/api-client-react/src/generated/` contains functions for `listCompanies`, `createCompany`, `getAgent`, `listTasks`, `triggerHeartbeat`, `launchSwarm`, `listGovernanceRequests`, `streamEvents`, etc. (all 40+ operations).
**Fail:** Only `healthCheck` hook generated, or generation errors.
**Evidence:** `ls` of generated directory + `grep operationId` count matching OpenAPI spec count.

### VAL-FOUND-044: Generated hooks include mutation hooks
POST/PUT/PATCH/DELETE operations generate `useMutation`-based hooks (not just `useQuery`).
**Pass:** `createCompany`, `createAgent`, `approveGovernanceRequest`, `claimTask`, `launchSwarm` etc. generate mutation hooks using `useMutation`.
**Fail:** Only query hooks generated for read operations.
**Evidence:** Generated code showing `useMutation` imports and hook definitions.

### VAL-FOUND-045: Zod schemas generated for all request/response types
Running orval's zod target produces Zod schemas in `lib/api-zod/src/generated/` for all OpenAPI component schemas.
**Pass:** Generated files contain Zod schemas for `Company`, `Agent`, `Goal`, `AgentTask`, `SwarmRun`, `GovernanceRequest`, etc.
**Fail:** Only `HealthStatus` schema generated.
**Evidence:** `ls` of zod generated directory + schema names.

### VAL-FOUND-046: Generated code compiles without errors
After codegen, `pnpm typecheck` passes for both `@workspace/api-client-react` and `@workspace/api-zod`.
**Pass:** `tsc --noEmit` exits 0 for both packages.
**Fail:** Type errors in generated code.
**Evidence:** Typecheck output.

### VAL-FOUND-047: custom-fetch mutator is correctly referenced
Generated hooks use the `customFetch` mutator from `lib/api-client-react/src/custom-fetch.ts` (as configured in `orval.config.ts`).
**Pass:** Generated hook files import `customFetch` and use it in fetch calls.
**Fail:** Hooks use raw `fetch` or import path is broken.
**Evidence:** Import statement in generated file.

### VAL-FOUND-048: Codegen script is documented and repeatable
A `generate` (or equivalent) script exists in `package.json` so that codegen can be re-run after OpenAPI spec changes.
**Pass:** `pnpm --filter @workspace/api-spec generate` or similar command regenerates all hooks and schemas.
**Fail:** No script; must manually run orval CLI.
**Evidence:** `package.json` script entry + successful re-run output.

---

## 7 · React Router Setup

### VAL-FOUND-049: react-router-dom installed in mockup-sandbox
`react-router-dom` (or `react-router` v7+) is listed in `devDependencies` or `dependencies` of `artifacts/mockup-sandbox/package.json`.
**Pass:** Package present in dependency list.
**Fail:** Not installed.
**Evidence:** `package.json` excerpt.

### VAL-FOUND-050: BrowserRouter (or RouterProvider) wraps the app
`main.tsx` or `App.tsx` sets up a `BrowserRouter`, `RouterProvider`, or equivalent router wrapper at the top level.
**Pass:** Router component wraps the entire application tree.
**Fail:** No router wrapper; raw component rendering.
**Evidence:** Source code of `main.tsx` or `App.tsx`.

### VAL-FOUND-051: Route for Overview (/overview or /)
A route exists that renders the `CompanyDashboard` (Overview) screen.
**Pass:** Navigating to the route displays the Overview/CompanyDashboard component.
**Fail:** 404 or blank page.
**Evidence:** Route definition in source + browser navigation confirmation.

### VAL-FOUND-052: Route for Agents (/agents)
A route exists that renders the `AgentRoster` screen.
**Pass:** `/agents` renders AgentRoster.
**Fail:** Route missing.
**Evidence:** Route definition.

### VAL-FOUND-053: Route for Org Chart (/orgchart)
A route exists that renders the `OrgChart` screen.
**Pass:** `/orgchart` renders OrgChart.
**Fail:** Route missing.
**Evidence:** Route definition.

### VAL-FOUND-054: Route for Goals (/goals)
A route exists that renders the `GoalsTree` screen.
**Pass:** `/goals` renders GoalsTree.
**Fail:** Route missing.
**Evidence:** Route definition.

### VAL-FOUND-055: Route for Tasks (/tasks)
A route exists that renders the `TaskBoard` screen.
**Pass:** `/tasks` renders TaskBoard.
**Fail:** Route missing.
**Evidence:** Route definition.

### VAL-FOUND-056: Route for Swarms (/swarms)
A route exists that renders the `SwarmControl` screen.
**Pass:** `/swarms` renders SwarmControl.
**Fail:** Route missing.
**Evidence:** Route definition.

### VAL-FOUND-057: Route for Heartbeat (/heartbeat)
A route exists that renders the `HeartbeatPanel` screen.
**Pass:** `/heartbeat` renders HeartbeatPanel.
**Fail:** Route missing.
**Evidence:** Route definition.

### VAL-FOUND-058: Route for Governance (/governance)
A route exists that renders the `GovernanceQueue` screen.
**Pass:** `/governance` renders GovernanceQueue.
**Fail:** Route missing.
**Evidence:** Route definition.

### VAL-FOUND-059: Route for Budget (/budget)
A route exists that renders the `BudgetDashboard` screen.
**Pass:** `/budget` renders BudgetDashboard.
**Fail:** Route missing.
**Evidence:** Route definition.

### VAL-FOUND-060: Shell sidebar navigation uses router links
Sidebar `NavItem` clicks use `<Link to="...">` (or `<NavLink>`) from react-router instead of local `useState`-based screen switching.
**Pass:** Shell sidebar items are `<Link>` or `<NavLink>` elements; clicking them updates the browser URL.
**Fail:** Sidebar uses `onClick` + `setState` without URL changes.
**Evidence:** Source code showing `<Link>` usage in Shell sidebar.

### VAL-FOUND-061: Active sidebar item highlighted based on current route
The currently active route is reflected in the sidebar via active styling (e.g., `NavLink`'s `isActive` or route-matched class).
**Pass:** Navigating to `/agents` highlights the "Agents" sidebar item.
**Fail:** No visual indication of active route.
**Evidence:** Source code showing active class logic tied to router state.

### VAL-FOUND-062: Shell layout wraps all routes
The `Shell` component (sidebar + top bar) is a layout route that wraps all child page routes, so the sidebar persists across navigation.
**Pass:** Shell is rendered as a layout/parent route with an `<Outlet />` for child content.
**Fail:** Shell is duplicated per page or absent on some routes.
**Evidence:** Route tree definition showing Shell as layout.

### VAL-FOUND-063: Unknown routes show 404 or redirect
Navigating to an undefined path (e.g., `/nonexistent`) either shows a 404 page or redirects to a default route.
**Pass:** Unmatched path handled gracefully.
**Fail:** Blank page or React error.
**Evidence:** Browser navigation to unknown path.

### VAL-FOUND-064: Browser back/forward navigation works
Clicking sidebar items and then using browser back/forward buttons correctly navigates between pages.
**Pass:** History navigation renders the correct component for each URL.
**Fail:** Page does not update on back/forward.
**Evidence:** Manual or automated browser test demonstrating history navigation.

### VAL-FOUND-065: Preview route (/preview/*) still functions
The existing preview route (`/preview/:componentPath`) used by the mockup sandbox continues to work alongside the new Shell routes.
**Pass:** `/preview/CompanyDashboard` still renders the component preview.
**Fail:** Preview route broken by new routing setup.
**Evidence:** Browser navigation to a preview path.

---

*Total assertions: 65 (VAL-FOUND-001 through VAL-FOUND-065)*

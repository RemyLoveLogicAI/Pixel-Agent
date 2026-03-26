# TypeScript Standards

Reviewed: 2026-03-15

---

## 1. Branded Types for Domain IDs

All entity IDs are currently `string`. This allows accidentally passing an `agentId` where a `companyId` is expected. Use branded types to make this a compile-time error.

### Recommended pattern

Define in `lib/db/src/branded.ts`:

```ts
declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type CompanyId = Brand<string, "CompanyId">;
export type AgentId = Brand<string, "AgentId">;
export type GoalId = Brand<string, "GoalId">;
export type TaskId = Brand<string, "TaskId">;
export type SwarmRunId = Brand<string, "SwarmRunId">;
export type SwarmAgentId = Brand<string, "SwarmAgentId">;
export type HeartbeatRunId = Brand<string, "HeartbeatRunId">;
export type GovernanceRequestId = Brand<string, "GovernanceRequestId">;
export type CapabilityTokenId = Brand<string, "CapabilityTokenId">;
export type ToolCallId = Brand<string, "ToolCallId">;
export type MemoryEntryId = Brand<string, "MemoryEntryId">;
export type BudgetAlertId = Brand<string, "BudgetAlertId">;
export type TraceId = Brand<string, "TraceId">;
export type SpanId = Brand<string, "SpanId">;

// Constructor helpers (cast at system boundaries only)
export const CompanyId = (id: string) => id as CompanyId;
export const AgentId = (id: string) => id as AgentId;
// ...etc
```

Usage in route handlers:

```ts
const companyId = CompanyId(req.params.companyId);
const agentId = AgentId(req.params.agentId);
// Compiler rejects: someFunction(agentId) where CompanyId is expected
```

### Migration path

1. Define branded types in `@workspace/db`
2. Update schema inferred types to use branded IDs (via Drizzle's `.$type<>()`)
3. Update service signatures one file at a time
4. Add branded casts at route handler boundaries (req.params)

---

## 2. Stricter tsconfig Options

The base `tsconfig.base.json` has several strictness gaps.

### Enable immediately

```jsonc
{
  "compilerOptions": {
    // Currently false -- allows unsound function argument types
    "strictFunctionTypes": true,

    // Currently false -- misses accidental overrides in subclasses
    "noImplicitOverride": true,

    // Currently false -- dead code signal
    "noUnusedLocals": true,

    // Not set -- catches unused function parameters
    "noUnusedParameters": true,

    // Not set -- catches incomplete switch statements on union types
    "noUncheckedIndexedAccess": true,

    // Not set -- prevents importing JSON without resolveJsonModule
    "resolveJsonModule": true,

    // Not set -- enforces consistent casing in imports (catches bugs on case-insensitive OS)
    "forceConsistentCasingInFileNames": true,

    // Not set -- prevents fallthrough between switch cases (already have noFallthroughCasesInSwitch)
    // Consider also enabling:
    "exactOptionalPropertyTypes": true
  }
}
```

### Rationale for key flags

**`strictFunctionTypes: true`** -- Currently `false`. This is a significant type-safety hole. With `false`, the compiler allows `(base: Base) => void` to be assigned where `(derived: Derived) => void` is expected, which is unsound. The only reason to keep it `false` is compatibility with legacy callback patterns (e.g., DOM event handlers), which is not relevant to a Node.js API server.

**`noUncheckedIndexedAccess: true`** -- Array element access (`arr[0]`) and object index signatures currently return `T` instead of `T | undefined`. This masks bugs like the destructuring pattern `const [row] = await db.select()...` which could silently be `undefined`.

**`exactOptionalPropertyTypes: true`** -- Prevents assigning `undefined` to optional properties that were not declared with `| undefined`. Enable after auditing existing code.

---

## 3. Project References Configuration

The monorepo already uses `references` in `artifacts/api-server/tsconfig.json`, and `lib/db/tsconfig.json` has `composite: true`. Extend this properly.

### Root tsconfig.json (create if missing)

```jsonc
// tsconfig.json (root -- build orchestration only)
{
  "files": [],
  "references": [
    { "path": "lib/db" },
    { "path": "lib/api-zod" },
    { "path": "lib/api-spec" },
    { "path": "lib/api-client-react" },
    { "path": "artifacts/api-server" },
    { "path": "artifacts/mockup-sandbox" }
  ]
}
```

### Every workspace package needs

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,         // required for project references
    "declarationMap": true,    // enables go-to-definition across packages
    "outDir": "dist",
    "rootDir": "src"
  },
  "references": [
    // list workspace dependencies here
  ]
}
```

### Build command

```bash
# Incremental build respecting dependency graph
pnpm exec tsc --build --verbose
```

Add to root `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --build",
    "typecheck:clean": "tsc --build --clean && tsc --build"
  }
}
```

### Missing: `lib/api-zod/tsconfig.json` should reference `lib/db`

Since `@workspace/api-zod` imports from `@workspace/db`, it must declare the reference.

---

## 4. Type Safety Patterns to Follow

### 4.1 Exhaustive switch/union handling

Use `never` assertion for exhaustive checks on discriminated unions:

```ts
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

switch (agent.status) {
  case "idle": /* ... */ break;
  case "thinking": /* ... */ break;
  // ...all other cases...
  default: assertNever(agent.status);
}
```

This breaks at compile time when a new enum value is added to the schema.

### 4.2 Narrow `req.body` and `req.query` at route boundaries

Currently route handlers cast `req.body` with `as` (e.g., `req.body as { agentId: string; version: number }`). Instead, validate with Zod at the boundary and infer the type:

```ts
const claimBody = z.object({ agentId: z.string(), version: z.number().int() });

router.post("/tasks/:taskId/claim", async (req, res, next) => {
  const parsed = claimBody.safeParse(req.body);
  if (!parsed.success) return next(new ApiError(400, parsed.error.message));
  const { agentId, version } = parsed.data; // fully typed, validated
});
```

### 4.3 Avoid `any` in JSON columns

Several schema files use `jsonb("column")` without a type annotation, which defaults to `unknown`. Some use `.$type<string[]>()` which is good. Apply `.$type<T>()` to all JSONB columns with a defined Zod schema for the shape:

```ts
const specialistRoleSchema = z.array(z.object({ role: z.string(), count: z.number() }));
type SpecialistRole = z.infer<typeof specialistRoleSchema>;

specialistRoles: jsonb("specialist_roles").$type<SpecialistRole[]>(),
```

### 4.4 Avoid `as any` casts

The codebase has `as any` in places like `swarmEngine.ts` line 105 (`swarm.specialistRoles as any[]`) and line 239 (`synthesisResult as any`). Each of these is a type-safety escape hatch. Fix by typing the JSONB columns properly (see 4.3).

### 4.5 Use `satisfies` for constant objects

When defining configuration or enum maps, use `satisfies` to get both inference and validation:

```ts
const PHASE_ORDER = {
  proposed: 0,
  pending_approval: 1,
  spawning: 2,
  executing: 3,
  synthesizing: 4,
  completed: 5,
} satisfies Record<string, number>;
```

### 4.6 Prefer `unknown` over `any` for error catches

The codebase already uses `useUnknownInCatchVariables: true` in tsconfig, which is correct. Ensure no code overrides this with explicit `catch (err: any)`.

### 4.7 Make service method return types explicit

Service classes like `SwarmEngine` and `HeartbeatRunner` have inferred return types on public methods. Add explicit return type annotations to public API surfaces for better documentation and to catch accidental changes:

```ts
async proposeSwarm(...): Promise<{ swarmId: string; phase: string; specialistRoles: SpecialistRole[]; message: string }> {
```

### 4.8 Use `const` assertions for enum-like arrays

When defining allowed values for routes or validation:

```ts
const TASK_STATUSES = ["pending", "claimed", "in_progress", "review", "done", "failed", "cancelled"] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];
```

This ensures the status enum is defined in one place and used consistently between schema and validation.

---

## 5. Quick Wins Checklist

- [ ] Enable `strictFunctionTypes` in `tsconfig.base.json`
- [ ] Enable `noImplicitOverride` in `tsconfig.base.json`
- [ ] Enable `noUncheckedIndexedAccess` in `tsconfig.base.json`
- [ ] Enable `forceConsistentCasingInFileNames` in `tsconfig.base.json`
- [ ] Add `composite: true` to all workspace `tsconfig.json` files
- [ ] Create root `tsconfig.json` with all project references
- [ ] Add branded ID types to `@workspace/db`
- [ ] Type all JSONB columns with `.$type<T>()`
- [ ] Replace `as any` casts with proper typing
- [ ] Add Zod validation to all route `req.body` access
- [ ] Add explicit return types to all public service methods

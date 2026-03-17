# Architecture

Architectural decisions, patterns, and conventions for AgentClipboard.

**What belongs here:** Layered architecture decisions, module boundaries, adapter patterns, state management approach.

---

## Layered Architecture

```
AgentClipboard UI (React + Vite)
      |
SwarmDocket Engine (standalone governance/orchestration)
      |
OrchestratorAdapter interface
      |
PaperclipAdapter (one implementation)
```

## SwarmDocket Engine
- The REAL product layer -- NOT a thin Paperclip wrapper
- Defines all business types: Agent, Company, Task, GovernanceRequest, Swarm, etc.
- Policy engine: evaluates budget rules, approval gates, audit requirements
- Event bus: pub/sub for real-time updates
- Adapter interface: `OrchestratorAdapter` -- any backend can implement it

## Adapter Pattern
- `OrchestratorAdapter` interface defined in `src/engine/adapters/types.ts`
- `PaperclipAdapter` implements it in `src/engine/adapters/paperclip.ts`
- UI code NEVER imports adapter directly -- only uses SwarmDocket engine
- Additional adapters (custom SDK, mock) can be added without UI changes

## Multi-Target API (Hono)
- API routes defined with Hono framework
- Same route handlers exported for:
  - Express adapter (local dev, port 3201)
  - Vercel Functions (serverless)
  - Cloudflare Workers (edge)
- WebSocket on separate port (3202) for real-time events

## Frontend Patterns
- React Router for navigation (replacing manual URL parsing)
- Zustand for global state (replacing per-component useState)
- Components in `src/components/mockups/` evolve into functional views
- shadcn/ui component library in `src/components/ui/`
- Tailwind CSS v4 with CSS variables for theming
- Path alias: `@/*` -> `src/*`

## Conventions
- Zod schemas for all data validation
- TypeScript strict mode
- All async operations via event bus (WebSocket for UI, pub/sub internally)
- Tests in `__tests__/` directories adjacent to source files
- Vitest for unit/integration testing

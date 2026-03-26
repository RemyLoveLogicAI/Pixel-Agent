# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Runtime
- Node.js 22+ (v22.22.1 confirmed)
- pnpm 10+ (v10.32.1 confirmed)
- Docker v29.2.1 available
- macOS with 24GB RAM, 10 CPU cores

## System Load
- Machine is heavily loaded (~91% memory, ~920% CPU from IDE processes)
- Keep resource usage minimal -- avoid heavy background processes
- Test parallelism capped at 3 workers

## Paperclip
- Paperclip is the upstream agent orchestration engine (27K stars, MIT, v0.3.1)
- Installed via `npx paperclipai onboard --yes`
- Runs on port 3100 with embedded Postgres
- API docs: https://paperclip.ing/docs
- SwarmDocket wraps Paperclip -- NEVER call Paperclip directly from UI code

## Key Dependencies (pre-installed)
- React (catalog version), Vite 7, TypeScript
- Tailwind CSS v4 with @tailwindcss/vite plugin
- ~50 shadcn/ui components (Radix primitives)
- Framer Motion, Recharts, React Hook Form (installed but unused)
- Path alias: `@/*` -> `src/*`

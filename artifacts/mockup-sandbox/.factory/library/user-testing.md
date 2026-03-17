# User Testing

Testing surface, resource cost classification, and validation notes.

**What belongs here:** How to test the app manually, validation tools, concurrency limits, gotchas.

---

## Validation Surface

### Browser (Primary)
- Tool: agent-browser (at ~/.factory/bin/agent-browser)
- Dev server: http://localhost:3200
- Routes: Initially at /preview/{ComponentName}, after routing refactor at standard paths (/agents, /budget, etc.)
- API server: http://localhost:3201
- WebSocket: ws://localhost:3202

### API (Secondary)
- curl against http://localhost:3201/api/* for backend-only assertions

## Validation Concurrency

### agent-browser
- Max concurrent validators: **1**
- Rationale: Machine is heavily loaded (24GB RAM, 91% used, ~80MB free). Each agent-browser instance ~300MB. Dev server ~107MB. API server ~50MB. WebSocket server ~30MB. With Paperclip running (~200MB), total mission infrastructure is ~390MB. Only 1 agent-browser instance fits safely within 70% of remaining headroom.
- If user frees memory (closes Antigravity IDE processes), this can be increased to 2-3.

## Startup Sequence
1. Paperclip: `npx paperclipai start --background` (port 3100)
2. API server: `PORT=3201 pnpm run dev:api` (port 3201)
3. WebSocket: `PORT=3202 pnpm run dev:ws` (port 3202)
4. Web dev server: `PORT=3200 pnpm dev` (port 3200)

## Known Constraints
- No test runner initially (Vitest installed in foundation milestone)
- All mockup data is currently hardcoded -- API integration needed before real testing
- Approve/Reject buttons in GovernanceQueue are currently non-functional
- OrchestrationHQ uses inline <style> tag for fonts (should use index.html pattern)

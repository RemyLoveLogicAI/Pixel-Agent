---
name: platform-worker
description: Backend/engine worker for SwarmDocket, API routes, adapters, and infrastructure
---

# Platform Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving:
- SwarmDocket engine (types, adapters, policies, event bus)
- API routes (Hono handlers)
- WebSocket server
- Database/adapter integrations
- Multi-target deployment configuration
- Test infrastructure setup
- Backend-only functionality

## Work Procedure

1. **Read the feature description** carefully. Understand preconditions, expected behavior, and verification steps.

2. **Check preconditions**: Verify that prerequisite features are complete. If any precondition is unmet, return to orchestrator.

3. **Write tests first (RED)**:
   - Create test file in `__tests__/` adjacent to the source file
   - Write failing tests covering all expected behaviors from the feature description
   - Run `pnpm test --run` to confirm tests fail (red)
   - Cover: happy path, error cases, edge cases, type validation

4. **Implement (GREEN)**:
   - Write the minimal code to make tests pass
   - Follow the adapter pattern: UI never imports adapters directly
   - Use Zod schemas for all data shapes
   - Use Hono for API routes (export for Express, Vercel, CF Workers)
   - Handle errors with typed error classes

5. **Refactor**:
   - Clean up code, remove duplication
   - Ensure TypeScript strict compliance

6. **Run validators**:
   - `pnpm test --run --maxWorkers=3` (all tests pass)
   - `pnpm typecheck` (zero errors)
   - Fix any failures before proceeding

7. **Manual verification**:
   - For API features: `curl` the endpoints, verify responses
   - For engine features: run focused tests, inspect output
   - For WebSocket: connect with wscat or similar, verify events
   - Document every check in `interactiveChecks`

8. **Clean up**: Kill any processes you started. Commit your changes.

## Example Handoff

```json
{
  "salientSummary": "Implemented SwarmDocket OrchestratorAdapter interface and PaperclipAdapter with 6 methods (listAgents, getAgent, listTasks, updateTask, listCompanies, triggerHeartbeat). Tests: 14 passing in adapter.test.ts. Verified PaperclipAdapter connects to localhost:3100 via curl.",
  "whatWasImplemented": "OrchestratorAdapter TypeScript interface at src/engine/adapters/types.ts defining 6 methods. PaperclipAdapter implementation at src/engine/adapters/paperclip.ts with error handling and Zod validation. Agent, Company, Task Zod schemas at src/engine/types.ts.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm test --run --maxWorkers=3", "exitCode": 0, "observation": "14 tests passing, 0 failures" },
      { "command": "pnpm typecheck", "exitCode": 0, "observation": "No errors" },
      { "command": "curl http://localhost:3100/api/health", "exitCode": 0, "observation": "200 OK, Paperclip is running" }
    ],
    "interactiveChecks": [
      { "action": "curl GET /api/agents via PaperclipAdapter", "observed": "Returns array of 6 agents with correct schema" },
      { "action": "Test adapter with invalid URL", "observed": "Throws PaperclipConnectionError with descriptive message" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "src/engine/adapters/__tests__/paperclip.test.ts",
        "cases": [
          { "name": "listAgents returns array of Agent objects", "verifies": "Adapter fetches and validates agent data" },
          { "name": "throws PaperclipConnectionError on network failure", "verifies": "Error handling for unreachable backend" },
          { "name": "validates agent schema with Zod", "verifies": "Invalid data is rejected" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Paperclip API is unreachable and cannot be started
- A required npm package is missing and cannot be installed
- Feature depends on an adapter method that doesn't exist yet
- Requirements conflict with existing architecture decisions
- Tests reveal a bug in a dependency that blocks progress

---
name: ui-worker
description: Frontend worker for React views, components, state management, routing, and mobile UX
---

# UI Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving:
- React component development (views, panels, modals)
- Converting static mockups to data-driven components
- React Router setup and navigation
- Zustand store creation and state management
- WebSocket integration in UI (real-time updates)
- Responsive/mobile layout (Field Mode)
- Dark mode, theming, visual polish
- Loading/error/empty states
- Landing page integration

## Work Procedure

1. **Read the feature description** carefully. Understand preconditions, expected behavior, and verification steps.

2. **Study existing patterns**: Read the mockup component being modified (`src/components/mockups/`). Understand current structure, CSS classes, Tailwind patterns, and data shapes. Read `src/components/ui/` for available shadcn components.

3. **Write tests first (RED)**:
   - Create test file in `__tests__/` adjacent to the component
   - Write failing tests: rendering, user interaction, state changes, data display
   - Run `pnpm test --run` to confirm tests fail
   - Use React Testing Library patterns

4. **Implement (GREEN)**:
   - Convert static mock data to props/store data
   - Connect to Zustand store for global state
   - Use React Router hooks for navigation
   - Wire WebSocket events for real-time updates
   - Maintain existing Tailwind classes and visual fidelity
   - Add loading skeletons, error states, empty states
   - Use shadcn/ui components (do NOT add new UI libraries)
   - Use Framer Motion for animations where appropriate

5. **Refactor**:
   - Extract reusable components
   - Ensure proper TypeScript types (no `any`)
   - Clean up unused imports

6. **Run validators**:
   - `pnpm test --run --maxWorkers=3` (all tests pass)
   - `pnpm typecheck` (zero errors)
   - Fix any failures

7. **Manual verification with agent-browser**:
   - Start the dev server: `PORT=3200 pnpm dev &`
   - Use agent-browser to navigate to the modified view
   - Verify visual rendering matches expected behavior
   - Test user interactions (clicks, drags, toggles)
   - Test responsive behavior (resize viewport)
   - Test dark mode
   - Document EVERY check in `interactiveChecks`
   - Kill the dev server when done: `lsof -ti :3200 | xargs kill`

8. **Clean up**: Kill all processes. Commit changes.

## Example Handoff

```json
{
  "salientSummary": "Converted AgentRoster from static mock data to Zustand-powered live view. Cards now fetch from /api/agents and update via WebSocket. Added loading skeletons, empty state with 'Hire Agent' CTA, and error state with retry. Verified in agent-browser: 6 agent cards render correctly, status badges pulse for active agents, dark mode works.",
  "whatWasImplemented": "AgentRoster refactored: replaced MOCK_AGENTS with useAgentStore() hook reading from Zustand. Added useEffect for WebSocket subscription on agent.status.changed events. Loading state: 6 skeleton cards with animate-pulse. Empty state: centered illustration + 'No agents yet - hire your first agent' text + Button CTA. Error state: Alert with retry button. All 7 status badge variants verified.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm test --run --maxWorkers=3", "exitCode": 0, "observation": "22 tests passing, 0 failures" },
      { "command": "pnpm typecheck", "exitCode": 0, "observation": "No errors" }
    ],
    "interactiveChecks": [
      { "action": "Navigate to /agents in agent-browser", "observed": "6 agent cards render with correct names, roles, status badges" },
      { "action": "Toggle dark mode", "observed": "All cards switch to dark background, text remains readable, status colors correct" },
      { "action": "Check empty state (no agents)", "observed": "Empty state illustration visible with 'Hire Agent' CTA button" },
      { "action": "Check loading state (throttled network)", "observed": "6 skeleton cards with pulse animation shown during load" },
      { "action": "Resize to 375px width", "observed": "Grid collapses to single column, no horizontal scroll" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "src/components/mockups/__tests__/AgentRoster.test.tsx",
        "cases": [
          { "name": "renders agent cards from store data", "verifies": "Component reads from Zustand store" },
          { "name": "shows loading skeleton while fetching", "verifies": "Loading state displays correctly" },
          { "name": "shows empty state when no agents", "verifies": "Empty state with CTA renders" },
          { "name": "shows error state on fetch failure", "verifies": "Error banner with retry renders" },
          { "name": "updates card on WebSocket event", "verifies": "Real-time status badge update" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- API endpoint the component depends on doesn't exist yet
- shadcn/ui component needed isn't installed (don't install new Radix packages yourself)
- Visual design requirements are ambiguous or contradictory
- Existing component has bugs that need architectural decisions
- WebSocket event format doesn't match expected shape

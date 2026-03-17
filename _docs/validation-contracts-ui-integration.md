# Validation Contracts — UI Integration

**Mission:** AgentClipboard  
**Area:** UI Integration  
**Scope:** Wire 11 mockup components to live API data, add routing, SSE, Clipboard View, and error handling.

---

## 1. Routing

### VAL-UI-001 — Sidebar Navigation Routes

**Title:** Each sidebar item navigates to the correct routed page  
**Description:** Clicking any sidebar nav item in the Shell component triggers a `react-router-dom` navigation to the corresponding URL path. The browser URL updates to reflect the active page, and the correct page component renders in the main content area. The sidebar visually highlights the active route.  
**Evidence:**
- Each `NAV_ITEMS` entry (`overview`, `agents`, `orgchart`, `goals`, `tasks`, `swarms`, `heartbeat`, `governance`, `budget`) maps to a unique URL path (e.g., `/`, `/agents`, `/org-chart`, `/goals`, `/tasks`, `/swarms`, `/heartbeat`, `/governance`, `/budget`).
- Clicking a sidebar item changes `window.location.pathname` to the mapped route.
- The rendered component inside `<main>` matches the `SCREEN_MAP` entry for that route.
- The sidebar button for the active route has the `bg-sidebar-accent` active styling applied.

---

### VAL-UI-002 — Browser Back/Forward Navigation

**Title:** Browser history navigation works correctly with all routes  
**Description:** After navigating between pages via sidebar clicks, pressing the browser back button returns to the previous page with the correct component rendered and sidebar highlighting updated. Forward navigation similarly works. No page reloads occur.  
**Evidence:**
- Navigate from `/` → `/agents` → `/goals`. Press back twice → URL returns to `/`. Press forward → URL is `/agents`.
- At each step, the rendered component and sidebar active state match the URL.
- No full-page reload occurs (SPA behavior preserved).

---

### VAL-UI-003 — Direct URL Access

**Title:** Navigating directly to a route URL renders the correct page  
**Description:** Entering a route URL directly in the browser address bar (e.g., `/governance`) renders the corresponding page component with data loading initiated. The sidebar reflects the correct active item.  
**Evidence:**
- Hard-refreshing at `/tasks` renders the TaskBoard component.
- Vite dev server and production build both handle client-side routing fallback (HTML5 history API).
- A 404/fallback page renders for unknown routes.

---

### VAL-UI-004 — Clipboard View Route

**Title:** A new `/clipboard` route renders the Clipboard View component  
**Description:** A new sidebar nav item "Clipboard" is added under the "Command" or "Operations" group. Clicking it navigates to `/clipboard` and renders the new ClipboardView component showing a live aggregated board of active runs.  
**Evidence:**
- `/clipboard` route exists in the router configuration.
- Sidebar contains a "Clipboard" item with an appropriate icon.
- The ClipboardView component mounts and initiates data fetching.

---

### VAL-UI-004A — Workspace Route

**Title:** A new `/workspaces` route renders the Workspace list view  
**Description:** A new sidebar nav item "Workspaces" exists. Clicking it navigates to `/workspaces` and renders a Workspace list view. The view fetches workspaces from `GET /api/companies/:companyId/workspaces`.  
**Evidence:**
- `/workspaces` route exists in the router configuration.
- Sidebar contains a "Workspaces" item with an appropriate icon.
- The Workspaces page lists one card/row per workspace from the API response.
- Empty state renders when there are no workspaces.

---

### VAL-UI-004B — Workspace Detail Route

**Title:** `/workspaces/:workspaceId` renders the Workspace detail view  
**Description:** Selecting a workspace from the list navigates to `/workspaces/:workspaceId`, which fetches `GET /api/companies/:companyId/workspaces/:workspaceId` and renders details including `runtimeType`, `fsRoot`, and status.  
**Evidence:**
- Navigating to a valid workspace id renders the detail view with live data.
- Navigating to an invalid workspace id shows a 404 state (not a spinner).

---

### VAL-UI-004C — Workspace Snapshots View

**Title:** Workspace detail shows snapshots list and create action  
**Description:** The Workspace detail view shows snapshots fetched from `GET /api/companies/:companyId/workspaces/:workspaceId/snapshots`, and provides a "Create snapshot" action calling `POST .../snapshots`.  
**Evidence:**
- Snapshot list matches API response length and ordering.
- Creating a snapshot inserts a new row and appears without full page reload (refetch or optimistic update).
- Snapshot creation triggers a visible success signal (toast/badge).

---

### VAL-UI-004D — Workspace MCP Connections View

**Title:** Workspace detail shows MCP connections list and CRUD actions  
**Description:** The Workspace detail view shows MCP connections fetched from `GET /api/companies/:companyId/workspaces/:workspaceId/mcp`, and supports create/update/delete via the respective endpoints.  
**Evidence:**
- Creating a connection requires either `serverUrl` or `localCommand`; missing both shows an inline validation error.
- Updating a connection updates the row without full reload.
- Deleting a connection removes it from the list.

---

## 2. Data Loading

### VAL-UI-005 — React Query Provider Setup

**Title:** React Query provider wraps the entire application  
**Description:** A `QueryClientProvider` from `@tanstack/react-query` wraps the root `<App>` component so all child components can use `useQuery` / `useMutation` hooks. The QueryClient is configured with sensible defaults (staleTime, retry, refetchOnWindowFocus).  
**Evidence:**
- `main.tsx` or `App.tsx` contains `<QueryClientProvider client={queryClient}>`.
- `queryClient` is instantiated with explicit `defaultOptions`.
- Any component calling `useQuery` does not throw a "No QueryClient set" error.

---

### VAL-UI-006 — OpenAPI Codegen Hooks Available

**Title:** React Query hooks are generated for all API endpoints via OpenAPI codegen  
**Description:** Running the OpenAPI codegen tool (e.g., orval) produces typed React Query hooks for every REST endpoint: companies, agents, goals, tasks, heartbeat, swarms, governance, budget, tools, memory, traces. These hooks are importable from the generated client package.  
**Evidence:**
- `lib/api-client-react/src/generated/` contains hook functions for all endpoint groups.
- Each generated hook returns properly typed data matching the Drizzle schema types.
- Hooks use the custom fetch configured in `lib/api-client-react/src/custom-fetch.ts`.

---

### VAL-UI-007 — Loading States During Data Fetch

**Title:** Every page shows a loading indicator while API data is being fetched  
**Description:** When a page component mounts and its React Query hook is in `isLoading` state, a visible loading indicator (spinner, skeleton, or shimmer) renders instead of empty content. The loading state is visually distinct from the loaded state and from error states.  
**Evidence:**
- Each page component checks `isLoading` from its `useQuery` hook and renders a `<Spinner />` or skeleton UI.
- The loading indicator is visible during the network request (observable via throttled network in DevTools).
- No flash of empty content before data appears.

---

## 3. Company Dashboard

### VAL-UI-008 — Real Agent Count in Stats Card

**Title:** Dashboard "Agents" stat card reflects the actual number of agents from the API  
**Description:** The CompanyDashboard stats card labeled "Agents" displays the count returned by `GET /api/companies/:companyId/agents`. It no longer uses a hardcoded value.  
**Evidence:**
- The displayed agent count matches the length of the array returned by the agents API endpoint.
- Adding or removing an agent via the API changes the displayed count after refetch.

---

### VAL-UI-009 — Real Goal/Task/Swarm Counts in Stats Cards

**Title:** Dashboard stat cards for Goals, Tasks, and Swarms reflect live API data  
**Description:** The stats cards for goals, tasks, and swarms display counts fetched from their respective API endpoints (`GET /api/companies/:companyId/goals`, `tasks`, `swarms`). Values update when underlying data changes.  
**Evidence:**
- Goal count matches the length of `GET /api/companies/:companyId/goals` response.
- Task count matches the length of `GET /api/companies/:companyId/tasks` response.
- Swarm count matches the length of `GET /api/companies/:companyId/swarms` response.
- Creating a new goal via POST increments the goal count on next refetch.

---

### VAL-UI-010 — Real Budget Progress

**Title:** Dashboard budget progress bar reflects actual company budget utilization  
**Description:** The budget progress bar uses `budgetUsedUsd` and `budgetMonthlyUsd` from `GET /api/companies/:companyId/budget` to compute and display utilization percentage. The progress bar fill width and percentage label match the API data.  
**Evidence:**
- `utilizationPct` displayed matches `Math.round((budgetUsedUsd / budgetMonthlyUsd) * 100)` from the budget endpoint.
- Updating `budgetUsedUsd` via the API changes the progress bar on next refetch.

---

### VAL-UI-011 — Activity Feed from Real Events

**Title:** Dashboard activity feed displays recent real activity from the system  
**Description:** The activity feed section shows recent events derived from real data (e.g., recent task completions, governance decisions, swarm phase changes) rather than hardcoded entries.  
**Evidence:**
- Activity items correspond to actual recent records from the API (tasks, governance requests, swarm runs).
- The feed updates when new activity occurs.
- Timestamps in the feed are real and chronologically ordered.

---

## 4. Agent Management

### VAL-UI-012 — Agent Roster Displays Real Agents

**Title:** AgentRoster grid cards are populated from live API data  
**Description:** The AgentRoster component fetches agents from `GET /api/companies/:companyId/agents` and renders one card per agent. Each card shows the agent's real name, status, model, role, budget usage, and tools.  
**Evidence:**
- Card count matches the number of agents returned by the API.
- Each card's name, status, model fields match the corresponding agent object from the API response.
- An empty state renders when no agents exist.

---

### VAL-UI-013 — Create Agent

**Title:** A new agent can be created through the UI and persists via the API  
**Description:** The UI provides a form or dialog to create a new agent. Submitting calls `POST /api/companies/:companyId/agents` with the form data. On success, the new agent appears in the AgentRoster without a full page reload.  
**Evidence:**
- A "Create Agent" button/action exists in the AgentRoster or a related view.
- Filling in required fields (name, role, model) and submitting triggers a POST request.
- The API returns 201 with the created agent.
- The agent list re-fetches or optimistically updates to include the new agent.

---

### VAL-UI-014 — Edit Agent

**Title:** An existing agent's properties can be edited through the UI  
**Description:** Clicking an edit action on an agent card opens a form pre-populated with the agent's current data. Saving calls `PATCH /api/companies/:companyId/agents/:agentId` and the roster reflects the updated values.  
**Evidence:**
- Edit form fields are pre-populated from the agent's current data.
- PATCH request is sent with only changed fields.
- The API returns the updated agent and the UI reflects the change.

---

### VAL-UI-015 — View Agent Detail

**Title:** Clicking an agent card shows detailed agent information  
**Description:** Selecting an agent from the roster opens a detail view or panel showing comprehensive agent data fetched from `GET /api/companies/:companyId/agents/:agentId`, including capability tokens, budget details, and reporting chain.  
**Evidence:**
- Detail view renders with data from the single-agent endpoint.
- Fields include: name, role, status, model, level, budgetMonthlyUsd, budgetUsedUsd, tools, capabilityToken.
- Navigating to a non-existent agent ID shows a 404 error state.

---

## 5. Org Chart

### VAL-UI-016 — Real Hierarchy in Org Chart

**Title:** OrgChart displays the actual agent hierarchy from the API  
**Description:** The OrgChart component fetches the agent tree from `GET /api/companies/:companyId/agents/org-chart` and renders a hierarchical visualization reflecting real `managerId` relationships. Root agents (no manager) appear at the top level.  
**Evidence:**
- The tree structure matches the nested `OrgNode[]` response from the org-chart endpoint.
- Agents with `managerId` set appear as children of their manager node.
- Adding/removing a `managerId` relationship via PATCH changes the tree on next refetch.
- An empty org chart renders gracefully when no agents exist.

---

## 6. Goals Tree

### VAL-UI-017 — Real Goals with Proper Nesting

**Title:** GoalsTree renders the actual goal hierarchy from the API  
**Description:** The GoalsTree component fetches from `GET /api/companies/:companyId/goals/tree` and renders goals in a recursive tree matching the `parentId` hierarchy. Each goal node shows its real title, status, priority, and assigned agent.  
**Evidence:**
- Tree structure matches the nested `GoalNode[]` response from the goals/tree endpoint.
- Root goals (no parentId) are top-level nodes; sub-goals render as children.
- Goal status (`proposed`, `active`, `completed`, `cancelled`) is accurately reflected with the correct visual styling.
- Priority values are displayed and ordered correctly.

---

### VAL-UI-018 — Goal Status Updates

**Title:** Goal status can be changed through the UI and persists  
**Description:** The UI provides a mechanism to update a goal's status (e.g., mark as completed). This calls `PATCH /api/companies/:companyId/goals/:goalId` with the new status. The tree updates to reflect the change.  
**Evidence:**
- A status-change action exists on goal nodes (e.g., dropdown, button).
- PATCH request is sent with `{ status: "completed" }`.
- The API sets `completedAt` when status becomes `completed`.
- The goals tree re-renders with updated status styling.

---

## 7. Task Board

### VAL-UI-019 — Real Tasks in Correct Kanban Columns

**Title:** TaskBoard displays real tasks from the API grouped by status into columns  
**Description:** The TaskBoard fetches tasks from `GET /api/companies/:companyId/tasks` and distributes them into kanban columns based on their `status` field (pending, claimed, running, completed, failed). Each task card shows its real title, assigned agent, and version.  
**Evidence:**
- Total task cards across all columns equals the total tasks returned by the API.
- A task with `status: "pending"` appears in the Pending column.
- A task with `status: "completed"` appears in the Completed column.
- Column counts update after task status changes.

---

### VAL-UI-020 — Task Status Change (Drag or Action)

**Title:** Moving a task between columns or changing its status persists via the API  
**Description:** When a task is dragged to a different column or its status is changed via a UI action, a `PATCH /api/companies/:companyId/tasks/:taskId` request is sent with the new status. The task's `version` is incremented server-side (optimistic locking).  
**Evidence:**
- Moving a task from "Pending" to "Claimed" triggers a PATCH request with `{ status: "claimed" }`.
- The API response includes an incremented `version` field.
- On a 409 (version conflict), the UI shows an appropriate error message and refetches.

---

### VAL-UI-021 — Task Claim with Optimistic Locking

**Title:** Claiming a task uses the optimistic locking claim endpoint  
**Description:** When an agent claims a task, the UI calls `POST /api/companies/:companyId/tasks/:taskId/claim` with `{ agentId, version }`. A 409 response (version mismatch or already claimed) is handled gracefully with user feedback.  
**Evidence:**
- Claim action sends POST with current `version` from the local task state.
- On success, the task moves to "Claimed" status with the agent assigned.
- On 409 conflict, a toast or inline message informs the user and the task list refetches.

---

## 8. Swarm Control

### VAL-UI-022 — Real Swarm Data and Phase Timeline

**Title:** SwarmControl shows real swarm data with an accurate 6-phase timeline  
**Description:** The SwarmControl component fetches swarm details from `GET /api/companies/:companyId/swarms/:swarmId` and displays the swarm's current phase in the 6-phase timeline (`proposed → pending_approval → spawning → executing → synthesizing → completed/failed/dissolved/cancelled`). All completed phases are marked, and the current phase is highlighted.  
**Evidence:**
- The displayed phase matches the `phase` field from the swarm API response.
- Phase timeline visually distinguishes completed, current, and future phases.
- Agent list within the swarm matches the `agents` array in the response.
- Timestamps (`createdAt`, `completedAt`) are displayed when present.

---

### VAL-UI-023 — Swarm Agent Statuses

**Title:** Swarm agent cards reflect real individual agent statuses  
**Description:** Each agent within a swarm run is displayed with their real status and role, fetched as part of the swarm detail response (`swarmAgentsTable` data).  
**Evidence:**
- Agent cards within SwarmControl match the `agents` array from `GET /api/companies/:companyId/swarms/:swarmId`.
- Each agent's `role` and `status` fields are accurately displayed.

---

### VAL-UI-024 — Swarm Messages

**Title:** Swarm messages are fetched and displayed in real-time  
**Description:** The SwarmControl component fetches messages from `GET /api/companies/:companyId/swarms/:swarmId/messages` and displays them chronologically. New messages appear without manual refresh when SSE pushes updates.  
**Evidence:**
- Message list matches the response from the messages endpoint.
- Each message shows `fromAgentId`, `topic`, and `payload`.
- Messages are ordered by creation timestamp.

---

### VAL-UI-025 — Swarm Cost Tracking

**Title:** Swarm cost data is displayed from real API calculations  
**Description:** The SwarmControl component shows the estimated and actual cost of a swarm run, derived from the swarm run data. Cost values are no longer hardcoded.  
**Evidence:**
- Cost figures are sourced from the swarm run API response fields (`estimatedCostUsd`, actual cost if tracked).
- Values update as the swarm progresses through phases.

---

### VAL-UI-026 — Swarm List View

**Title:** A list of all swarms is displayed with real data  
**Description:** Before drilling into a single swarm, the UI shows a list of all swarms fetched from `GET /api/companies/:companyId/swarms`, with each entry showing task description, phase, leader agent, and creation time.  
**Evidence:**
- Swarm list count matches the API response length.
- Each row shows `taskDescription`, `phase`, `leaderAgentId`.
- Clicking a swarm navigates to its detail view.

---

## 9. Governance Queue

### VAL-UI-027 — Real Pending Governance Requests

**Title:** GovernanceQueue shows actual pending requests from the API  
**Description:** The GovernanceQueue component fetches governance requests from `GET /api/companies/:companyId/governance?status=pending` and displays them in the pending queue. Each request shows its real `requestType`, requester, justification, and TTL/expiration.  
**Evidence:**
- Pending request count matches the filtered API response.
- All 7 request types (`hire`, `fire`, `budget_override`, `swarm_approval`, etc.) render correctly when present.
- Expired requests (past `expiresAt`) are visually distinguished.

---

### VAL-UI-028 — Governance Request History

**Title:** GovernanceQueue shows resolved (approved/rejected) requests in a history tab  
**Description:** A history section or tab shows governance requests with status `approved` or `rejected`, fetched from `GET /api/companies/:companyId/governance`. Each entry shows the decision, decider, note, and timestamp.  
**Evidence:**
- History section shows requests where `status !== 'pending'`.
- Each entry displays `decidedBy`, `decisionNote`, `decidedAt`.
- History is ordered chronologically.

---

### VAL-UI-029 — Approve Governance Request

**Title:** Approving a governance request calls the API and updates the queue  
**Description:** Clicking "Approve" on a pending request calls `POST /api/companies/:companyId/governance/:requestId/approve`. On success, the request moves from the pending queue to the history section with status "approved".  
**Evidence:**
- Approve button triggers a POST to the approve endpoint.
- API returns the updated request with `status: "approved"` and `decidedAt` set.
- The pending queue decrements by one; the history section includes the newly approved request.
- Approving an already-decided request (409) shows an error message.

---

### VAL-UI-030 — Reject Governance Request

**Title:** Rejecting a governance request calls the API and updates the queue  
**Description:** Clicking "Reject" on a pending request calls `POST /api/companies/:companyId/governance/:requestId/reject` with an optional decision note. The request transitions to rejected in the UI.  
**Evidence:**
- Reject button triggers a POST to the reject endpoint.
- An optional note field is available before confirming rejection.
- API returns the updated request with `status: "rejected"`.
- The UI updates both pending and history sections accordingly.

---

## 10. Budget Dashboard

### VAL-UI-031 — Company-Level Budget from API

**Title:** BudgetDashboard shows real company budget data  
**Description:** The BudgetDashboard fetches from `GET /api/companies/:companyId/budget` and displays the company-level `budgetMonthlyUsd`, `budgetUsedUsd`, `utilizationPct`, and `circuitBreaker` state.  
**Evidence:**
- Displayed values match the API response for the company budget endpoint.
- Utilization percentage and progress bar are computed from real values.
- Circuit breaker state (open/closed/half-open) is visually indicated.

---

### VAL-UI-032 — Per-Agent Budget Breakdown

**Title:** BudgetDashboard shows per-agent budget utilization from real data  
**Description:** The agent summary section displays each agent's `budgetMonthlyUsd`, `budgetUsedUsd`, and `utilizationPct` as returned by the budget endpoint's `agents` array.  
**Evidence:**
- Agent budget rows match the `agents` array from the budget API response.
- Each agent's utilization bar width corresponds to their `utilizationPct`.
- Agents with high utilization (>80%) are visually flagged.

---

### VAL-UI-033 — Budget Alerts

**Title:** Budget alerts are fetched and displayed from the API  
**Description:** The BudgetDashboard fetches alerts from `GET /api/companies/:companyId/budget/alerts` and displays any active budget violation notifications.  
**Evidence:**
- Alert count matches the API response length.
- Each alert shows its type, severity, and associated details.
- No alerts → an empty/clear state message is shown.

---

## 11. Heartbeat Panel

### VAL-UI-034 — Real Heartbeat Runs

**Title:** HeartbeatPanel shows actual heartbeat run history from the API  
**Description:** The HeartbeatPanel fetches runs from `GET /api/companies/:companyId/heartbeat/runs` and displays them with their real timestamps, trigger type, status, and agent count.  
**Evidence:**
- Run list matches the API response ordered by `startedAt` descending.
- Each run shows `startedAt`, `completedAt`, trigger type, and outcome.
- Expanding a run shows agent-level detail.

---

### VAL-UI-035 — Heartbeat Agent-Level Detail

**Title:** Expanding a heartbeat run shows per-agent execution details  
**Description:** Clicking or expanding a heartbeat run fetches from `GET /api/companies/:companyId/heartbeat/runs/:runId` and displays the `agentRuns` array with each agent's individual execution result.  
**Evidence:**
- Agent run list matches the `agentRuns` array from the detailed run endpoint.
- Each agent run shows the agent name, execution duration, status (success/failure), and error message if failed.

---

### VAL-UI-036 — Dead Letter Queue Display

**Title:** Unresolved dead-letter entries are visible in the Heartbeat panel  
**Description:** The HeartbeatPanel fetches dead-letter entries from `GET /api/companies/:companyId/heartbeat/dead-letters` and displays unresolved failures with retry count and next retry time.  
**Evidence:**
- Dead-letter entry count matches the API response.
- Each entry shows `agentId`, `errorMessage`, `retryCount`, `maxRetries`, `nextRetryAt`.
- Resolve and Retry actions are available for each entry.

---

## 12. SSE / Real-Time Updates

### VAL-UI-037 — SSE Connection Established

**Title:** The application establishes an EventSource connection for real-time updates  
**Description:** On mount, the app opens an SSE connection to `GET /api/companies/:companyId/events`. The connection receives an initial `connected` event and stays alive via server pings every 30 seconds.  
**Evidence:**
- Browser DevTools → Network → EventStream shows an active SSE connection.
- Initial `connected` event received with `{ companyId }` payload.
- Periodic `: ping` comments maintain the connection.

---

### VAL-UI-038 — SSE-Driven Data Refetch

**Title:** Real-time SSE events trigger React Query cache invalidation and UI updates  
**Description:** When the API server broadcasts an event (e.g., `agent_created`, `task_updated`, `swarm_phase_changed`, `governance_decided`), the SSE handler on the client invalidates the relevant React Query cache keys, causing affected components to refetch and re-render with fresh data.  
**Evidence:**
- Creating an agent via a direct API call (curl/Postman) triggers the SSE event.
- The AgentRoster page re-renders with the new agent without manual refresh.
- Similarly, approving a governance request causes the GovernanceQueue pending count to decrement in real-time.

---

### VAL-UI-038A — SSE Updates for Workspaces

**Title:** Workspace SSE events trigger React Query cache invalidation  
**Description:** When the API broadcasts workspace events (`workspace.created`, `workspace.updated`, `workspace.snapshot_created`, `workspace.mcp_connection_created`, `workspace.mcp_connection_updated`, `workspace.mcp_connection_deleted`), the client invalidates the relevant cache keys and updates the Workspaces and Workspace detail pages in real time.  
**Evidence:**
- Creating a workspace via API makes it appear on `/workspaces` without refresh.
- Creating a snapshot makes it appear on the workspace detail without refresh.
- Creating/updating/deleting an MCP connection updates the workspace detail list without refresh.

---

### VAL-UI-039 — SSE Reconnection on Disconnect

**Title:** The SSE client automatically reconnects after a disconnection  
**Description:** If the SSE connection drops (server restart, network hiccup), the client automatically attempts to reconnect with exponential backoff or the browser's native `EventSource` retry mechanism. Upon reconnection, stale data is refetched.  
**Evidence:**
- Killing the API server process and restarting it results in the SSE connection re-establishing.
- After reconnection, a full data refetch occurs for currently mounted queries.
- No permanent error state on temporary disconnection.

---

## 13. Clipboard View (New Component)

### VAL-UI-040 — Clipboard View Renders Aggregated Active Runs

**Title:** ClipboardView displays a live aggregated board of all active runs  
**Description:** The new ClipboardView component aggregates active data from multiple sources: running swarm runs, in-progress heartbeat runs, claimed/running tasks, and pending governance requests. It presents them in a unified live board view.  
**Evidence:**
- The component fetches from multiple endpoints: swarms, heartbeat/runs, tasks, governance.
- Only active/in-progress items are shown (swarms not in terminal phases, tasks with status `claimed` or `running`, pending governance, recent heartbeat runs).
- Items are organized by category or a unified timeline.

---

### VAL-UI-040A — Clipboard Includes Workspace & Workflow Activity

**Title:** ClipboardView includes active workflows and workspace operations  
**Description:** ClipboardView also surfaces running/paused `workflow_runs` and recent workspace operations (snapshot pending/created/restored; MCP connection pending/changed) so operators can see “all active work” in one place.  
**Evidence:**
- Clipboard fetch includes `GET /api/companies/:companyId/clipboard` and renders sections for `workflows` and `workspaces`.
- Workflow section shows runs where `status in ("running","paused")`.
- Workspace section shows pending approvals for snapshot/MCP changes and reflects changes after approval.

---

### VAL-UI-041 — Clipboard View Real-Time Updates via SSE

**Title:** The Clipboard View updates in real-time as backend state changes  
**Description:** SSE events cause the Clipboard View to automatically update without manual refresh. When a swarm phase advances, a task is completed, or a governance request is decided, the Clipboard View reflects the change.  
**Evidence:**
- A swarm completing removes it from the active board (or moves it to a "completed" section).
- A new governance request appearing causes a new card to appear on the Clipboard.
- No manual refresh or polling is needed beyond the SSE-driven invalidation.

---

### VAL-UI-042 — Clipboard View Empty State

**Title:** Clipboard View shows a meaningful empty state when no active runs exist  
**Description:** When there are no active swarms, running tasks, pending governance requests, or recent heartbeat runs, the Clipboard View displays a clear empty-state message rather than a blank page.  
**Evidence:**
- With all swarms in terminal states, no pending tasks, and no pending governance, the Clipboard shows an empty-state illustration or message (e.g., "All clear — no active runs").
- The empty state does not display loading indicators or error messages.

---

## 14. Dark Mode

### VAL-UI-043 — Dark Mode Toggle Persists Across Pages

**Title:** Toggling dark mode applies globally and survives navigation between pages  
**Description:** Clicking the dark mode toggle in the top bar adds/removes the `dark` class on `<html>` and this preference persists as the user navigates between routes. All pages and components render correctly in both light and dark themes.  
**Evidence:**
- Toggling dark mode on the Dashboard, then navigating to Tasks → the Tasks page is also in dark mode.
- The `dark` class on `document.documentElement` persists across route changes.
- All shadcn/ui components and custom mockup components use CSS variables that respond to the `dark` class.

---

### VAL-UI-044 — Dark Mode Preference Persists Across Sessions

**Title:** Dark mode preference is saved to localStorage and restored on page load  
**Description:** The dark mode state is persisted in `localStorage` (or a similar mechanism). On a full page reload, the application restores the last-selected theme without a flash of the wrong theme.  
**Evidence:**
- Enabling dark mode, then refreshing the page → the page loads in dark mode.
- `localStorage` contains a key (e.g., `theme` or `dark-mode`) reflecting the current preference.
- No visible flash of light theme on load when dark mode is saved.

---

### VAL-UI-045 — All Pages Render Correctly in Both Themes

**Title:** Every page and component has proper styling in both light and dark modes  
**Description:** All 11 original mockup components plus the new ClipboardView component render without visual defects in both light and dark mode. Text is readable, backgrounds have sufficient contrast, and interactive elements are clearly distinguishable.  
**Evidence:**
- Visual inspection of each page in both themes reveals no illegible text, invisible borders, or broken layouts.
- shadcn/ui components (cards, badges, buttons, dialogs) all honor the `dark` variant.
- Charts and progress bars remain visible and correctly colored in both modes.

---

## 15. Error Handling

### VAL-UI-046 — API Error Displayed Gracefully

**Title:** API errors are shown to the user in a non-disruptive manner  
**Description:** When an API request fails (4xx or 5xx), the UI displays a user-friendly error message (toast notification, inline alert, or error boundary fallback) rather than crashing, showing raw JSON, or silently failing.  
**Evidence:**
- Simulating a 500 error (e.g., by shutting down the database) results in a visible error message on the affected page.
- The error message is human-readable (not a raw stack trace).
- Other pages/components that are not affected continue to function.

---

### VAL-UI-047 — Error Boundary Catches Component Crashes

**Title:** React Error Boundaries prevent full-app crashes  
**Description:** If a component throws a rendering error, an Error Boundary catches it and displays a fallback UI for that section only. The rest of the application (sidebar, other pages) remains functional.  
**Evidence:**
- A deliberate throw in one component (e.g., GoalsTree) triggers the Error Boundary fallback.
- The fallback UI shows an error message and optionally a "Retry" button.
- Navigating to a different page via the sidebar works normally.

---

### VAL-UI-048 — 404 Not Found for Invalid Resources

**Title:** Navigating to a non-existent resource shows a 404 state  
**Description:** When the API returns a 404 (e.g., invalid agent ID, deleted swarm), the UI renders a "not found" message rather than an infinite loading spinner or a blank page.  
**Evidence:**
- Navigating to `/agents/nonexistent-uuid` shows a "Agent not found" message.
- The 404 error state has a back link or navigation to return to the list view.

---

### VAL-UI-049 — Network Offline Handling

**Title:** The UI handles network offline gracefully  
**Description:** When the browser goes offline, API requests fail but the UI does not crash. A visual indicator (banner, toast) informs the user of the connectivity issue. React Query's retry mechanism attempts to refetch when connectivity is restored.  
**Evidence:**
- Going offline (DevTools → Network → Offline) results in a visible offline indicator.
- Cached data (if any) remains visible.
- Restoring connectivity triggers automatic refetch of stale queries.

---

### VAL-UI-050 — Optimistic Update Rollback on Error

**Title:** Failed mutations roll back optimistic updates and notify the user  
**Description:** When a mutation (e.g., task status change, governance approval) uses optimistic updates and the API call fails, the UI reverts the optimistic change and shows an error toast or message.  
**Evidence:**
- Optimistically moving a task to "Completed" that then fails server-side reverts the task back to its previous column.
- A toast notification (via sonner/use-toast) informs the user that the action failed.
- The data on screen matches the actual server state after the rollback.

---

## Summary Matrix

| ID | Area | Component | Key Endpoint |
|----|------|-----------|-------------|
| VAL-UI-001 | Routing | Shell | — |
| VAL-UI-002 | Routing | Shell | — |
| VAL-UI-003 | Routing | Shell | — |
| VAL-UI-004 | Routing | ClipboardView (new) | — |
| VAL-UI-005 | Data Loading | App/main | — |
| VAL-UI-006 | Data Loading | Generated hooks | All endpoints |
| VAL-UI-007 | Data Loading | All pages | All endpoints |
| VAL-UI-008 | Dashboard | CompanyDashboard | `GET /agents` |
| VAL-UI-009 | Dashboard | CompanyDashboard | `GET /goals`, `/tasks`, `/swarms` |
| VAL-UI-010 | Dashboard | CompanyDashboard | `GET /budget` |
| VAL-UI-011 | Dashboard | CompanyDashboard | Multiple |
| VAL-UI-012 | Agents | AgentRoster | `GET /agents` |
| VAL-UI-013 | Agents | AgentRoster | `POST /agents` |
| VAL-UI-014 | Agents | AgentRoster | `PATCH /agents/:id` |
| VAL-UI-015 | Agents | AgentRoster | `GET /agents/:id` |
| VAL-UI-016 | Org Chart | OrgChart | `GET /agents/org-chart` |
| VAL-UI-017 | Goals | GoalsTree | `GET /goals/tree` |
| VAL-UI-018 | Goals | GoalsTree | `PATCH /goals/:id` |
| VAL-UI-019 | Tasks | TaskBoard | `GET /tasks` |
| VAL-UI-020 | Tasks | TaskBoard | `PATCH /tasks/:id` |
| VAL-UI-021 | Tasks | TaskBoard | `POST /tasks/:id/claim` |
| VAL-UI-022 | Swarms | SwarmControl | `GET /swarms/:id` |
| VAL-UI-023 | Swarms | SwarmControl | `GET /swarms/:id` (agents) |
| VAL-UI-024 | Swarms | SwarmControl | `GET /swarms/:id/messages` |
| VAL-UI-025 | Swarms | SwarmControl | `GET /swarms/:id` (cost) |
| VAL-UI-026 | Swarms | SwarmControl | `GET /swarms` |
| VAL-UI-027 | Governance | GovernanceQueue | `GET /governance?status=pending` |
| VAL-UI-028 | Governance | GovernanceQueue | `GET /governance` |
| VAL-UI-029 | Governance | GovernanceQueue | `POST /governance/:id/approve` |
| VAL-UI-030 | Governance | GovernanceQueue | `POST /governance/:id/reject` |
| VAL-UI-031 | Budget | BudgetDashboard | `GET /budget` |
| VAL-UI-032 | Budget | BudgetDashboard | `GET /budget` (agents) |
| VAL-UI-033 | Budget | BudgetDashboard | `GET /budget/alerts` |
| VAL-UI-034 | Heartbeat | HeartbeatPanel | `GET /heartbeat/runs` |
| VAL-UI-035 | Heartbeat | HeartbeatPanel | `GET /heartbeat/runs/:id` |
| VAL-UI-036 | Heartbeat | HeartbeatPanel | `GET /heartbeat/dead-letters` |
| VAL-UI-037 | SSE | App/SSE hook | `GET /events` (SSE) |
| VAL-UI-038 | SSE | All pages | `GET /events` (SSE) |
| VAL-UI-039 | SSE | App/SSE hook | `GET /events` (SSE) |
| VAL-UI-040 | Clipboard | ClipboardView (new) | Multiple |
| VAL-UI-041 | Clipboard | ClipboardView (new) | SSE + Multiple |
| VAL-UI-042 | Clipboard | ClipboardView (new) | Multiple |
| VAL-UI-043 | Dark Mode | Shell | — |
| VAL-UI-044 | Dark Mode | Shell | — |
| VAL-UI-045 | Dark Mode | All pages | — |
| VAL-UI-046 | Errors | All pages | All endpoints |
| VAL-UI-047 | Errors | Error Boundary | — |
| VAL-UI-048 | Errors | Detail views | All `:id` endpoints |
| VAL-UI-049 | Errors | App-wide | All endpoints |
| VAL-UI-050 | Errors | Mutation components | All mutation endpoints |

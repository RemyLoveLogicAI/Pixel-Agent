# Validation Contract — Clipboard Features

**Area:** Clipboard Features  
**Mission:** AgentClipboard  
**Prefix:** `VAL-CLIP-`  
**Status:** Draft  
**Created:** 2026-03-17  

---

## 1. Sign-off Flow

### VAL-CLIP-001 — List Pending Governance Approvals

**Title:** User can view all pending governance requests for a company.

**Behavioral Description:**  
When a user navigates to the sign-off view for a company, the system fetches all governance requests with `status = "pending"` from the `governance_requests` table and displays them in reverse-chronological order. Each item shows the request type (hire, fire, budget_override, swarm_approval, escalation, tool_access, strategy_change), the requesting agent name, the description, estimated cost, and time remaining before expiration.

**Evidence Requirements:**
- `GET /api/companies/:companyId/governance?status=pending` returns only pending requests.
- Each request displays `requestType`, `description`, `requestingAgentId` (resolved to agent name), `estimatedCostUsd`, and `expiresAt`.
- The list is ordered by `createdAt` descending (most recent first).
- Empty state is shown when no pending requests exist.

---

### VAL-CLIP-002 — Review Governance Request Details

**Title:** User can inspect full details of a governance request before acting.

**Behavioral Description:**  
When a user selects a pending governance request, a detail view displays all request fields including metadata (JSON), the requesting agent's role and reporting line, estimated cost, TTL countdown, description, and any attached context in the `metadata` JSONB field. The user can read all information before choosing to approve or reject.

**Evidence Requirements:**
- Detail view renders all fields from the `governance_requests` row: `id`, `companyId`, `requestingAgentId`, `requestType`, `description`, `metadata`, `status`, `estimatedCostUsd`, `ttlSeconds`, `expiresAt`, `createdAt`.
- If `requestingAgentId` is set, the agent's `name`, `role`, and `managerId` chain are displayed.
- Metadata JSON is rendered in a human-readable format (not raw JSON).
- TTL countdown shows remaining time until expiration.

---

### VAL-CLIP-003 — Approve Governance Request with Note

**Title:** User can approve a pending governance request and attach a decision note.

**Behavioral Description:**  
The user clicks "Approve" on a pending governance request, optionally enters a decision note, and confirms. The system calls the approve endpoint, which sets `status = "approved"`, records `decidedBy`, `decidedAt`, and `decisionNote`. The UI reflects the updated status immediately and the request is removed from the pending list.

**Evidence Requirements:**
- `POST /api/companies/:companyId/governance/:requestId/approve` is called with `{ decidedBy: "<user_identifier>", note: "<optional_text>" }`.
- Response returns the updated governance request with `status: "approved"`, non-null `decidedAt`, and the provided `decisionNote`.
- The request disappears from the pending approvals list.
- A confirmation indicator (toast/banner) is shown.
- The approval is reflected in the approval history view.

---

### VAL-CLIP-004 — Reject Governance Request with Reason

**Title:** User can reject a pending governance request and must provide a reason.

**Behavioral Description:**  
The user clicks "Reject" on a pending governance request, enters a mandatory rejection reason, and confirms. The system calls the reject endpoint, which sets `status = "rejected"`, records `decidedBy`, `decidedAt`, and `decisionNote`. The UI reflects the updated status immediately.

**Evidence Requirements:**
- `POST /api/companies/:companyId/governance/:requestId/reject` is called with `{ decidedBy: "<user_identifier>", note: "<rejection_reason>" }`.
- The reject action requires a non-empty `note` (UI validation prevents submission without a reason).
- Response returns the updated governance request with `status: "rejected"`.
- The request disappears from the pending approvals list.
- A confirmation indicator is shown.

---

### VAL-CLIP-005 — Approval History Log

**Title:** User can browse the full history of governance decisions.

**Behavioral Description:**  
A history view shows all governance requests (approved, rejected, expired, and pending) for the company. Each entry displays the request type, description, who decided, when, the decision note, and the original estimated cost. The list supports filtering by status and request type.

**Evidence Requirements:**
- `GET /api/companies/:companyId/governance` returns all requests regardless of status.
- The view supports filtering by `status` (pending, approved, rejected, expired) and `requestType`.
- Each history entry shows: `requestType`, `description`, `status`, `decidedBy`, `decidedAt`, `decisionNote`, `estimatedCostUsd`.
- Expired requests (where `expiresAt < now` and status is still pending) are visually distinguished.
- Pagination or infinite scroll is supported for large histories.

---

### VAL-CLIP-006 — Nothing Proceeds Without Sign-off

**Title:** Actions gated by governance cannot proceed without explicit human approval.

**Behavioral Description:**  
When a governance-gated action is initiated (hire agent, fire agent, budget override, swarm approval, escalation, tool access, strategy change), the system creates a `governance_requests` row with `status = "pending"`. The downstream action (e.g., swarm moving past `pending_approval` phase, agent being hired) is blocked until the request is approved. Rejected requests halt the action permanently. Expired requests do not auto-approve.

**Evidence Requirements:**
- Creating a swarm with governance required results in `swarm_runs.status = "pending_approval"` until the corresponding governance request is approved.
- Approving the governance request triggers the swarm to proceed to `spawning`.
- Rejecting the governance request does NOT allow the action to proceed.
- Expired governance requests (past `expiresAt`) do not auto-approve; the action remains blocked.
- The UI shows a "Waiting for approval" indicator on gated actions.
- No API endpoint allows bypassing the governance gate for gated request types.

---

### VAL-CLIP-007 — Double-Decision Prevention

**Title:** A governance request that has already been decided cannot be decided again.

**Behavioral Description:**  
If a user attempts to approve or reject a governance request that is no longer in `pending` status, the API returns a `409 Conflict` and the UI displays an appropriate error message indicating the request was already resolved.

**Evidence Requirements:**
- `POST .../approve` on an already-approved request returns HTTP 409 with message `Request already approved`.
- `POST .../reject` on an already-rejected request returns HTTP 409 with message `Request already rejected`.
- The UI disables the approve/reject buttons for non-pending requests.
- Concurrent approvals from two users result in one success and one 409.

---

## 2. Field Mode (Mobile-First UX)

### VAL-CLIP-010 — Mobile Viewport Layout

**Title:** The UI renders correctly and is fully usable on mobile viewports (≤ 428px width).

**Behavioral Description:**  
When accessed from a mobile browser or a viewport of 428px or narrower, the Clipboard UI adapts to a single-column layout. Navigation collapses to a bottom tab bar or hamburger menu. All content is readable without horizontal scrolling. Font sizes, spacing, and touch targets follow mobile-first responsive design principles.

**Evidence Requirements:**
- The layout passes visual inspection at 375px (iPhone SE), 390px (iPhone 14), and 428px (iPhone 14 Pro Max) widths.
- No horizontal scroll overflow occurs.
- Navigation is accessible via bottom tab bar or collapsible menu.
- Text is legible without zooming (minimum 16px base font).
- The viewport meta tag is set: `<meta name="viewport" content="width=device-width, initial-scale=1">`.

---

### VAL-CLIP-011 — Touch-Friendly Action Buttons

**Title:** All interactive elements meet minimum touch target sizes for mobile.

**Behavioral Description:**  
All buttons, links, and interactive controls in Field Mode have a minimum touch target of 44×44 CSS pixels (per Apple HIG) with adequate spacing between adjacent targets to prevent mis-taps. Approve and reject buttons are prominently sized and color-coded (green/red).

**Evidence Requirements:**
- All tappable elements are at least 44×44px.
- Approve button is visually green-coded; reject button is red-coded.
- Adjacent interactive elements have at least 8px spacing between touch targets.
- No overlapping tap zones exist in the mobile layout.
- Buttons include both icon and label for clarity.

---

### VAL-CLIP-012 — Quick Status Overview Dashboard

**Title:** Field Mode displays a glanceable status summary on the home screen.

**Behavioral Description:**  
The Field Mode home screen shows a dashboard card layout with: total active agents count, pending approvals count (with badge), active swarm runs count, budget utilization percentage (used/total), and any active budget alerts. Each card is tappable and navigates to the relevant detail view.

**Evidence Requirements:**
- Dashboard shows: active agents count (from `agents` where `status != 'terminated'`), pending governance requests count, active swarm runs count (status in executing/spawning/synthesizing), budget used vs. monthly budget as percentage.
- Pending approvals count is displayed with a prominent notification badge if > 0.
- Budget utilization shows a color-coded progress bar (green < 75%, yellow 75-90%, red > 90%).
- Each card navigates to its respective list view on tap.
- Data refreshes on pull-to-refresh or at a reasonable polling interval.

---

### VAL-CLIP-013 — One-Tap Approve/Reject

**Title:** Users can approve or reject governance requests with a single tap from the pending list.

**Behavioral Description:**  
In Field Mode, the pending approvals list shows each request as a card with inline "Approve" and "Reject" buttons. Tapping "Approve" immediately submits approval (with a default note or a quick-entry modal). Tapping "Reject" presents a mandatory reason input before submission. A confirmation feedback (haptic if supported, visual always) is shown.

**Evidence Requirements:**
- Approve action requires at most one tap plus optional note.
- Reject action requires one tap plus a mandatory reason entry (minimal keyboard input).
- Visual feedback (success animation, color change, or toast) confirms the action.
- The card animates out of the pending list after successful action.
- Undo option is available for 5 seconds after accidental approval (calls reject to reverse, if still pending in backend).

---

### VAL-CLIP-014 — Swipe Gesture Support

**Title:** Swipe gestures provide quick actions on list items in Field Mode.

**Behavioral Description:**  
In list views (pending approvals, agent list, task list), the user can swipe right to approve (or perform the primary action) and swipe left to reject (or perform the secondary action). Swipe reveals a color-coded action panel. Full swipe executes the action; partial swipe reveals buttons.

**Evidence Requirements:**
- Right swipe on a pending governance request reveals a green "Approve" action.
- Left swipe on a pending governance request reveals a red "Reject" action.
- Partial swipe (< 50% of card width) reveals the action button without executing.
- Full swipe (≥ 50% of card width) executes the action with confirmation.
- Swipe is disabled for non-actionable items (already decided requests).
- Swipe works on touch devices; desktop users see hover-revealed action buttons instead.

---

### VAL-CLIP-015 — Offline Resilience Indicator

**Title:** Field Mode indicates network status and queues actions when offline.

**Behavioral Description:**  
When the device loses network connectivity, Field Mode shows a visible offline indicator banner. Read operations display cached data (last-fetched state). Write operations (approve, reject) are queued locally and retried when connectivity returns. The user is informed that actions are pending sync.

**Evidence Requirements:**
- An offline banner is displayed when `navigator.onLine === false` or fetch requests fail.
- Cached dashboard data is displayed with a "last updated at" timestamp.
- Queued actions show a "pending sync" badge.
- Actions are retried automatically on reconnection.
- Conflicting actions (e.g., request expired while offline) display an error on sync.

---

## 3. Board Templates

### VAL-CLIP-020 — Browse Available Templates

**Title:** User can browse a catalog of pre-built board templates.

**Behavioral Description:**  
A templates gallery displays all available board templates with a name, icon/illustration, short description, and a preview of what will be created (number of agents, goals, estimated monthly budget). The templates include: Content Agency Clipboard, SaaS Launch Clipboard, Bug Hunt Clipboard, Research Clipboard, and Shopify Operator Clipboard.

**Evidence Requirements:**
- All five templates are listed: Content Agency, SaaS Launch, Bug Hunt, Research, Shopify Operator.
- Each template card shows: name, description, agent count, goal count, and estimated monthly budget.
- Templates are visually differentiated (unique icon or color per template).
- The gallery is accessible from the main navigation or an onboarding flow.

---

### VAL-CLIP-021 — Preview Template Contents

**Title:** User can inspect the full contents of a template before creating a company.

**Behavioral Description:**  
When a user selects a template, a preview view shows all pre-configured entities: the company settings (name pattern, mission, budget), each agent (name, role, title, level, model, budget, tools), each goal (title, description, priority, assignments), and any pre-set governance rules. The user can review everything before committing.

**Evidence Requirements:**
- Preview displays company fields: name, mission, `budgetMonthlyUsd`.
- Preview lists all agents with: `name`, `role`, `title`, `level`, `model`, `budgetMonthlyUsd`, `tools`.
- Preview lists all goals with: `title`, `description`, `priority`, `assignedTo` (agent name).
- Agent hierarchy (manager relationships) is visualized.
- A "Create" button is prominently placed after review.
- User can go back to the gallery without creating.

---

### VAL-CLIP-022 — Create Company from Template

**Title:** Applying a template creates a fully configured company with all agents and goals.

**Behavioral Description:**  
When the user confirms template creation (optionally customizing the company name), the system creates: one `companies` row with the template's budget and mission, all `agents` rows with correct hierarchy (`managerId` links), and all `goals` rows assigned to the appropriate agents. The user is redirected to the new company's dashboard.

**Evidence Requirements:**
- `POST` to a template application endpoint (or sequential creates) results in one new company, N agents, and M goals in the database.
- All agent `managerId` references are correctly set (hierarchy intact).
- All goal `assignedTo` references point to valid agents in the new company.
- Agent `budgetMonthlyUsd` values sum to ≤ company `budgetMonthlyUsd`.
- The operation is atomic — partial failure rolls back all inserts.
- User is navigated to the newly created company dashboard.
- The new company appears in the company list.

---

### VAL-CLIP-023 — Content Agency Template Specification

**Title:** The Content Agency Clipboard template creates the correct agent roster and goals.

**Behavioral Description:**  
The Content Agency template creates a company with agents suited for content production workflows: a Content Director (manager), Content Strategist, SEO Specialist, Copywriter, Visual Designer, and Social Media Manager. Goals include content calendar creation, SEO audit, brand voice development, and content pipeline setup.

**Evidence Requirements:**
- At least 5 agents are created with distinct roles relevant to content production.
- One agent is designated as the top-level manager (`managerId` is null).
- All other agents reference the manager via `managerId`.
- Goals cover content strategy, SEO, writing, and distribution.
- Agent tools include content-relevant tools (e.g., "web_search", "write_document", "analyze_seo").
- Budget allocation is proportional to role seniority.

---

### VAL-CLIP-024 — SaaS Launch Template Specification

**Title:** The SaaS Launch Clipboard template creates the correct agent roster and goals.

**Behavioral Description:**  
The SaaS Launch template creates a company for product launch operations: a Launch Director, Product Manager, Growth Marketer, Technical Writer, QA Lead, and DevOps Agent. Goals include launch checklist completion, documentation, marketing campaign setup, and infrastructure readiness.

**Evidence Requirements:**
- At least 5 agents are created with roles relevant to SaaS product launch.
- Agent hierarchy reflects a launch team reporting structure.
- Goals cover product readiness, documentation, marketing, and infrastructure.
- Budget reflects launch-phase spending patterns.

---

### VAL-CLIP-025 — Bug Hunt Template Specification

**Title:** The Bug Hunt Clipboard template creates the correct agent roster and goals.

**Behavioral Description:**  
The Bug Hunt template creates a company for bug triage and resolution: a QA Lead (manager), Bug Triager, Frontend Debugger, Backend Debugger, Performance Analyst, and Regression Tester. Goals include bug backlog triage, critical bug resolution, performance profiling, and regression test suite completion.

**Evidence Requirements:**
- At least 5 agents are created with roles relevant to quality assurance and debugging.
- Goals focus on bug identification, triage, resolution, and prevention.
- Agent tools include debugging-relevant tools (e.g., "read_code", "run_tests", "analyze_logs").
- Budget is modest (debugging is lower-cost than content generation).

---

### VAL-CLIP-026 — Research Template Specification

**Title:** The Research Clipboard template creates the correct agent roster and goals.

**Behavioral Description:**  
The Research template creates a company for research operations: a Research Director, Literature Reviewer, Data Analyst, Hypothesis Generator, Experiment Designer, and Report Writer. Goals include literature review, data collection, analysis, and synthesis report.

**Evidence Requirements:**
- At least 5 agents with roles relevant to research workflows.
- Goals cover the research lifecycle: review, data gathering, analysis, reporting.
- Agent tools include research-relevant tools (e.g., "web_search", "analyze_data", "write_report").
- Agent hierarchy reflects a research team structure.

---

### VAL-CLIP-027 — Shopify Operator Template Specification

**Title:** The Shopify Operator Clipboard template creates the correct agent roster and goals.

**Behavioral Description:**  
The Shopify Operator template creates a company for e-commerce operations: a Store Manager (manager), Product Listing Agent, Inventory Tracker, Customer Support Agent, Marketing Automator, and Analytics Agent. Goals include product catalog update, inventory optimization, customer response SLA, and sales reporting.

**Evidence Requirements:**
- At least 5 agents with roles relevant to Shopify/e-commerce operations.
- Goals cover product management, inventory, customer support, and analytics.
- Agent tools include e-commerce-relevant tools (e.g., "update_product", "check_inventory", "send_email").
- Budget reflects ongoing operational spend patterns.

---

### VAL-CLIP-028 — Template Idempotency and Isolation

**Title:** Creating from the same template multiple times produces independent companies.

**Behavioral Description:**  
Each template application creates a completely independent company with its own agents and goals. No shared references exist between companies created from the same template. Deleting one company does not affect another created from the same template.

**Evidence Requirements:**
- Two companies created from the same template have different `companies.id` values.
- Agents in company A do not reference agents or goals in company B.
- All IDs are unique UUIDs across template applications.
- Modifying agents/goals in one company does not affect the other.

---

## 4. Assignment Sheets (Per-Agent Detail View)

### VAL-CLIP-030 — Navigate to Agent Assignment Sheet

**Title:** User can navigate to any agent's assignment sheet from the company view.

**Behavioral Description:**  
From the company dashboard or agent list, the user clicks on an agent to open their assignment sheet — a dedicated detail page showing all agent-specific information. The agent is identifiable by name, role, and sprite in the navigation.

**Evidence Requirements:**
- Each agent in the company list/grid is clickable and navigates to `/companies/:companyId/agents/:agentId` (or equivalent route).
- The assignment sheet loads without error for any agent in any company.
- The page title or header shows the agent's `name` and `role`.
- A back/breadcrumb navigation returns the user to the company view.

---

### VAL-CLIP-031 — Role and Reporting Line Display

**Title:** The assignment sheet displays the agent's role, title, level, and reporting chain.

**Behavioral Description:**  
The top section of the assignment sheet shows the agent's `role`, `title`, `level`, and the full management chain (walking `managerId` up to the root agent). The manager's name is a link to their own assignment sheet.

**Evidence Requirements:**
- Fields displayed: `name`, `role`, `title`, `level`, `model`, `spriteKey` (as avatar).
- `managerId` is resolved to the manager's name and displayed as "Reports to: [Manager Name]".
- If `managerId` is null, display "Top-level / No manager".
- Manager name is a clickable link to the manager's assignment sheet.
- The full reporting chain (agent → manager → manager's manager → … → root) is navigable.

---

### VAL-CLIP-032 — Objective and Tools Display

**Title:** The assignment sheet shows the agent's assigned goals and available tools.

**Behavioral Description:**  
A section lists all goals assigned to this agent (`goals.assignedTo = agentId`) with their status and priority. Another section lists the agent's available tools from the `tools` JSONB array, with descriptions if available. The system prompt summary is shown (collapsed by default for length).

**Evidence Requirements:**
- Goals section queries `goals` where `assignedTo = :agentId` and displays `title`, `status`, `priority`, `dueAt`.
- Goals are sorted by priority (highest first) then status.
- Tools section renders each tool from `agents.tools` as a badge or list item.
- System prompt is available in an expandable/collapsible section.
- If no goals are assigned, a "No objectives assigned" empty state is shown.

---

### VAL-CLIP-033 — Monthly Budget Ceiling and Usage

**Title:** The assignment sheet displays budget allocation and current usage.

**Behavioral Description:**  
A budget section shows `budgetMonthlyUsd` (ceiling), `budgetUsedUsd` (current spend), remaining budget, and utilization percentage. A visual progress bar indicates spend level with color coding. Related budget alerts for this agent are shown inline.

**Evidence Requirements:**
- Displays: `budgetMonthlyUsd`, `budgetUsedUsd`, remaining (`budgetMonthlyUsd - budgetUsedUsd`), and percentage used.
- Progress bar color: green (< 75%), yellow (75-90%), red (> 90%).
- Budget alerts for this agent (from `budget_alerts` where `agentId = :agentId`) are displayed with `alertType` and `message`.
- If budget is exceeded (used > monthly), a prominent warning is shown.
- Budget values are formatted as USD currency (e.g., "$12.50").

---

### VAL-CLIP-034 — Current Status and Outputs Display

**Title:** The assignment sheet shows the agent's current operational status.

**Behavioral Description:**  
A status section displays the agent's current `status` (idle, thinking, executing, waiting_approval, error, circuit_open, terminated) with an appropriate icon and color. If the agent is in a swarm run, the swarm details are linked. The last heartbeat time and next scheduled heartbeat are shown.

**Evidence Requirements:**
- Agent `status` is displayed with visual indicator (color-coded badge/icon).
- Status meanings are clear: idle (grey), thinking (blue/animated), executing (green/animated), waiting_approval (yellow), error (red), circuit_open (orange), terminated (dark/strikethrough).
- `nextHeartbeatAt` is displayed as a countdown or absolute time.
- If the agent is participating in an active swarm, a link to the swarm run is shown.
- `circuitBreaker` state from the company level is reflected if the agent's circuit is open.

---

### VAL-CLIP-035 — Heartbeat Run History

**Title:** The assignment sheet shows a chronological history of the agent's heartbeat runs.

**Behavioral Description:**  
A history section lists the agent's heartbeat execution records from `heartbeat_agent_runs`, showing each run's status (queued, running, succeeded, failed, skipped), decision summary, cost, latency, and timestamps. The list is paginated and sorted by most recent first.

**Evidence Requirements:**
- Data is fetched from `heartbeat_agent_runs` joined with `heartbeat_runs` for the given `agentId`.
- Each entry shows: `status`, `decision` (summarized from JSONB), `costUsd`, `latencyMs`, `startedAt`, `completedAt`.
- Failed runs display the `error` field.
- Skipped runs show reason if available in `decision`.
- The parent `heartbeat_runs` trigger type (scheduled, manual, event) is indicated.
- List is paginated (10-20 items per page) and sorted `startedAt` descending.

---

### VAL-CLIP-036 — Tool Call History

**Title:** The assignment sheet shows a chronological history of the agent's tool calls.

**Behavioral Description:**  
A tool calls section lists records from `tool_calls` for the agent, showing tool name, input summary, output summary, cost, latency, and trace IDs. Entries can be expanded to see full input/output JSON. The list supports filtering by tool name and time range.

**Evidence Requirements:**
- Data is fetched from `tool_calls` where `agentId = :agentId`, ordered by `createdAt` descending.
- Each entry shows: `toolName`, `costUsd`, `latencyMs`, `inputTokens`, `outputTokens`, `createdAt`.
- Expandable detail shows full `input` and `output` JSON.
- Trace linkage: `traceId`, `spanId`, `parentSpanId` are displayed for observability.
- Filter by `toolName` is supported (dropdown of distinct tool names used).
- Total cost across all tool calls is displayed as a summary.

---

### VAL-CLIP-037 — Budget Usage Breakdown on Assignment Sheet

**Title:** The assignment sheet provides a breakdown of budget spend by category.

**Behavioral Description:**  
The budget section includes a breakdown of spending by tool calls (aggregated from `tool_calls.costUsd`), by heartbeat runs, and by swarm participation. This gives the operator visibility into where the agent's budget is being consumed.

**Evidence Requirements:**
- Total spend from `tool_calls` where `agentId = :agentId` matches or explains `budgetUsedUsd`.
- Breakdown categories: heartbeat execution costs, swarm participation costs, individual tool call costs.
- A simple chart (bar or pie) visualizes the spending distribution.
- Spend over time (daily or weekly) is available as a trend line.

---

## 5. Notifications — Pending Approvals Prominence

### VAL-CLIP-040 — Global Pending Approvals Badge

**Title:** A persistent notification badge shows the count of pending governance requests.

**Behavioral Description:**  
Across all views (not just Field Mode), a notification badge on the navigation element shows the count of pending governance requests for the current company. The badge updates in real-time via the SSE event stream (`GET /companies/:companyId/events`). The badge is visible on both desktop and mobile layouts.

**Evidence Requirements:**
- A badge/counter is visible in the main navigation (header, sidebar, or tab bar).
- The count matches `SELECT COUNT(*) FROM governance_requests WHERE companyId = :companyId AND status = 'pending'`.
- The badge updates when a new governance request is created (via SSE event).
- The badge decrements when a request is approved or rejected (via SSE event).
- The badge is hidden (not shown as "0") when there are no pending requests.
- Tapping the badge navigates to the pending approvals list.

---

### VAL-CLIP-041 — Pending Approval Urgency Indicators

**Title:** Governance requests nearing expiration are surfaced with urgency indicators.

**Behavioral Description:**  
Pending governance requests are visually ranked by urgency based on remaining TTL. Requests with < 1 hour remaining show a red/urgent indicator. Requests with < 4 hours show yellow/warning. The most urgent requests appear first in the pending list and may trigger a push notification or prominent in-app alert.

**Evidence Requirements:**
- Urgency is calculated as `expiresAt - now()`.
- Red/urgent indicator when remaining time < 1 hour.
- Yellow/warning indicator when remaining time < 4 hours.
- Default/neutral indicator when remaining time ≥ 4 hours.
- The pending list sorts by urgency (most urgent first) by default.
- An in-app alert (banner or modal) appears when a request has < 30 minutes remaining and has not been viewed.

---

### VAL-CLIP-042 — SSE Event Integration for Real-Time Updates

**Title:** Sign-off and notification features receive real-time updates via SSE.

**Behavioral Description:**  
The UI subscribes to `GET /api/companies/:companyId/events` (SSE endpoint). When governance requests are created, approved, rejected, or expire, the event stream pushes updates. The pending list, approval history, notification badge, and dashboard counts all update without manual page refresh.

**Evidence Requirements:**
- SSE connection is established on company view mount.
- Events of type `governance_request_created`, `governance_request_decided` (or equivalent) trigger UI updates.
- The pending approvals list adds/removes items in response to SSE events.
- The notification badge count updates in response to SSE events.
- The dashboard quick status cards update in response to SSE events.
- SSE reconnects automatically after connection drops (with exponential backoff).
- SSE ping every 30 seconds keeps the connection alive (per existing implementation).

---

### VAL-CLIP-043 — Expired Request Handling

**Title:** Expired governance requests are surfaced and do not silently disappear.

**Behavioral Description:**  
When a governance request's `expiresAt` passes while it is still pending, the system marks it as expired. The UI moves it from the pending list to a "recently expired" section. The user is notified that a request expired without action. Expired requests can be re-created if the underlying need still exists.

**Evidence Requirements:**
- Expired requests (`expiresAt < now AND status = 'pending'`) are visually distinguished from active pending requests.
- A "Recently Expired" section or filter shows expired requests.
- An in-app notification is triggered when a request expires.
- Expired requests show a "Re-create" action button that pre-fills a new governance request with the same parameters.
- The notification badge does NOT count expired requests (only truly pending ones).

---

## Summary

| ID | Area | Title |
|----|------|-------|
| VAL-CLIP-001 | Sign-off Flow | List Pending Governance Approvals |
| VAL-CLIP-002 | Sign-off Flow | Review Governance Request Details |
| VAL-CLIP-003 | Sign-off Flow | Approve Governance Request with Note |
| VAL-CLIP-004 | Sign-off Flow | Reject Governance Request with Reason |
| VAL-CLIP-005 | Sign-off Flow | Approval History Log |
| VAL-CLIP-006 | Sign-off Flow | Nothing Proceeds Without Sign-off |
| VAL-CLIP-007 | Sign-off Flow | Double-Decision Prevention |
| VAL-CLIP-010 | Field Mode | Mobile Viewport Layout |
| VAL-CLIP-011 | Field Mode | Touch-Friendly Action Buttons |
| VAL-CLIP-012 | Field Mode | Quick Status Overview Dashboard |
| VAL-CLIP-013 | Field Mode | One-Tap Approve/Reject |
| VAL-CLIP-014 | Field Mode | Swipe Gesture Support |
| VAL-CLIP-015 | Field Mode | Offline Resilience Indicator |
| VAL-CLIP-020 | Board Templates | Browse Available Templates |
| VAL-CLIP-021 | Board Templates | Preview Template Contents |
| VAL-CLIP-022 | Board Templates | Create Company from Template |
| VAL-CLIP-023 | Board Templates | Content Agency Template Specification |
| VAL-CLIP-024 | Board Templates | SaaS Launch Template Specification |
| VAL-CLIP-025 | Board Templates | Bug Hunt Template Specification |
| VAL-CLIP-026 | Board Templates | Research Template Specification |
| VAL-CLIP-027 | Board Templates | Shopify Operator Template Specification |
| VAL-CLIP-028 | Board Templates | Template Idempotency and Isolation |
| VAL-CLIP-030 | Assignment Sheets | Navigate to Agent Assignment Sheet |
| VAL-CLIP-031 | Assignment Sheets | Role and Reporting Line Display |
| VAL-CLIP-032 | Assignment Sheets | Objective and Tools Display |
| VAL-CLIP-033 | Assignment Sheets | Monthly Budget Ceiling and Usage |
| VAL-CLIP-034 | Assignment Sheets | Current Status and Outputs Display |
| VAL-CLIP-035 | Assignment Sheets | Heartbeat Run History |
| VAL-CLIP-036 | Assignment Sheets | Tool Call History |
| VAL-CLIP-037 | Assignment Sheets | Budget Usage Breakdown on Assignment Sheet |
| VAL-CLIP-040 | Notifications | Global Pending Approvals Badge |
| VAL-CLIP-041 | Notifications | Pending Approval Urgency Indicators |
| VAL-CLIP-042 | Notifications | SSE Event Integration for Real-Time Updates |
| VAL-CLIP-043 | Notifications | Expired Request Handling |

**Total assertions: 34**

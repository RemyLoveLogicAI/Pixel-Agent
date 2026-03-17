# Pixel-Agent — UI Design Constraints

Opinionated constraints for building interfaces in the mockup sandbox. Derived from UI Skills philosophy and project context.

---

## Layout Principles

- **Information density**: Agent dashboards are data-heavy. Use compact tables, dense grids, and collapsible panels — not spacious marketing layouts.
- **Spatial hierarchy**: Primary actions (approve, reject, claim) must be immediately reachable. Secondary info (traces, logs) lives in expandable sections.
- **Responsive breakpoints**: Desktop-first (1280px+), tablet support (768px), no mobile optimization needed for v1.

## Color System

- **Dark-first**: All dashboards use dark theme as primary. Light theme is secondary.
- **Status encoding**: Use color consistently for agent/swarm states:
  - Active/Running: cyan/teal
  - Pending/Queued: amber
  - Completed/Success: green
  - Failed/Error: red
  - Idle/Dormant: gray
- **Budget alerts**: Red for overspend, amber for approaching limit, green for healthy.

## Typography

- **Monospace for data**: Agent IDs, trace IDs, timestamps, JSON payloads, and budget figures use monospace.
- **Sans-serif for labels**: Navigation, headings, and descriptive text use the system sans-serif stack.
- **Size hierarchy**: 14px base, 12px for dense tables, 16px for section headers, 24px for page titles.

## Component Patterns

- **Tables over cards** for list views (agents, tasks, goals) — scannable and sortable.
- **Cards for summaries** (company dashboard, budget overview) — key metrics at a glance.
- **Tree views** for hierarchical data (goals, org chart, agent hierarchy).
- **Timeline/log views** for traces, heartbeat runs, and swarm messages.
- **Badges** for status indicators — always color-coded per status encoding above.

## Interaction Patterns

- **Optimistic UI**: Show immediate feedback on actions, roll back on error.
- **Polling for async ops**: Swarm creation (202) and heartbeat results use polling indicators, not spinners.
- **SSE for real-time**: Event stream panel shows live agent activity without page refresh.
- **Confirmation for destructive actions**: Fire agent, cancel swarm, budget override require explicit confirmation dialogs.

## Existing Component Library

The mockup sandbox includes 55+ shadcn/ui components. Use them as-is. Do not create custom components when a shadcn/ui primitive exists.

## Mockup Components

| Component | Domain |
|-----------|--------|
| AgentRoster | Agent management |
| BudgetDashboard | Budget monitoring |
| CompanyDashboard | Company overview |
| GoalsTree | Goal hierarchy |
| GovernanceQueue | Approval workflows |
| HeartbeatPanel | Agent heartbeat monitoring |
| OrgChart | Agent hierarchy visualization |
| SwarmControl | Swarm lifecycle management |
| TaskBoard | Task queue management |
| Shell | App shell / layout wrapper |

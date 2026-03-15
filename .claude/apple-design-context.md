# Apple Design Context

## Product
- **Name**: Pixel-Agent
- **Description**: Platform for managing autonomous agent swarms with governance, budgeting, task orchestration, and observability
- **Category**: Productivity / Developer Tools
- **Stage**: Development

## Platforms
| Platform | Supported | Min OS | Notes |
|----------|-----------|--------|-------|
| iOS      | No        |        | Web-first, responsive design |
| iPadOS   | No        |        | Accessible via web browser |
| macOS    | No        |        | Accessible via web browser |
| tvOS     | No        |        |       |
| watchOS  | No        |        |       |
| visionOS | No        |        |       |

> **Note**: Pixel-Agent is a React + TypeScript web application. Apple HIG principles are applied as design guidance for visual consistency, spatial hierarchy, and interaction patterns — not as native platform requirements.

## Technology
- **UI Framework**: React + TypeScript + Vite (web)
- **Architecture**: Single-page application with REST API backend
- **Apple Technologies**: None (web-based)
- **Backend**: Express 5, PostgreSQL, Drizzle ORM

## Design System
- **Base**: Custom design system (agent/swarm visualization theme)
- **Brand Colors**: To be defined — dark theme primary, accent cyan for agent activity
- **Typography**: System fonts / monospace for data-heavy views
- **Dark Mode**: Primary theme (dark-first for monitoring dashboards)
- **Dynamic Type**: N/A (web) — responsive font scaling recommended

## Accessibility
- **Target Level**: Enhanced
- **Key Considerations**: High-contrast for dashboard monitoring, keyboard navigation for agent management, screen reader support for status updates
- **Regulatory Requirements**: WCAG 2.1 AA

## Users
- **Primary Persona**: DevOps/AI engineer managing autonomous agent fleets
- **Key Use Cases**: Monitor agent swarms, approve governance requests, manage budgets, trace agent decisions
- **Known Challenges**: Information density (many agents, many metrics), real-time status updates, complex hierarchical data

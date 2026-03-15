# Pixel-Agent — Product Definition

## Overview
Pixel-Agent is a platform for managing autonomous agent swarms — with governance, budgeting, task orchestration, and observability. The primary artifact is an Express 5 API server backed by PostgreSQL via Drizzle ORM.

## Vision
A multi-tenant control plane where organizations deploy, monitor, and govern fleets of AI agents that autonomously execute tasks within defined budget and permission boundaries.

## Core Domains

| Domain | Description |
|--------|-------------|
| **Agent Management** | Hierarchical agents with roles, budgets, and capability tokens |
| **Task Orchestration** | Queued tasks with optimistic locking and claim mechanics |
| **Swarm Engine** | Multi-agent orchestration with 6-phase lifecycle |
| **Governance** | Approval workflows for hire, fire, budget override, swarm approval |
| **Budget Control** | Per-agent and per-company monthly budgets with alerts |
| **Observability** | Heartbeat monitoring, circuit breakers, OpenTelemetry traces |
| **Visualization** | Pixel-art office view with sprite-based agent representation |

## Tech Stack
- **Runtime**: Node.js + TypeScript
- **API**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod
- **Frontend**: React + Vite (mockup sandbox)
- **Build**: pnpm monorepo + esbuild

## Stage
Active development — API server and database schema are built, UI mockups in progress, agent executor is a stub (no LLM integration yet).

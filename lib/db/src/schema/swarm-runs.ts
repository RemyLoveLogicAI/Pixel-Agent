import { pgTable, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { goalsTable } from "./goals";
import { agentsTable } from "./agents";

export const swarmRunsTable = pgTable("swarm_runs", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companiesTable.id),
  goalId: text("goal_id").references(() => goalsTable.id),
  leaderAgentId: text("leader_agent_id").references(() => agentsTable.id),
  taskDescription: text("task_description").notNull(),
  phase: text("phase", {
    enum: ["proposed", "pending_approval", "spawning", "executing", "synthesizing", "completed", "failed", "dissolved", "cancelled"],
  }).default("proposed").notNull(),
  specialistRoles: jsonb("specialist_roles"),
  synthesisResult: jsonb("synthesis_result"),
  totalCostUsd: real("total_cost_usd"),
  maxAgents: integer("max_agents").default(5).notNull(),
  timeoutSec: integer("timeout_sec").default(300).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertSwarmRunSchema = createInsertSchema(swarmRunsTable).omit({ createdAt: true });
export type InsertSwarmRun = z.infer<typeof insertSwarmRunSchema>;
export type SwarmRun = typeof swarmRunsTable.$inferSelect;

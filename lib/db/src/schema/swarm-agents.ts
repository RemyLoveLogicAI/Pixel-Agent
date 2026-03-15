import { pgTable, text, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { swarmRunsTable } from "./swarm-runs";

export const swarmAgentsTable = pgTable("swarm_agents", {
  id: text("id").primaryKey(),
  swarmRunId: text("swarm_run_id").notNull().references(() => swarmRunsTable.id),
  role: text("role").notNull(),
  model: text("model").notNull(),
  systemPrompt: text("system_prompt"),
  status: text("status", { enum: ["spawned", "executing", "completed", "failed"] }).notNull(),
  output: jsonb("output"),
  costUsd: real("cost_usd"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertSwarmAgentSchema = createInsertSchema(swarmAgentsTable).omit({ createdAt: true });
export type InsertSwarmAgent = z.infer<typeof insertSwarmAgentSchema>;
export type SwarmAgent = typeof swarmAgentsTable.$inferSelect;

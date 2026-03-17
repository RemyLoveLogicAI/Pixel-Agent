import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { goalsTable } from "./goals";
import { agentsTable } from "./agents";

export const agentTasksTable = pgTable("agent_tasks", {
  id: text("id").primaryKey(),
  goalId: text("goal_id").references(() => goalsTable.id),
  companyId: text("company_id").notNull().references(() => companiesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  claimedBy: text("claimed_by").references(() => agentsTable.id),
  status: text("status", {
    enum: ["pending", "claimed", "in_progress", "review", "done", "failed", "cancelled"],
  }).default("pending").notNull(),
  version: integer("version").notNull().default(0),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentTaskSchema = createInsertSchema(agentTasksTable).omit({ createdAt: true, updatedAt: true });
export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;
export type AgentTask = typeof agentTasksTable.$inferSelect;

import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const heartbeatRunsTable = pgTable("heartbeat_runs", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companiesTable.id),
  trigger: text("trigger", { enum: ["scheduled", "manual", "event"] }).default("scheduled").notNull(),
  status: text("status", { enum: ["running", "completed", "partial_failure", "failed"] }).notNull(),
  agentsTotal: integer("agents_total"),
  agentsSucceeded: integer("agents_succeeded"),
  agentsFailed: integer("agents_failed"),
  totalCostUsd: real("total_cost_usd"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertHeartbeatRunSchema = createInsertSchema(heartbeatRunsTable);
export type InsertHeartbeatRun = z.infer<typeof insertHeartbeatRunSchema>;
export type HeartbeatRun = typeof heartbeatRunsTable.$inferSelect;

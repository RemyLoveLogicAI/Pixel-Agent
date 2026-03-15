import { pgTable, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { heartbeatRunsTable } from "./heartbeat-runs";
import { agentsTable } from "./agents";

export const heartbeatAgentRunsTable = pgTable("heartbeat_agent_runs", {
  id: text("id").primaryKey(),
  heartbeatRunId: text("heartbeat_run_id").notNull().references(() => heartbeatRunsTable.id),
  agentId: text("agent_id").notNull().references(() => agentsTable.id),
  status: text("status", { enum: ["queued", "running", "succeeded", "failed", "skipped"] }).notNull(),
  decision: jsonb("decision"),
  costUsd: real("cost_usd"),
  latencyMs: integer("latency_ms"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertHeartbeatAgentRunSchema = createInsertSchema(heartbeatAgentRunsTable);
export type InsertHeartbeatAgentRun = z.infer<typeof insertHeartbeatAgentRunSchema>;
export type HeartbeatAgentRun = typeof heartbeatAgentRunsTable.$inferSelect;

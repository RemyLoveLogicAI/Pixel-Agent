import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const workflowRunsTable = pgTable("workflow_runs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspacesTable.id),
  kind: text("kind", { enum: ["skill_run", "swarm_run_bridge", "heartbeat_bridge"] }).notNull(),
  status: text("status", { enum: ["running", "paused", "completed", "failed", "cancelled"] })
    .notNull()
    .default("running"),
  input: jsonb("input"),
  output: jsonb("output"),
  traceId: text("trace_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertWorkflowRunSchema = createInsertSchema(workflowRunsTable).omit({
  createdAt: true,
});
export type InsertWorkflowRun = z.infer<typeof insertWorkflowRunSchema>;
export type WorkflowRun = typeof workflowRunsTable.$inferSelect;


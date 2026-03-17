import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workflowRunsTable } from "./workflow-runs";

export const workflowStepsTable = pgTable("workflow_steps", {
  id: text("id").primaryKey(),
  workflowRunId: text("workflow_run_id")
    .notNull()
    .references(() => workflowRunsTable.id),
  idx: integer("idx").notNull(),
  name: text("name").notNull(),
  status: text("status", { enum: ["pending", "running", "blocked", "completed", "failed"] })
    .notNull()
    .default("pending"),
  requiresApproval: integer("requires_approval").notNull().default(0),
  governanceRequestId: text("governance_request_id"),
  input: jsonb("input"),
  output: jsonb("output"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertWorkflowStepSchema = createInsertSchema(workflowStepsTable);
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;
export type WorkflowStep = typeof workflowStepsTable.$inferSelect;


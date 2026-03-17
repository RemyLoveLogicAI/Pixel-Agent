import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { heartbeatRunsTable } from "./heartbeat-runs";
import { agentsTable } from "./agents";

export const heartbeatDeadLettersTable = pgTable("heartbeat_dead_letters", {
  id: text("id").primaryKey(),
  heartbeatRunId: text("heartbeat_run_id").notNull().references(() => heartbeatRunsTable.id),
  agentId: text("agent_id").notNull().references(() => agentsTable.id),
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  nextRetryAt: timestamp("next_retry_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHeartbeatDeadLetterSchema = createInsertSchema(heartbeatDeadLettersTable).omit({ createdAt: true });
export type InsertHeartbeatDeadLetter = z.infer<typeof insertHeartbeatDeadLetterSchema>;
export type HeartbeatDeadLetter = typeof heartbeatDeadLettersTable.$inferSelect;

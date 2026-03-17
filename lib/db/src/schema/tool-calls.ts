import { pgTable, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentsTable } from "./agents";
import { companiesTable } from "./companies";

export const toolCallsTable = pgTable("tool_calls", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => agentsTable.id),
  companyId: text("company_id").notNull().references(() => companiesTable.id),
  heartbeatAgentRunId: text("heartbeat_agent_run_id"),
  swarmAgentId: text("swarm_agent_id"),
  toolName: text("tool_name").notNull(),
  input: jsonb("input"),
  output: jsonb("output"),
  model: text("model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costUsd: real("cost_usd"),
  latencyMs: integer("latency_ms"),
  traceId: text("trace_id"),
  spanId: text("span_id"),
  parentSpanId: text("parent_span_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertToolCallSchema = createInsertSchema(toolCallsTable);
export type InsertToolCall = z.infer<typeof insertToolCallSchema>;
export type ToolCall = typeof toolCallsTable.$inferSelect;

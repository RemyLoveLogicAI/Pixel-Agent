import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { swarmRunsTable } from "./swarm-runs";
import { swarmAgentsTable } from "./swarm-agents";

export const swarmMessagesTable = pgTable("swarm_messages", {
  id: text("id").primaryKey(),
  swarmRunId: text("swarm_run_id").notNull().references(() => swarmRunsTable.id),
  fromAgentId: text("from_agent_id").notNull().references(() => swarmAgentsTable.id),
  toAgentId: text("to_agent_id").references(() => swarmAgentsTable.id),
  messageType: text("message_type", { enum: ["finding", "question", "dependency", "partial_result", "error"] }).notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSwarmMessageSchema = createInsertSchema(swarmMessagesTable).omit({ createdAt: true });
export type InsertSwarmMessage = z.infer<typeof insertSwarmMessageSchema>;
export type SwarmMessage = typeof swarmMessagesTable.$inferSelect;

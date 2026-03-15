import { pgTable, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const agentsTable = pgTable("agents", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companiesTable.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
  level: integer("level").notNull(),
  title: text("title").notNull(),
  managerId: text("manager_id"),
  model: text("model").notNull().default("gpt-4o"),
  systemPrompt: text("system_prompt"),
  tools: jsonb("tools").$type<string[]>(),
  capabilityToken: jsonb("capability_token"),
  budgetMonthlyUsd: real("budget_monthly_usd").notNull().default(10),
  budgetUsedUsd: real("budget_used_usd").notNull().default(0),
  status: text("status", {
    enum: ["idle", "thinking", "executing", "waiting_approval", "error", "circuit_open", "terminated"],
  }).default("idle").notNull(),
  heartbeatIntervalSec: integer("heartbeat_interval_sec").default(3600),
  nextHeartbeatAt: timestamp("next_heartbeat_at"),
  deskX: integer("desk_x"),
  deskY: integer("desk_y"),
  spriteKey: text("sprite_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({ createdAt: true, updatedAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;

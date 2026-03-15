import { pgTable, text, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { agentsTable } from "./agents";

export const governanceRequestsTable = pgTable("governance_requests", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companiesTable.id),
  requestingAgentId: text("requesting_agent_id").references(() => agentsTable.id),
  requestType: text("request_type", {
    enum: ["hire", "fire", "budget_override", "swarm_approval", "escalation", "tool_access", "strategy_change"],
  }).notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "expired"],
  }).default("pending").notNull(),
  decidedBy: text("decided_by"),
  decidedAt: timestamp("decided_at"),
  decisionNote: text("decision_note"),
  estimatedCostUsd: real("estimated_cost_usd"),
  ttlSeconds: integer("ttl_seconds").default(3600).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGovernanceRequestSchema = createInsertSchema(governanceRequestsTable).omit({ createdAt: true, updatedAt: true });
export type InsertGovernanceRequest = z.infer<typeof insertGovernanceRequestSchema>;
export type GovernanceRequest = typeof governanceRequestsTable.$inferSelect;

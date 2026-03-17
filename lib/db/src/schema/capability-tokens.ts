import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentsTable } from "./agents";

export const capabilityTokensTable = pgTable("capability_tokens", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => agentsTable.id),
  issuedBy: text("issued_by").notNull().references(() => agentsTable.id),
  scopes: jsonb("scopes").$type<string[]>(),
  delegationDepth: integer("delegation_depth").default(0).notNull(),
  maxDelegationDepth: integer("max_delegation_depth").default(3).notNull(),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCapabilityTokenSchema = createInsertSchema(capabilityTokensTable).omit({ createdAt: true });
export type InsertCapabilityToken = z.infer<typeof insertCapabilityTokenSchema>;
export type CapabilityToken = typeof capabilityTokensTable.$inferSelect;

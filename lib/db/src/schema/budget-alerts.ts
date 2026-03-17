import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { agentsTable } from "./agents";

export const budgetAlertsTable = pgTable("budget_alerts", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companiesTable.id),
  agentId: text("agent_id").references(() => agentsTable.id),
  alertType: text("alert_type", {
    enum: ["soft_limit", "hard_cap", "circuit_breaker", "projected_overrun"],
  }).notNull(),
  message: text("message").notNull(),
  thresholdUsd: real("threshold_usd"),
  actualUsd: real("actual_usd"),
  resolved: text("resolved", { enum: ["true", "false"] }).default("false").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBudgetAlertSchema = createInsertSchema(budgetAlertsTable).omit({ createdAt: true });
export type InsertBudgetAlert = z.infer<typeof insertBudgetAlertSchema>;
export type BudgetAlert = typeof budgetAlertsTable.$inferSelect;

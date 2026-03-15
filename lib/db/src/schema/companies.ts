import { pgTable, text, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mission: text("mission").notNull(),
  status: text("status", { enum: ["active", "paused", "archived"] }).default("active").notNull(),
  budgetMonthlyUsd: real("budget_monthly_usd").notNull().default(100),
  budgetUsedUsd: real("budget_used_usd").notNull().default(0),
  circuitBreaker: text("circuit_breaker", { enum: ["closed", "open", "half_open"] }).default("closed").notNull(),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ createdAt: true, updatedAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;

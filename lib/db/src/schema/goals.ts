import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { agentsTable } from "./agents";

export const goalsTable = pgTable("goals", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companiesTable.id),
  parentId: text("parent_id"),
  assignedTo: text("assigned_to").references(() => agentsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["proposed", "active", "blocked", "completed", "cancelled"],
  }).default("proposed").notNull(),
  priority: integer("priority").default(0).notNull(),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ createdAt: true, updatedAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;

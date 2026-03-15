import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentsTable } from "./agents";
import { companiesTable } from "./companies";

export const memoryEntriesTable = pgTable("memory_entries", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => agentsTable.id),
  companyId: text("company_id").notNull().references(() => companiesTable.id),
  category: text("category", {
    enum: ["fact", "preference", "decision", "learning", "context", "relationship"],
  }).notNull(),
  key: text("key").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  importance: integer("importance").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMemoryEntrySchema = createInsertSchema(memoryEntriesTable).omit({ createdAt: true, updatedAt: true });
export type InsertMemoryEntry = z.infer<typeof insertMemoryEntrySchema>;
export type MemoryEntry = typeof memoryEntriesTable.$inferSelect;

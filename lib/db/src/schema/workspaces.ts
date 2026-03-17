import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const workspacesTable = pgTable("workspaces", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id),
  name: text("name").notNull(),
  runtimeType: text("runtime_type", { enum: ["local_dir", "container", "vm"] })
    .notNull()
    .default("local_dir"),
  fsRoot: text("fs_root").notNull(),
  status: text("status", { enum: ["active", "paused", "archived"] }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWorkspaceSchema = createInsertSchema(workspacesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspacesTable.$inferSelect;


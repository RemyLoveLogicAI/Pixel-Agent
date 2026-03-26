import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const workspaceSnapshotsTable = pgTable("workspace_snapshots", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspacesTable.id),
  label: text("label").notNull(),
  storageRef: text("storage_ref").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWorkspaceSnapshotSchema = createInsertSchema(workspaceSnapshotsTable).omit({
  createdAt: true,
});
export type InsertWorkspaceSnapshot = z.infer<typeof insertWorkspaceSnapshotSchema>;
export type WorkspaceSnapshot = typeof workspaceSnapshotsTable.$inferSelect;


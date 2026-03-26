import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const mcpConnectionsTable = pgTable("mcp_connections", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspacesTable.id),
  name: text("name").notNull(),
  serverUrl: text("server_url"),
  localCommand: text("local_command"),
  scopes: jsonb("scopes").notNull().default([]),
  status: text("status", { enum: ["active", "error", "disabled"] }).notNull().default("active"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMcpConnectionSchema = createInsertSchema(mcpConnectionsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertMcpConnection = z.infer<typeof insertMcpConnectionSchema>;
export type McpConnection = typeof mcpConnectionsTable.$inferSelect;


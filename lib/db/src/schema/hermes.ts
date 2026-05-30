import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentsTable } from "./agents";
import { companiesTable } from "./companies";

/**
 * Species catalog — stores .rpet definitions for each species.
 */
export const speciesCatalogTable = pgTable("species_catalog", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  rpetVersion: integer("rpet_version").notNull().default(1),
  rpetContent: jsonb("rpet_content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSpeciesCatalogSchema = createInsertSchema(speciesCatalogTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertSpeciesCatalog = z.infer<typeof insertSpeciesCatalogSchema>;
export type SpeciesCatalog = typeof speciesCatalogTable.$inferSelect;

/**
 * Pet instances — runtime instances tied to agents.
 */
export const petInstancesTable = pgTable("pet_instances", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agentsTable.id),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id),
  speciesId: text("species_id")
    .notNull()
    .references(() => speciesCatalogTable.id),
  currentState: text("current_state", {
    enum: ["idle", "alert", "talking", "sleeping", "happy", "lookLeft", "lookRight", "jump"],
  })
    .default("idle")
    .notNull(),
  stateHistory: jsonb("state_history"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPetInstanceSchema = createInsertSchema(petInstancesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertPetInstance = z.infer<typeof insertPetInstanceSchema>;
export type PetInstance = typeof petInstancesTable.$inferSelect;

/**
 * Animation overrides — per-instance timing customization.
 */
export const animationOverridesTable = pgTable("animation_overrides", {
  id: text("id").primaryKey(),
  petInstanceId: text("pet_instance_id")
    .notNull()
    .references(() => petInstancesTable.id),
  stateName: text("state_name").notNull(),
  frameDurationMs: integer("frame_duration_ms"),
  loop: jsonb("loop").$type<boolean>(),
  perFrameMs: jsonb("per_frame_ms").$type<number[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAnimationOverrideSchema = createInsertSchema(animationOverridesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertAnimationOverride = z.infer<typeof insertAnimationOverrideSchema>;
export type AnimationOverride = typeof animationOverridesTable.$inferSelect;

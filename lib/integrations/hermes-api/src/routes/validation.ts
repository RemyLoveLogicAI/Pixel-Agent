import { z } from 'zod';

/**
 * Zod schema for inserting a species catalog entry.
 * Mirrors the Drizzle insertSpeciesCatalogSchema from @workspace/db.
 */
export const insertSpeciesCatalogSchema = z.object({
  id: z.string().optional(),
  displayName: z.string().min(1, 'display_name is required'),
  role: z.string().min(1, 'role is required'),
  rpetVersion: z.number().int().positive().optional().default(1),
  rpetContent: z.unknown(),
});

/**
 * Zod schema for inserting a pet instance.
 * Mirrors the Drizzle insertPetInstanceSchema from @workspace/db.
 */
export const insertPetInstanceSchema = z.object({
  id: z.string().optional(),
  companyId: z.string().optional(),
  agentId: z.string().min(1, 'agent_id is required'),
  speciesId: z.string().min(1, 'species_id is required'),
  currentState: z.enum([
    'idle',
    'alert',
    'talking',
    'sleeping',
    'happy',
    'lookLeft',
    'lookRight',
    'jump',
  ]).optional().default('idle'),
  stateHistory: z.unknown().optional(),
  metadata: z.unknown().optional(),
});

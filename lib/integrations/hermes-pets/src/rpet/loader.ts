import { rpetDefinitionSchema } from './schema.js';
import type { RpetDefinition } from './schema.js';
import { parseAllFrames } from './frame-parser.js';

export interface LoadedSpecies {
  definition: RpetDefinition;
  parsedFrames: ReturnType<typeof parseAllFrames>;
}

/**
 * Validate and load an .rpet JSON object into a typed definition.
 * Throws on validation failure.
 */
export function loadRpet(data: unknown): RpetDefinition {
  const result = rpetDefinitionSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid .rpet definition: ${errors}`);
  }
  return result.data;
}

/**
 * Load a species from raw JSON data, including parsed frames.
 */
export function loadSpecies(data: unknown): LoadedSpecies {
  const definition = loadRpet(data);
  const parsedFrames = parseAllFrames(definition.frames);
  return { definition, parsedFrames };
}

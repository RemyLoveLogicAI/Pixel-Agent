import type { RpetDefinition } from '@hermes/pets';
import type { PetState } from '../types/events.js';

export interface SpeciesEntry {
  id: string;
  displayName: string;
  definition: RpetDefinition;
  frameCount: Record<PetState, number>;
}

/**
 * Registry of loaded species.
 * Manages the catalog of species available for pet instances.
 */
export class SpeciesRegistry {
  private species: Map<string, SpeciesEntry> = new Map();
  private defaultSpeciesId: string | null = null;

  /**
   * Register a species in the catalog.
   */
  register(id: string, definition: RpetDefinition, isDefault = false): void {
    const frameCount = {} as Record<PetState, number>;
    for (const state of Object.keys(definition.frames) as PetState[]) {
      frameCount[state] = definition.frames[state].length;
    }

    this.species.set(id, {
      id,
      displayName: definition.displayName,
      definition,
      frameCount,
    });

    if (isDefault || this.defaultSpeciesId === null) {
      this.defaultSpeciesId = id;
    }
  }

  /**
   * Get a species by ID.
   */
  get(id: string): SpeciesEntry | undefined {
    return this.species.get(id);
  }

  /**
   * Get the default species.
   */
  getDefault(): SpeciesEntry | undefined {
    if (!this.defaultSpeciesId) return undefined;
    return this.species.get(this.defaultSpeciesId);
  }

  /**
   * List all registered species.
   */
  list(): SpeciesEntry[] {
    return Array.from(this.species.values());
  }

  /**
   * Check if a species is registered.
   */
  has(id: string): boolean {
    return this.species.has(id);
  }

  /**
   * Get the frame count for a species and state.
   */
  getFrameCount(speciesId: string, state: PetState): number {
    const entry = this.species.get(speciesId);
    if (!entry) return 0;
    return entry.frameCount[state] ?? 0;
  }
}

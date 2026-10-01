import type { DistrictName, DistrictDefinition, ArtifactType } from '../data/districts.js';
import { DEFAULT_DISTRICTS } from '../data/districts.js';

export interface DistrictConfig extends DistrictDefinition {
  customMaxPets?: number;
}

interface PetPlacement {
  petId: string;
  agentId: string;
  placedAt: Date;
}

/**
 * Manages district configurations and pet placements within districts.
 * Each district has a capacity limit and tracks which pets are currently present.
 */
export class DistrictManager {
  private districts = new Map<DistrictName, DistrictConfig>();
  private placements = new Map<DistrictName, Map<string, PetPlacement>>();

  constructor(districts: DistrictConfig[] = DEFAULT_DISTRICTS) {
    for (const def of districts) {
      this.register(def);
    }
  }

  /**
   * Register or update a district configuration.
   */
  register(config: DistrictConfig): void {
    this.districts.set(config.id, config);
    if (!this.placements.has(config.id)) {
      this.placements.set(config.id, new Map());
    }
  }

  /**
   * Get a district config by ID.
   */
  get(id: DistrictName): DistrictConfig | undefined {
    return this.districts.get(id);
  }

  /**
   * List all registered districts.
   */
  list(): DistrictConfig[] {
    return Array.from(this.districts.values());
  }

  /**
   * Get the max pet capacity for a district.
   */
  getCapacity(id: DistrictName): number {
    const district = this.districts.get(id);
    if (!district) return 0;
    return district.customMaxPets ?? district.defaultMaxPets;
  }

  /**
   * Get current pet count for a district.
   */
  getCurrentCount(id: DistrictName): number {
    return this.placements.get(id)?.size ?? 0;
  }

  /**
   * Check if a district has capacity for more pets.
   */
  hasCapacity(id: DistrictName): boolean {
    return this.getCurrentCount(id) < this.getCapacity(id);
  }

  /**
   * Place a pet in a district. Returns false if at capacity.
   */
  placePet(districtId: DistrictName, petId: string, agentId: string): boolean {
    const placements = this.placements.get(districtId);
    if (!placements) return false;
    if (this.getCurrentCount(districtId) >= this.getCapacity(districtId)) return false;

    placements.set(petId, { petId, agentId, placedAt: new Date() });
    return true;
  }

  /**
   * Remove a pet from its district.
   */
  removePet(petId: string): DistrictName | null {
    for (const [districtId, placements] of this.placements) {
      if (placements.has(petId)) {
        placements.delete(petId);
        return districtId;
      }
    }
    return null;
  }

  /**
   * Get the district a pet is currently in.
   */
  getPetDistrict(petId: string): DistrictName | null {
    for (const [districtId, placements] of this.placements) {
      if (placements.has(petId)) return districtId;
    }
    return null;
  }

  /**
   * Get all pets currently in a district.
   */
  getDistrictPets(districtId: DistrictName): PetPlacement[] {
    const placements = this.placements.get(districtId);
    if (!placements) return [];
    return Array.from(placements.values());
  }

  /**
   * Get supported artifact types for a district.
   */
  getSupportedArtifacts(districtId: DistrictName): ArtifactType[] {
    return this.districts.get(districtId)?.supportedArtifacts ?? [];
  }
}

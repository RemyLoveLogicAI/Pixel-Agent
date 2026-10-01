import type { ArtifactType } from '../data/districts.js';

export interface ArtifactDefinition {
  id: string;
  type: ArtifactType;
  displayName: string;
  description: string;
  icon: string;
}

interface ActiveArtifact {
  id: string;
  type: ArtifactType;
  districtId: string;
  agentId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Built-in artifact definitions based on the PIXEL-HQ-VISUAL-BIBLE.
 */
const ARTIFACT_CATALOG: Record<ArtifactType, ArtifactDefinition> = {
  'patch-card': {
    id: 'patch-card',
    type: 'patch-card',
    displayName: 'Patch Card',
    description: 'A code change ready for review and application',
    icon: '🔧',
  },
  'result-card': {
    id: 'result-card',
    type: 'result-card',
    displayName: 'Result Card',
    description: 'Completed work output ready for delivery',
    icon: '📋',
  },
  'memory-crate': {
    id: 'memory-crate',
    type: 'memory-crate',
    displayName: 'Memory Crate',
    description: 'Archived data and historical records',
    icon: '📦',
  },
  'approval-gate': {
    id: 'approval-gate',
    type: 'approval-gate',
    displayName: 'Approval Gate',
    description: 'Governance checkpoint requiring review',
    icon: '🚪',
  },
  'maintenance-capsule': {
    id: 'maintenance-capsule',
    type: 'maintenance-capsule',
    displayName: 'Maintenance Capsule',
    description: 'Recovery and repair operation container',
    icon: '💊',
  },
};

/**
 * ArtifactSystem manages visual objects in district scenes.
 * Tracks active artifacts and their lifecycle.
 */
export class ArtifactSystem {
  private activeArtifacts = new Map<string, ActiveArtifact>();
  private artifactCounter = 0;

  /**
   * Get the definition for an artifact type.
   */
  getDefinition(type: ArtifactType): ArtifactDefinition {
    return ARTIFACT_CATALOG[type];
  }

  /**
   * List all artifact definitions.
   */
  listDefinitions(): ArtifactDefinition[] {
    return Object.values(ARTIFACT_CATALOG);
  }

  /**
   * Spawn a new artifact in a district scene.
   */
  spawn(
    type: ArtifactType,
    districtId: string,
    agentId: string,
    metadata: Record<string, unknown> = {},
  ): ActiveArtifact {
    const artifact: ActiveArtifact = {
      id: `artifact-${++this.artifactCounter}`,
      type,
      districtId,
      agentId,
      metadata,
      createdAt: new Date(),
    };
    this.activeArtifacts.set(artifact.id, artifact);
    return artifact;
  }

  /**
   * Get an active artifact by ID.
   */
  get(id: string): ActiveArtifact | undefined {
    return this.activeArtifacts.get(id);
  }

  /**
   * List all active artifacts in a district.
   */
  listByDistrict(districtId: string): ActiveArtifact[] {
    return Array.from(this.activeArtifacts.values()).filter(
      (a) => a.districtId === districtId,
    );
  }

  /**
   * List all active artifacts for an agent.
   */
  listByAgent(agentId: string): ActiveArtifact[] {
    return Array.from(this.activeArtifacts.values()).filter(
      (a) => a.agentId === agentId,
    );
  }

  /**
   * Resolve (complete and remove) an artifact.
   */
  resolve(id: string): ActiveArtifact | undefined {
    const artifact = this.activeArtifacts.get(id);
    if (artifact) {
      this.activeArtifacts.delete(id);
    }
    return artifact;
  }

  /**
   * Clear all artifacts for a district.
   */
  clearDistrict(districtId: string): number {
    let count = 0;
    for (const [id, artifact] of this.activeArtifacts) {
      if (artifact.districtId === districtId) {
        this.activeArtifacts.delete(id);
        count++;
      }
    }
    return count;
  }
}

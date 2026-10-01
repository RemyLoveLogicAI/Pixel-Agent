import type { DistrictName } from '../data/districts.js';
import type { EventBus } from '@hermes/core';
import type { HermesEvent } from '@hermes/core';

export interface SceneBinding {
  districtId: DistrictName;
  sceneState: 'build' | 'patch' | 'inspect' | 'alert' | 'rest';
  agentId: string;
  petId: string;
  workType: string;
}

interface SceneRule {
  workTypePattern: string;
  districtId: DistrictName;
  sceneState: SceneBinding['sceneState'];
}

/**
 * Default scene rules mapping work types to districts and scene states.
 * Based on the PIXEL-HQ-VISUAL-BIBLE district logic definitions.
 */
const DEFAULT_SCENE_RULES: SceneRule[] = [
  { workTypePattern: 'build|forge|compile|model', districtId: 'hearthworks', sceneState: 'build' },
  { workTypePattern: 'patch|fix|hotfix', districtId: 'hearthworks', sceneState: 'patch' },
  { workTypePattern: 'archive|query|search|memory', districtId: 'stacks', sceneState: 'inspect' },
  { workTypePattern: 'approve|review|gate|validate', districtId: 'thresholds', sceneState: 'alert' },
  { workTypePattern: 'deliver|ship|dispatch|transport', districtId: 'courier-lanes', sceneState: 'build' },
  { workTypePattern: 'communicate|translate|broadcast', districtId: 'chorus', sceneState: 'build' },
  { workTypePattern: 'analyze|predict|report|score', districtId: 'observatory', sceneState: 'inspect' },
  { workTypePattern: 'repair|cleanup|restore|recovery', districtId: 'repair-yard', sceneState: 'rest' },
  { workTypePattern: 'idle|rest|sleep', districtId: 'repair-yard', sceneState: 'rest' },
];

/**
 * ScenarioEngine maps agent work events to district scenes.
 * It subscribes to the Hermes EventBus and translates agent/swarm events
 * into district.scene_changed events.
 */
export class ScenarioEngine {
  private rules: SceneRule[];
  private activeScenes = new Map<string, SceneBinding>(); // agentId -> SceneBinding
  private eventBus: EventBus | null = null;

  constructor(rules: SceneRule[] = DEFAULT_SCENE_RULES) {
    this.rules = rules;
  }

  /**
   * Connect to the Hermes EventBus to listen for agent events.
   */
  connect(bus: EventBus): void {
    this.eventBus = bus;
    bus.subscribe(this.handleAgentEvent, { type: 'agent.state_changed' });
    bus.subscribe(this.handleSwarmEvent, { type: 'swarm.phase_changed' });
  }

  /**
   * Disconnect from the event bus.
   */
  disconnect(): void {
    this.eventBus = null;
  }

  /**
   * Resolve a scene binding for an agent based on work type.
   */
  resolveScene(agentId: string, petId: string, workType: string): SceneBinding | null {
    const rule = this.rules.find((r) =>
      new RegExp(r.workTypePattern, 'i').test(workType),
    );

    if (!rule) return null;

    const binding: SceneBinding = {
      districtId: rule.districtId,
      sceneState: rule.sceneState,
      agentId,
      petId,
      workType,
    };

    this.activeScenes.set(agentId, binding);
    return binding;
  }

  /**
   * Get the active scene for an agent.
   */
  getActiveScene(agentId: string): SceneBinding | undefined {
    return this.activeScenes.get(agentId);
  }

  /**
   * Clear the active scene for an agent.
   */
  clearScene(agentId: string): void {
    this.activeScenes.delete(agentId);
  }

  /**
   * Get all active scenes.
   */
  listActiveScenes(): SceneBinding[] {
    return Array.from(this.activeScenes.values());
  }

  private handleAgentEvent = (event: HermesEvent): void => {
    if (event.type !== 'agent.state_changed') return;
    // Agent state changes may trigger scene changes — handled by external coordinator
    // that knows the agent's work type and pet assignment.
  };

  private handleSwarmEvent = (event: HermesEvent): void => {
    if (event.type !== 'swarm.phase_changed') return;
    // Swarm phase changes may trigger scene changes — handled by external coordinator.
  };

  /**
   * Publish a district scene change event to the event bus.
   */
  private publishSceneChange(scene: SceneBinding): void {
    if (!this.eventBus) return;
    this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'district.scene_changed',
      bus: 'district',
      actorId: scene.agentId,
      companyId: 'default', // TODO: resolve from agent context
      timestamp: new Date().toISOString(),
      payload: {
        districtId: scene.districtId,
        sceneState: scene.sceneState,
        agentId: scene.agentId,
        petId: scene.petId,
        workType: scene.workType,
      },
      meta: {
        correlationId: scene.agentId,
      },
    });
  }
}

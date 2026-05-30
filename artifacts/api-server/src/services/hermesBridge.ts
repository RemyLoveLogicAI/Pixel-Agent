/**
 * HermesBridge — bridges Pixel-Agent agent/swarm events to the Hermes EventBus.
 *
 * This service:
 * 1. Creates a Hermes EventBus instance
 * 2. Routes agent status changes to agent.state_changed events
 * 3. Routes swarm phase changes to swarm.phase_changed events
 * 4. Triggers StateMachine → pet state translation
 */
import { EventBus, StateMachine } from '@hermes/core';
import { broadcastHermesEvent } from '@hermes/api';

export interface HermesBridgeConfig {
  companyId: string;
}

export class HermesBridge {
  private bus: EventBus;
  private stateMachine: StateMachine;
  private companyId: string;

  constructor(config: HermesBridgeConfig) {
    this.companyId = config.companyId;
    this.bus = new EventBus();
    this.stateMachine = new StateMachine(this.bus);
  }

  /**
   * Get the Hermes EventBus for direct publishing.
   */
  getEventBus(): EventBus {
    return this.bus;
  }

  /**
   * Emit an agent state changed event.
   * Called after db.update(agentsTable).set({ status }) in heartbeatRunner.
   */
  emitAgentStateChanged(
    agentId: string,
    from: string,
    to: string,
    speciesId?: string,
  ): void {
    this.bus.publish({
      id: crypto.randomUUID(),
      type: 'agent.state_changed',
      bus: 'agent',
      actorId: agentId,
      companyId: this.companyId,
      timestamp: new Date().toISOString(),
      payload: { agentId, from, to, speciesId },
    });

    // Also broadcast via SSE to connected frontend clients
    broadcastHermesEvent(this.companyId, {
      type: 'agent.state_changed',
      data: { agentId, from, to, speciesId },
    });
  }

  /**
   * Emit a swarm phase changed event.
   * Called alongside broadcastEvent() in swarmEngine.
   */
  emitSwarmPhaseChanged(
    swarmId: string,
    from: string,
    to: string,
    agentIds: string[] = [],
  ): void {
    this.bus.publish({
      id: crypto.randomUUID(),
      type: 'swarm.phase_changed',
      bus: 'swarm',
      actorId: swarmId,
      companyId: this.companyId,
      timestamp: new Date().toISOString(),
      payload: { swarmId, from, to, agentIds },
    });

    broadcastHermesEvent(this.companyId, {
      type: 'swarm.phase_changed',
      data: { swarmId, from, to, agentIds },
    });
  }

  /**
   * Get the StateMachine for querying current pet states.
   */
  getStateMachine(): StateMachine {
    return this.stateMachine;
  }
}

// Singleton registry keyed by companyId
const bridges = new Map<string, HermesBridge>();

export function getHermesBridge(companyId: string): HermesBridge {
  if (!bridges.has(companyId)) {
    bridges.set(companyId, new HermesBridge({ companyId }));
  }
  return bridges.get(companyId)!;
}

export function removeHermesBridge(companyId: string): void {
  bridges.delete(companyId);
}

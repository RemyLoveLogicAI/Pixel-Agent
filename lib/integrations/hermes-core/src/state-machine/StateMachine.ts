import type { HermesEvent, AgentStatus, PetState, SwarmPhase } from '../types/events.js';
import type { EventBus } from '../event-bus/EventBus.js';
import { translateAgentToPet, translateSwarmToPet } from './transitions.js';
import { pickHighestPriority } from './agent-pet-map.js';

export interface PetInstance {
  petId: string;
  agentId: string;
  companyId: string;
  currentState: PetState;
  speciesId: string;
}

export interface StateMachineConfig {
  bus: EventBus;
  /** Minimum hold time (ms) before a state can be overridden. Prevents flicker. */
  minHoldMs?: number;
}

/**
 * StateMachine manages the translation of agent/swarm events into pet states.
 *
 * It subscribes to the EventBus for agent.state_changed and swarm.phase_changed events,
 * translates them to pet animation states, and publishes pet.state_changed events.
 *
 * When multiple agents affect the same pet, it picks the highest-priority state.
 */
export class StateMachine {
  private bus: EventBus;
  private minHoldMs: number;
  private pets: Map<string, PetInstance> = new Map();
  private agentToPet: Map<string, string> = new Map(); // agentId → petId
  private pendingStates: Map<string, { state: PetState; timestamp: number }[]> = new Map();
  private unsubscribes: (() => void)[] = [];

  constructor(config: StateMachineConfig) {
    this.bus = config.bus;
    this.minHoldMs = config.minHoldMs ?? 100;
  }

  /**
   * Register a pet instance with the state machine.
   */
  registerPet(pet: PetInstance): void {
    this.pets.set(pet.petId, pet);
    this.agentToPet.set(pet.agentId, pet.petId);
    this.pendingStates.set(pet.petId, []);
  }

  /**
   * Unregister a pet instance.
   */
  unregisterPet(petId: string): void {
    const pet = this.pets.get(petId);
    if (pet) {
      this.agentToPet.delete(pet.agentId);
    }
    this.pets.delete(petId);
    this.pendingStates.delete(petId);
  }

  /**
   * Start listening to events on the bus.
   */
  start(): void {
    this.unsubscribes.push(
      this.bus.subscribe(
        (event: HermesEvent<{ agentId: string; status: AgentStatus }>) => this.handleAgentStateChanged(event),
        { type: 'agent.state_changed' }
      )
    );

    this.unsubscribes.push(
      this.bus.subscribe(
        (event: HermesEvent<{ swarmId: string; phase: SwarmPhase }>) => this.handleSwarmPhaseChanged(event),
        { type: 'swarm.phase_changed' }
      )
    );
  }

  /**
   * Stop listening to events.
   */
  stop(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
  }

  /**
   * Get the current state of a pet.
   */
  getPetState(petId: string): PetState | undefined {
    return this.pets.get(petId)?.currentState;
  }

  /**
   * Get all registered pet IDs.
   */
  getPetIds(): string[] {
    return Array.from(this.pets.keys());
  }

  private handleAgentStateChanged(
    event: HermesEvent<{ agentId: string; status: AgentStatus }>
  ): void {
    const { agentId, status } = event.payload;
    const petId = this.agentToPet.get(agentId);
    if (!petId) return;

    const pet = this.pets.get(petId);
    if (!pet) return;

    const petState = translateAgentToPet(status);
    this.applyState(petId, petState, event.timestamp);
  }

  private handleSwarmPhaseChanged(
    event: HermesEvent<{ swarmId: string; phase: SwarmPhase; agentIds?: string[] }>
  ): void {
    const { phase, agentIds } = event.payload;
    const petState = translateSwarmToPet(phase);

    // Apply to all agents in the swarm that have registered pets
    if (agentIds) {
      for (const agentId of agentIds) {
        const petId = this.agentToPet.get(agentId);
        if (petId) {
          this.applyState(petId, petState, event.timestamp);
        }
      }
    }
  }

  private applyState(petId: string, newState: PetState, timestamp: string): void {
    const pet = this.pets.get(petId);
    if (!pet) return;

    const pending = this.pendingStates.get(petId) ?? [];
    const now = new Date(timestamp).getTime();

    // Remove stale entries
    const active = pending.filter((entry) => now - entry.timestamp < this.minHoldMs);
    active.push({ state: newState, timestamp: now });
    this.pendingStates.set(petId, active);

    // Pick highest priority state from active entries
    const winner = pickHighestPriority(active.map((e) => e.state));

    if (winner !== pet.currentState) {
      const previousState = pet.currentState;
      pet.currentState = winner;

      // Publish the state change
      this.bus.publish({
        id: crypto.randomUUID(),
        type: 'pet.state_changed',
        bus: 'pet',
        actorId: petId,
        companyId: pet.companyId,
        timestamp: new Date().toISOString(),
        payload: {
          petId,
          agentId: pet.agentId,
          from: previousState,
          to: winner,
          frameIndex: 0,
        },
      });
    }
  }
}

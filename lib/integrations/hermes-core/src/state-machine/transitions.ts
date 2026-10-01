import { AGENT_TO_PET_MAP, SWARM_TO_PET_MAP } from './agent-pet-map.js';
import type { AgentStatus, PetState, SwarmPhase } from '../types/events.js';

/**
 * Translate an agent status to a pet state.
 */
export function translateAgentToPet(status: AgentStatus): PetState {
  return AGENT_TO_PET_MAP[status] ?? 'idle';
}

/**
 * Translate a swarm phase to a pet state.
 */
export function translateSwarmToPet(phase: SwarmPhase): PetState {
  return SWARM_TO_PET_MAP[phase] ?? 'idle';
}

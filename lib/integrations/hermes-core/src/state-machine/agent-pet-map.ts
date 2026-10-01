// Agent status → Pet state mapping
// Defines how Pixel-Agent agent states translate to pet animation states

import type { AgentStatus, PetState } from '../types/events.js';

export const AGENT_TO_PET_MAP: Record<AgentStatus, PetState> = {
  idle: 'idle',
  thinking: 'talking',
  executing: 'alert',
  waiting_approval: 'alert',
  error: 'alert',
  circuit_open: 'sleeping',
  terminated: 'sleeping',
};

// Swarm phase → Pet state mapping
export const SWARM_TO_PET_MAP: Record<string, PetState> = {
  proposed: 'idle',
  pending_approval: 'alert',
  spawning: 'happy',
  executing: 'alert',
  synthesizing: 'talking',
  completed: 'happy',
  failed: 'alert',
  dissolved: 'idle',
  cancelled: 'idle',
};

// Priority ordering for pet states (higher = more urgent)
const STATE_PRIORITY: Record<PetState, number> = {
  alert: 10,
  talking: 8,
  happy: 6,
  jump: 5,
  lookLeft: 4,
  lookRight: 3,
  idle: 2,
  sleeping: 1,
};

/**
 * Given multiple competing pet states, pick the highest priority one.
 */
export function pickHighestPriority(states: PetState[]): PetState {
  if (states.length === 0) return 'idle';
  return states.reduce((a, b) =>
    STATE_PRIORITY[a] >= STATE_PRIORITY[b] ? a : b
  );
}

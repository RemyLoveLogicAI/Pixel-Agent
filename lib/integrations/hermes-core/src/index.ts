// @hermes/core — public API surface

export { EventBus } from './event-bus/EventBus.js';
export { StateMachine } from './state-machine/StateMachine.js';
export {
  AGENT_TO_PET_MAP,
  SWARM_TO_PET_MAP,
  pickHighestPriority,
} from './state-machine/agent-pet-map.js';
export { translateAgentToPet, translateSwarmToPet } from './state-machine/transitions.js';
export { Animator } from './animator/Animator.js';
export type { FrameTiming, AnimationState } from './animator/Animator.js';
export { SpeciesRegistry } from './species/SpeciesRegistry.js';
export type { PetInstance, StateMachineConfig } from './state-machine/StateMachine.js';

export type {
  HermesEvent,
  HermesEventType,
  HermesBus,
  HermesPriority,
  HermesEventMeta,
  AgentStatus,
  PetState,
  SwarmPhase,
  AgentStateChangedPayload,
  PetStateChangedPayload,
  SwarmPhaseChangedPayload,
} from './types/events.js';

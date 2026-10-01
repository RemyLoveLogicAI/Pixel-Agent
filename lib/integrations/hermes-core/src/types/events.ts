// Shared type definitions for Hermes core

export type HermesBus = 'pet' | 'agent' | 'district' | 'swarm';

export type HermesEventType =
  // Agent lifecycle → pet state
  | 'agent.state_changed'
  | 'agent.heartbeat_completed'
  | 'agent.executing'
  | 'agent.completed'
  | 'agent.error'
  // Pet lifecycle
  | 'pet.state_changed'
  | 'pet.animation_complete'
  | 'pet.loaded'
  // Swarm integration
  | 'swarm.phase_changed'
  | 'swarm.message'
  // District/scene
  | 'district.scene_changed'
  | 'district.artifact_ready';

export type HermesPriority = 'low' | 'normal' | 'urgent';

export interface HermesEventMeta {
  correlationId?: string;
  causationId?: string;
  priority?: HermesPriority;
}

export interface HermesEvent<T = unknown> {
  id: string;
  type: HermesEventType;
  bus: HermesBus;
  actorId: string;
  companyId: string;
  timestamp: string;
  payload: T;
  meta?: HermesEventMeta;
}

// Agent states from Pixel-Agent
export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting_approval'
  | 'error'
  | 'circuit_open'
  | 'terminated';

// Pet animation states from .rpet v1
export type PetState =
  | 'idle'
  | 'alert'
  | 'talking'
  | 'sleeping'
  | 'happy'
  | 'lookLeft'
  | 'lookRight'
  | 'jump';

// Swarm phases from Pixel-Agent SwarmEngine
export type SwarmPhase =
  | 'proposed'
  | 'pending_approval'
  | 'spawning'
  | 'executing'
  | 'synthesizing'
  | 'completed'
  | 'failed'
  | 'dissolved'
  | 'cancelled';

// Event payloads
export interface AgentStateChangedPayload {
  agentId: string;
  from: AgentStatus;
  to: AgentStatus;
  spriteKey?: string;
  speciesId?: string;
}

export interface PetStateChangedPayload {
  petId: string;
  agentId: string;
  from: PetState;
  to: PetState;
  frameIndex: number;
}

export interface SwarmPhaseChangedPayload {
  swarmId: string;
  from: SwarmPhase;
  to: SwarmPhase;
  agentIds: string[];
}

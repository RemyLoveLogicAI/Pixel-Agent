import type { PetState } from '../types/events.js';

export interface FrameTiming {
  frameDurationMs: number;
  loop: boolean;
  perFrameMs?: number[];
}

export interface AnimationState {
  stateName: PetState;
  currentFrame: number;
  totalFrames: number;
  timing: FrameTiming;
  isComplete: boolean;
}

/**
 * Default timing values per state (ms).
 * Based on the timing conventions in preview-ui-v2.html.
 */
const DEFAULT_TIMING: Record<PetState, FrameTiming> = {
  idle: { frameDurationMs: 300, loop: true },
  alert: { frameDurationMs: 200, loop: true },
  talking: { frameDurationMs: 250, loop: true },
  sleeping: { frameDurationMs: 500, loop: true },
  happy: { frameDurationMs: 220, loop: true },
  lookLeft: { frameDurationMs: 300, loop: false },
  lookRight: { frameDurationMs: 300, loop: false },
  jump: { frameDurationMs: 150, loop: false },
};

/**
 * Animator manages frame scheduling and timing for pet animations.
 * It tracks the current animation state and advances frames based on elapsed time.
 */
export class Animator {
  private state: AnimationState | null = null;
  private lastTick = 0;
  private elapsed = 0;

  /**
   * Start a new animation state.
   */
  start(stateName: PetState, totalFrames: number, timing?: Partial<FrameTiming>): void {
    const base = DEFAULT_TIMING[stateName];
    this.state = {
      stateName,
      currentFrame: 0,
      totalFrames,
      timing: { ...base, ...timing },
      isComplete: false,
    };
    this.lastTick = Date.now();
    this.elapsed = 0;
  }

  /**
   * Advance the animation by the elapsed time since last tick.
   * Returns the current frame index, or null if no animation is active.
   */
  tick(): number | null {
    if (!this.state) return null;

    const now = Date.now();
    const delta = now - this.lastTick;
    this.lastTick = now;
    this.elapsed += delta;

    // Advance all pending frames in a loop to handle lag / fake timers
    while (this.elapsed >= 0 && !this.state.isComplete) {
      const { timing } = this.state;
      const frameMs = timing.perFrameMs?.[this.state.currentFrame] ?? timing.frameDurationMs;

      if (this.elapsed < frameMs) break;

      this.elapsed -= frameMs;
      this.state.currentFrame++;

      if (this.state.currentFrame >= this.state.totalFrames) {
        if (timing.loop) {
          this.state.currentFrame = 0;
        } else {
          this.state.currentFrame = this.state.totalFrames - 1;
          this.state.isComplete = true;
        }
      }
    }

    return this.state.currentFrame;
  }

  /**
   * Get the current animation state.
   */
  getState(): AnimationState | null {
    return this.state;
  }

  /**
   * Get the current frame index.
   */
  getCurrentFrame(): number {
    return this.state?.currentFrame ?? 0;
  }

  /**
   * Check if the current animation is complete.
   */
  isComplete(): boolean {
    return this.state?.isComplete ?? false;
  }

  /**
   * Reset the animator.
   */
  reset(): void {
    this.state = null;
    this.lastTick = 0;
    this.elapsed = 0;
  }
}

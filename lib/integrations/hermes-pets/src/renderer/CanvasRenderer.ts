/**
 * CanvasRenderer — extracts the pixel rendering logic from preview-ui-v2.html
 * into a reusable class that renders .rpet frames to a canvas element.
 *
 * Supports:
 * - 16×16 pixel grid rendering at configurable scale
 * - Eye-tracking sparkle based on cursor position
 * - Frame animation loop with per-state timing
 * - State transitions (idle, alert, talking, sleeping, happy, etc.)
 */

import type { RpetDefinition, RpetEyeRegion } from "../rpet/schema.js";

/** Character-to-palette-key mapping from the .rpet format */
const CHAR_MAP: Record<string, string> = {
  B: "body",
  D: "bodyDark",
  E: "eye",
  K: "cheek",
  M: "mouth",
  A: "antenna",
  S: "sparkle",
  F: "foot",
};

/** Default timing per state (ms) — extracted from preview-ui-v2.html */
const DEFAULT_TIMING: Record<string, { frameDuration: number; loop: boolean }> = {
  idle: { frameDuration: 500, loop: true },
  alert: { frameDuration: 180, loop: true },
  talking: { frameDuration: 200, loop: true },
  sleeping: { frameDuration: 800, loop: true },
  happy: { frameDuration: 250, loop: true },
  lookLeft: { frameDuration: 400, loop: false },
  lookRight: { frameDuration: 400, loop: false },
  jump: { frameDuration: 150, loop: false },
};

export interface SparkleOffset {
  x: number;
  y: number;
}

export interface CanvasRendererOptions {
  /** Scale factor for the 16×16 grid (default: 16, making the canvas 256×256) */
  scale?: number;
  /** CSS image-rendering style (default: "pixelated") */
  rendering?: string;
}

/**
 * Renders an .rpet definition to a canvas element with animation.
 */
export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number;
  private pet: RpetDefinition | null = null;
  private currentState = "idle";
  private currentFrameIndex = 0;
  private sparkle: SparkleOffset = { x: 0, y: 0 };
  private animFrameId: number | null = null;
  private lastFrameTime = 0;
  private stateHoldStart = 0;

  constructor(canvas: HTMLCanvasElement, options: CanvasRendererOptions = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.scale = options.scale ?? 16;

    // Enable crisp pixel rendering
    this.ctx.imageSmoothingEnabled = false;
    const rendering = options.rendering ?? "pixelated";
    this.canvas.style.imageRendering = rendering;

    // Set canvas size for the 16×16 grid at the configured scale
    this.canvas.width = 16 * this.scale;
    this.canvas.height = 16 * this.scale;
  }

  /**
   * Set the pet definition to render and start the animation loop.
   */
  setPet(pet: RpetDefinition): void {
    this.pet = pet;
    this.currentState = "idle";
    this.currentFrameIndex = 0;
    if (!this.animFrameId) {
      this.lastFrameTime = 0;
      this.stateHoldStart = 0;
      this.animFrameId = requestAnimationFrame((t) => this.animate(t));
    }
  }

  /**
   * Set the current animation state (triggers transition).
   */
  setState(state: string): void {
    if (!this.pet) return;
    if (state === this.currentState) return;
    this.currentState = state;
    this.currentFrameIndex = 0;
    this.stateHoldStart = performance.now();
  }

  /**
   * Get the current state name.
   */
  getState(): string {
    return this.currentState;
  }

  /**
   * Update the sparkle offset based on cursor position.
   * x and y are normalized 0-1 coordinates mapped to -1, 0, or 1.
   */
  setSparkle(offset: SparkleOffset): void {
    this.sparkle = offset;
  }

  /**
   * Stop the animation loop.
   */
  stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Dispose the renderer and clean up.
   */
  dispose(): void {
    this.stop();
    this.pet = null;
  }

  private getFramesForState(): string[][] {
    if (!this.pet) return [];
    const frames = this.pet.frames as Record<string, string[][]>;
    return frames[this.currentState] || frames.idle || [];
  }

  private animate = (timestamp: number): void => {
    if (!this.pet) return;

    if (!this.lastFrameTime) {
      this.lastFrameTime = timestamp;
      this.stateHoldStart = timestamp;
    }

    const frames = this.getFramesForState();
    const timing = this.getTimingForCurrentState();
    const duration = this.getFrameDuration();

    if (timestamp - this.lastFrameTime >= duration) {
      if (this.currentFrameIndex < frames.length - 1) {
        this.currentFrameIndex++;
        this.lastFrameTime = timestamp;
      } else if (timing.loop) {
        this.currentFrameIndex = 0;
        this.lastFrameTime = timestamp;
      } else if (timestamp - this.stateHoldStart > duration * 2) {
        this.currentFrameIndex = 0;
        this.currentState = "idle";
        this.lastFrameTime = timestamp;
        this.stateHoldStart = timestamp;
      }
    }

    this.drawFrame();
    this.animFrameId = requestAnimationFrame(this.animate);
  };

  private drawFrame(): void {
    if (!this.pet) return;

    const frames = this.getFramesForState();
    const frame = frames[Math.min(this.currentFrameIndex, frames.length - 1)];
    const { ctx, scale } = this;

    ctx.clearRect(0, 0, 16 * scale, 16 * scale);

    for (let row = 0; row < 16; row++) {
      const rowStr = frame[row];
      for (let col = 0; col < 16; col++) {
        let ch = rowStr[col];
        if (ch === "C") continue;

        if (ch === "E" || ch === "S") {
          ch = this.resolveEyePixel(ch, col, row);
        }

        const paletteKey = CHAR_MAP[ch];
        if (!paletteKey) continue;
        const color = (this.pet!.palette as Record<string, string>)[paletteKey];
        if (!color) continue;

        ctx.fillStyle = color;
        ctx.fillRect(col * scale, row * scale, scale, scale);
      }
    }
  }

  private resolveEyePixel(ch: string, x: number, y: number): string {
    if (!this.pet?.eyeRegion) return ch;
    const region = this.pet.eyeRegion as RpetEyeRegion;

    const inLeft =
      x >= region.leftEyeColumns[0] && x <= region.leftEyeColumns[1] &&
      y >= region.eyeRows[0] && y <= region.eyeRows[1];
    const inRight =
      x >= region.rightEyeColumns[0] && x <= region.rightEyeColumns[1] &&
      y >= region.eyeRows[0] && y <= region.eyeRows[1];

    if (!inLeft && !inRight) return ch;

    const base = inLeft ? region.leftSparkle : region.rightSparkle;
    const columns = inLeft ? region.leftEyeColumns : region.rightEyeColumns;
    const targetX = this.clamp(base[0] + this.sparkle.x, columns[0], columns[1]);
    const targetY = this.clamp(base[1] + this.sparkle.y, region.eyeRows[0], region.eyeRows[1]);

    return x === targetX && y === targetY ? "S" : "E";
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private getTimingForCurrentState(): { frameDuration: number; loop: boolean } {
    if (!this.pet) return DEFAULT_TIMING.idle;
    const timing = (this.pet.timing as Record<string, { frameDuration?: number; loop?: boolean }>)[this.currentState];
    return {
      frameDuration: timing?.frameDuration ?? DEFAULT_TIMING[this.currentState]?.frameDuration ?? 300,
      loop: timing?.loop ?? DEFAULT_TIMING[this.currentState]?.loop ?? true,
    };
  }

  private getFrameDuration(): number {
    if (!this.pet) return 300;
    const timing = this.getTimingForCurrentState();
    const frames = this.getFramesForState();
    const perFrame = (timing as { perFrame?: number[] })?.perFrame;
    if (perFrame?.[this.currentFrameIndex] != null) {
      return perFrame[this.currentFrameIndex];
    }
    return timing.frameDuration;
  }
}

/**
 * EyeTracker — tracks mouse position over a canvas and converts to sparkle offsets.
 */
export class EyeTracker {
  private canvas: HTMLCanvasElement;
  private onChange: (offset: SparkleOffset) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseLeave: () => void;

  constructor(canvas: HTMLCanvasElement, onChange: (offset: SparkleOffset) => void) {
    this.canvas = canvas;
    this.onChange = onChange;
    this.boundMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
    this.boundMouseLeave = () => this.handleMouseLeave();
    canvas.addEventListener("mousemove", this.boundMouseMove);
    canvas.addEventListener("mouseleave", this.boundMouseLeave);
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    this.onChange({
      x: x < 0.33 ? -1 : x > 0.66 ? 1 : 0,
      y: y < 0.33 ? -1 : y > 0.66 ? 1 : 0,
    });
  }

  private handleMouseLeave(): void {
    this.onChange({ x: 0, y: 0 });
  }

  dispose(): void {
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mouseleave", this.boundMouseLeave);
  }
}

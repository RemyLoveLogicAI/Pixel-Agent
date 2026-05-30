import { useRef, useEffect, useCallback, useState } from "react";

// ── Constants (mirrors .rpet v1 format) ──────────────────────────────────────

const REQUIRED_STATES = [
  "idle", "alert", "talking", "sleeping", "happy", "lookLeft", "lookRight", "jump",
] as const;

const CHAR_MAP: Record<string, string> = {
  B: "body", D: "bodyDark", E: "eye", K: "cheek", M: "mouth",
  A: "antenna", S: "sparkle", F: "foot",
};

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

// ── Types ────────────────────────────────────────────────────────────────────

interface EyeRegion {
  leftEyeColumns: number[];
  rightEyeColumns: number[];
  eyeRows: number[];
  leftSparkle: [number, number];
  rightSparkle: [number, number];
}

interface RpetPet {
  id: string;
  displayName: string;
  palette: Record<string, string>;
  eyeRegion: EyeRegion;
  frames: Record<string, string[][]>;
  timing?: Record<string, { frameDuration?: number; loop?: boolean }>;
}

interface SparklePos { x: number; y: number }

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveEyePixel(
  ch: string, x: number, y: number, region: EyeRegion, sparkle: SparklePos,
): string {
  const inLeft =
    x >= region.leftEyeColumns[0] && x <= region.leftEyeColumns[1] &&
    y >= region.eyeRows[0] && y <= region.eyeRows[1];
  const inRight =
    x >= region.rightEyeColumns[0] && x <= region.rightEyeColumns[1] &&
    y >= region.eyeRows[0] && y <= region.eyeRows[1];
  if (!inLeft && !inRight) return ch;

  const base = inLeft ? region.leftSparkle : region.rightSparkle;
  const columns = inLeft ? region.leftEyeColumns : region.rightEyeColumns;
  const targetX = Math.max(columns[0], Math.min(columns[1], base[0] + sparkle.x));
  const targetY = Math.max(region.eyeRows[0], Math.min(region.eyeRows[1], base[1] + sparkle.y));
  return x === targetX && y === targetY ? "S" : "E";
}

// ── Component ────────────────────────────────────────────────────────────────

interface PetCanvasProps {
  pet: RpetPet | null;
  state?: string;
  canvasSize?: number;
  onMouseMove?: (sparkle: SparklePos) => void;
}

export function PetCanvas({ pet, state = "idle", canvasSize = 256, onMouseMove }: PetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const holdRef = useRef(0);
  const sparkleRef = useRef<SparklePos>({ x: 0, y: 0 });
  const [internalState, setInternalState] = useState(state);

  const currentState = state || internalState;

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pet) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const frames = pet.frames[currentState] || pet.frames.idle;
    if (!frames || frames.length === 0) return;

    const frame = frames[Math.min(frameRef.current, frames.length - 1)];
    ctx.clearRect(0, 0, 16, 16);

    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 16; col++) {
        let ch = frame[row][col];
        if (ch === "C") continue;
        if (ch === "E" || ch === "S") {
          ch = resolveEyePixel(ch, col, row, pet.eyeRegion, sparkleRef.current);
        }
        const slot = CHAR_MAP[ch];
        if (!slot) continue;
        const color = pet.palette[slot];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(col, row, 1, 1);
      }
    }
  }, [pet, currentState]);

  const animate = useCallback((timestamp: number) => {
    if (!pet) return;
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
      holdRef.current = timestamp;
    }

    const frames = pet.frames[currentState] || pet.frames.idle;
    const timing = pet.timing?.[currentState] || DEFAULT_TIMING[currentState] || DEFAULT_TIMING.idle;
    const duration = timing.frameDuration ?? 300;

    if (timestamp - lastTimeRef.current >= duration) {
      if (frameRef.current < frames.length - 1) {
        frameRef.current++;
        lastTimeRef.current = timestamp;
      } else if (timing.loop) {
        frameRef.current = 0;
        lastTimeRef.current = timestamp;
      } else if (timestamp - holdRef.current > duration * 2) {
        frameRef.current = 0;
        setInternalState("idle");
        lastTimeRef.current = timestamp;
        holdRef.current = timestamp;
      }
    }

    drawFrame();
    requestAnimationFrame(animate);
  }, [pet, currentState, drawFrame]);

  useEffect(() => {
    frameRef.current = 0;
    lastTimeRef.current = 0;
    holdRef.current = 0;
  }, [pet, currentState]);

  useEffect(() => {
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [animate]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    sparkleRef.current = {
      x: x < 0.33 ? -1 : x > 0.66 ? 1 : 0,
      y: y < 0.33 ? -1 : y > 0.66 ? 1 : 0,
    };
    onMouseMove?.(sparkleRef.current);
  };

  const handleMouseLeave = () => {
    sparkleRef.current = { x: 0, y: 0 };
  };

  return (
    <canvas
      ref={canvasRef}
      width={16}
      height={16}
      style={{ width: canvasSize, height: canvasSize, imageRendering: "pixelated" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
}

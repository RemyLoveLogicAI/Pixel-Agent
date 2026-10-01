import type { RpetFrame, RpetStateName } from './schema.js';
import { CHAR_TO_SLOT, TRANSPARENT_CHAR } from './schema.js';

/**
 * Parse a single frame string array into a 2D array of palette indices.
 * Returns -1 for transparent cells.
 */
export function parseFrame(frame: RpetFrame): number[][] {
  const paletteKeys = Object.keys(CHAR_TO_SLOT);
  return frame.map((row) =>
    row.split('').map((ch) => {
      if (ch === TRANSPARENT_CHAR) return -1;
      const idx = paletteKeys.indexOf(ch);
      return idx >= 0 ? idx : -1;
    })
  );
}

/**
 * Parse all frames for a single state into parsed 2D arrays.
 */
export function parseStateFrames(frames: RpetFrame[]): number[][][] {
  return frames.map(parseFrame);
}

/**
 * Parse all frames for all states from an RpetFrames object.
 */
export function parseAllFrames(
  frames: Record<RpetStateName, RpetFrame[]>
): Record<RpetStateName, number[][][]> {
  const result = {} as Record<RpetStateName, number[][][]>;
  for (const state of Object.keys(frames) as RpetStateName[]) {
    result[state] = parseStateFrames(frames[state]);
  }
  return result;
}

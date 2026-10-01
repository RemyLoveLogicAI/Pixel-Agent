import { z } from 'zod';

// .rpet v1 format schema
// Based on frygar.rpet and glyphipede-icon.rpet structure

export const RPET_FORMAT_VERSION = 1;

export const REQUIRED_STATES = [
  'idle',
  'alert',
  'talking',
  'sleeping',
  'happy',
  'lookLeft',
  'lookRight',
  'jump',
] as const;

export type RpetStateName = (typeof REQUIRED_STATES)[number];

const paletteSlotSchema = z.string().regex(/^#?[0-9A-Fa-f]{6}$/, 'Hex color must be 6 digits, optionally prefixed with #');

export const rpetPaletteSchema = z.object({
  body: paletteSlotSchema,
  bodyDark: paletteSlotSchema,
  eye: paletteSlotSchema,
  cheek: paletteSlotSchema,
  mouth: paletteSlotSchema,
  antenna: paletteSlotSchema,
  sparkle: paletteSlotSchema,
  foot: paletteSlotSchema,
});

export type RpetPalette = z.infer<typeof rpetPaletteSchema>;

export const rpetEyeRegionSchema = z.object({
  leftEyeColumns: z.tuple([z.number().int(), z.number().int()]),
  rightEyeColumns: z.tuple([z.number().int(), z.number().int()]),
  eyeRows: z.tuple([z.number().int(), z.number().int()]),
  leftSparkle: z.tuple([z.number().int(), z.number().int()]),
  rightSparkle: z.tuple([z.number().int(), z.number().int()]),
});

export type RpetEyeRegion = z.infer<typeof rpetEyeRegionSchema>;

export const rpetFrameSchema = z.array(z.string().length(16)).length(16);

export type RpetFrame = z.infer<typeof rpetFrameSchema>;

export const rpetFramesSchema = z.object({
  idle: z.array(rpetFrameSchema).min(1),
  alert: z.array(rpetFrameSchema).min(1),
  talking: z.array(rpetFrameSchema).min(1),
  sleeping: z.array(rpetFrameSchema).min(1),
  happy: z.array(rpetFrameSchema).min(1),
  lookLeft: z.array(rpetFrameSchema).min(1),
  lookRight: z.array(rpetFrameSchema).min(1),
  jump: z.array(rpetFrameSchema).min(1),
});

export type RpetFrames = z.infer<typeof rpetFramesSchema>;

const perStateTimingSchema = z.object({
  frameDuration: z.number().int().positive().default(300),
  loop: z.boolean().default(true),
  perFrame: z.array(z.number().int().positive()).optional(),
});

export const rpetTimingSchema = z
  .object({
    idle: perStateTimingSchema.optional(),
    alert: perStateTimingSchema.optional(),
    talking: perStateTimingSchema.optional(),
    sleeping: perStateTimingSchema.optional(),
    happy: perStateTimingSchema.optional(),
    lookLeft: perStateTimingSchema.optional(),
    lookRight: perStateTimingSchema.optional(),
    jump: perStateTimingSchema.optional(),
  })
  .optional();

export type RpetTiming = z.infer<typeof rpetTimingSchema>;

export const rpetDefinitionSchema = z.object({
  formatVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/, 'Must be kebab-case'),
  displayName: z.string().min(1),
  palette: rpetPaletteSchema,
  eyeRegion: rpetEyeRegionSchema,
  frames: rpetFramesSchema,
  timing: rpetTimingSchema,
});

export type RpetDefinition = z.infer<typeof rpetDefinitionSchema>;

// Character-to-palette mapping used in frame grids
export const CHAR_TO_SLOT: Record<string, keyof RpetPalette> = {
  B: 'body',
  D: 'bodyDark',
  E: 'eye',
  K: 'cheek',
  M: 'mouth',
  A: 'antenna',
  S: 'sparkle',
  F: 'foot',
};

export const TRANSPARENT_CHAR = 'C';

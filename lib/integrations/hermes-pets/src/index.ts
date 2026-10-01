export type {
  RpetDefinition,
  RpetPalette,
  RpetEyeRegion,
  RpetFrames,
  RpetTiming,
  RpetFrame,
  RpetStateName,
} from './rpet/schema.js';

export {
  RPET_FORMAT_VERSION,
  REQUIRED_STATES,
  rpetPaletteSchema,
  rpetEyeRegionSchema,
  rpetFrameSchema,
  rpetFramesSchema,
  rpetTimingSchema,
  rpetDefinitionSchema,
  CHAR_TO_SLOT,
  TRANSPARENT_CHAR,
} from './rpet/schema.js';

export { parseFrame, parseStateFrames, parseAllFrames } from './rpet/frame-parser.js';
export { loadRpet, loadSpecies } from './rpet/loader.js';
export type { LoadedSpecies } from './rpet/loader.js';

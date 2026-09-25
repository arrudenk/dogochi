/** Public surface of the pixel module. Everything else here is an implementation detail. */

// Archetype sprites — always available, the §13 fallback for everything.
export { SPRITES, SPRITE_SIZE } from './spriteAssets';

// Value types
export type { RGBABuffer, Mask, Rect } from './types';
export { createBuffer, createMask } from './types';

// Palette
export { APP_PALETTE, COAT_RAMP, ACCENTS, COAT_RIM, EYE_GOLD, hexToRgb, rgbToHex, luma } from './palette';

// Pure pipeline
export {
  floodFillBackground,
  maskFromRect,
  keepLargestBlob,
  maskBounds,
  cropToMask,
  stretchTonesInMask,
  medianFilter,
  downscaleAreaAverage,
  hardenAlpha,
  quantizeToPalette,
  applyRimLight,
  dominantColors,
  pixelize,
} from './pipeline';
export type {
  FloodFillOptions,
  ToneStretchOptions,
  PixelizeOptions,
  PixelizeResult,
} from './pipeline';

// Bytes
export { decodePng, encodePng, inflate } from './png';

// Platform glue
export {
  WORK_SIZE,
  decodeToRGBA,
  cropAndDecode,
  writeSpritePng,
  readSpritePng,
  deleteSprite,
} from './imageIO';

// UI
export { PixelEditor, toDoc, fromDoc } from './editor/PixelEditor';
export type { PixelDoc, PixelEditorProps } from './editor/PixelEditor';
export { RitualFlow } from './ritual/RitualFlow';
export type { SpriteUris, RitualFlowProps } from './ritual/RitualFlow';
export { RITUAL_STEPS, RITUAL_TIPS, POSE_SIZE } from './ritual/poses';
export type { RitualStepSpec } from './ritual/poses';

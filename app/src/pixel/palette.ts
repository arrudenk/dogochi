/**
 * The palette the pixelizer quantizes *to* (spec §11 step 6 and §12).
 *
 * The point is that the sprite is snapped to the app's own colours, never to the
 * photo's. A photo of a solid-black dog contributes almost no colour information —
 * letting it choose the palette produces mud. The ramp below is a cold luminance
 * ladder; the tone-stretch step decides *where on the ladder* each pixel lands.
 *
 * Kept here rather than imported from ui/theme so the pipeline stays testable
 * without the UI layer. The values mirror theme.ts and must not drift.
 */

/** Ordered dark → light. Pure black is deliberately absent; #13151d is the floor. */
export const COAT_RAMP = [
  '#13151d',
  '#1b1f2b',
  '#232838',
  '#2b3040',
  '#39415a',
  '#4a5473',
  '#5c688a',
  '#6b7a99',
  '#8896b2',
] as const;

/** Non-coat colours a real photo can legitimately land on: eye, collar, tongue, moonlight. */
export const ACCENTS = ['#d9a54a', '#8a5a3a', '#a8443c', '#c9c3a8'] as const;

export const COAT_RIM = '#6b7a99';
export const COAT_SHADOW = '#13151d';
export const EYE_GOLD = '#d9a54a';

export const APP_PALETTE: string[] = [...COAT_RAMP, ...ACCENTS];

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Rec.601 luma — cheap and good enough for ranking shadow detail. */
export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

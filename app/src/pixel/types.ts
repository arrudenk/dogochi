/** Plain value types for the pixel pipeline. No React, no Expo, no platform APIs. */

export interface RGBABuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** 1 = subject (the dog), 0 = background. */
export interface Mask {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function createBuffer(width: number, height: number): RGBABuffer {
  return { data: new Uint8ClampedArray(width * height * 4), width, height };
}

export function createMask(width: number, height: number, fill = 0): Mask {
  const data = new Uint8Array(width * height);
  if (fill) data.fill(fill);
  return { data, width, height };
}

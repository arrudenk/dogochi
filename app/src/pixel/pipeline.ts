/**
 * Ритуал виклику — the photo → sprite pipeline (spec §11).
 *
 * Pure functions over RGBA buffers. No React, no Expo, no network, no ML. The original
 * spec assumed Apple's Vision framework for the object mask; the app is cross-platform
 * Expo now, so everything here is hand-rolled TypeScript. See `floodFillBackground` for
 * an honest note on what that costs in quality.
 *
 * Memory discipline: every step that can work in place does. The only large allocations
 * are the median filter's output and the mask; both are released before the downscale.
 */

import {
  APP_PALETTE,
  COAT_RAMP,
  COAT_RIM,
  hexToRgb,
  luma,
  rgbToHex,
  type RGB,
} from './palette';
import { createBuffer, createMask, type Mask, type RGBABuffer, type Rect } from './types';

// ─── 1. Background removal ───────────────────────────────────────────────────

export interface FloodFillOptions {
  /** 0–255 colour distance. Higher = more of the photo is called background. */
  tolerance?: number;
  /** Drop subject blobs smaller than this fraction of the largest one. */
  keepLargestBlob?: boolean;
}

/**
 * Flood-fill the background inward from the border by colour distance.
 *
 * Quality ceiling, stated plainly: this works when the owner followed the tip about a
 * plain background and nothing else. It cannot separate a black dog from a dark sofa,
 * it eats shadows under the paws, and it will bite chunks out of a dog whose coat
 * matches the floor. That is why `maskFromRect` exists as the guaranteed fallback and
 * why the editor is part of the quest rather than an apology.
 */
export function floodFillBackground(img: RGBABuffer, opts: FloodFillOptions = {}): Mask {
  const tol = opts.tolerance ?? 40;
  const { width: w, height: h, data } = img;
  const bg = new Uint8Array(w * h);

  // Seed colour = mean of the border ring. A single corner pixel is too easy to be noise.
  let sr = 0, sg = 0, sb = 0, n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++;
  };
  for (let x = 0; x < w; x++) { sample(x, 0); sample(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { sample(0, y); sample(w - 1, y); }
  const br = sr / n, bg_ = sg / n, bb = sb / n;

  const stack: number[] = [];
  const push = (p: number) => { if (!bg[p]) { bg[p] = 1; stack.push(p); } };

  const near = (p: number, r: number, g: number, b: number, t: number) => {
    const i = p * 4;
    const dr = data[i] - r, dg = data[i + 1] - g, db = data[i + 2] - b;
    return dr * dr + dg * dg + db * db <= t * t;
  };

  for (let x = 0; x < w; x++) {
    if (near(x, br, bg_, bb, tol)) push(x);
    if (near((h - 1) * w + x, br, bg_, bb, tol)) push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    if (near(y * w, br, bg_, bb, tol)) push(y * w);
    if (near(y * w + w - 1, br, bg_, bb, tol)) push(y * w + w - 1);
  }

  // Region growing: a pixel joins the background if it is close to the global border
  // colour OR to the neighbour it was reached from. The second test follows gradients
  // (sky, a wall lit from one side) without the first test drifting onto the dog.
  const localTol = tol * 0.6;
  while (stack.length) {
    const p = stack.pop()!;
    const px = p % w, py = (p / w) | 0;
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const tryNb = (q: number) => {
      if (bg[q]) return;
      if (near(q, br, bg_, bb, tol) || near(q, r, g, b, localTol)) push(q);
    };
    if (px > 0) tryNb(p - 1);
    if (px < w - 1) tryNb(p + 1);
    if (py > 0) tryNb(p - w);
    if (py < h - 1) tryNb(p + w);
  }

  const mask = createMask(w, h);
  for (let p = 0; p < bg.length; p++) mask.data[p] = bg[p] ? 0 : 1;

  if (opts.keepLargestBlob !== false) keepLargestBlob(mask);
  return mask;
}

/** The guaranteed fallback: the owner drags a rectangle. Never fails, never surprises. */
export function maskFromRect(width: number, height: number, rect: Rect): Mask {
  const mask = createMask(width, height);
  const x1 = Math.min(width, rect.x + rect.w);
  const y1 = Math.min(height, rect.y + rect.h);
  for (let y = Math.max(0, rect.y); y < y1; y++)
    mask.data.fill(1, y * width + Math.max(0, rect.x), y * width + x1);
  return mask;
}

/** Keeps the biggest connected subject blob. Kills the halo of speckles flood fill leaves. */
export function keepLargestBlob(mask: Mask): Mask {
  const { width: w, height: h, data } = mask;
  const label = new Int32Array(w * h).fill(-1);
  let best = -1, bestSize = 0, id = 0;
  const stack: number[] = [];
  for (let s = 0; s < data.length; s++) {
    if (!data[s] || label[s] >= 0) continue;
    let size = 0;
    stack.push(s);
    label[s] = id;
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const px = p % w, py = (p / w) | 0;
      const nb = (q: number) => { if (data[q] && label[q] < 0) { label[q] = id; stack.push(q); } };
      if (px > 0) nb(p - 1);
      if (px < w - 1) nb(p + 1);
      if (py > 0) nb(p - w);
      if (py < h - 1) nb(p + w);
    }
    if (size > bestSize) { bestSize = size; best = id; }
    id++;
  }
  if (best < 0) return mask;
  for (let p = 0; p < data.length; p++) if (data[p] && label[p] !== best) data[p] = 0;
  return mask;
}

// ─── 2. Crop ─────────────────────────────────────────────────────────────────

export function maskBounds(mask: Mask): Rect | null {
  const { width: w, height: h, data } = mask;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[y * w + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Crop image and mask together to the mask's bounds, padded to a square so the
 *  sprite keeps the dog's real proportions instead of stretching it. */
export function cropToMask(
  img: RGBABuffer,
  mask: Mask,
  square = true
): { img: RGBABuffer; mask: Mask } | null {
  const b = maskBounds(mask);
  if (!b) return null;
  let { x, y, w, h } = b;
  if (square) {
    const side = Math.max(w, h);
    x -= ((side - w) / 2) | 0;
    y -= ((side - h) / 2) | 0;
    w = side;
    h = side;
  }
  const out = createBuffer(w, h);
  const om = createMask(w, h);
  for (let dy = 0; dy < h; dy++) {
    const sy = y + dy;
    if (sy < 0 || sy >= img.height) continue;
    for (let dx = 0; dx < w; dx++) {
      const sx = x + dx;
      if (sx < 0 || sx >= img.width) continue;
      const si = (sy * img.width + sx) * 4;
      const di = (dy * w + dx) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = 255;
      om.data[dy * w + dx] = mask.data[sy * img.width + sx];
    }
  }
  return { img: out, mask: om };
}

// ─── 3. Tone stretch inside the mask ─────────────────────────────────────────

export interface ToneStretchOptions {
  /** Percentile clipped at each end of the *subject's* histogram. */
  clipPct?: number;
  /** <1 lifts shadows. 0.85 is a good default for a black coat. */
  gamma?: number;
}

/**
 * THE decisive step for a solid-black dog (spec §11.3).
 *
 * The histogram is built from the dog's pixels only — including the background would
 * anchor the white point on the grass and leave the dog a silhouette again. Four percent
 * of separation in the shadows becomes chest, legs and the line of the spine.
 *
 * Mutates `img` in place: at full resolution this buffer is megabytes and there is no
 * reason to own two of them.
 */
export function stretchTonesInMask(
  img: RGBABuffer,
  mask: Mask,
  opts: ToneStretchOptions = {}
): RGBABuffer {
  const clip = opts.clipPct ?? 1;
  const gamma = opts.gamma ?? 0.85;
  const { data } = img;
  const hist = new Int32Array(256);
  let count = 0;

  for (let p = 0; p < mask.data.length; p++) {
    if (!mask.data[p]) continue;
    const i = p * 4;
    hist[Math.round(luma(data[i], data[i + 1], data[i + 2]))]++;
    count++;
  }
  if (!count) return img;

  const cut = Math.floor((count * clip) / 100);
  let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > cut) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > cut) { hi = v; break; } }
  if (hi - lo < 2) return img;

  // Look-up table, not a per-pixel pow — this runs over millions of pixels.
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
    lut[v] = Math.round(Math.pow(t, gamma) * 255);
  }

  for (let p = 0; p < mask.data.length; p++) {
    if (!mask.data[p]) continue;
    const i = p * 4;
    const l = luma(data[i], data[i + 1], data[i + 2]);
    const target = lut[Math.round(l)];
    // Scale the channels rather than replacing them, so the coat keeps its cold cast.
    const k = l < 1 ? 0 : target / l;
    data[i] = data[i] * k;
    data[i + 1] = data[i + 1] * k;
    data[i + 2] = data[i + 2] * k;
  }
  return img;
}

// ─── 4. Median filter ────────────────────────────────────────────────────────

/**
 * Flattens fur before the downscale (spec §11.4). Averaging short black fur directly
 * turns it into uniform mush; a median keeps the boundary between chest and leg.
 * Allocates one output buffer — the caller should drop the input right after.
 */
export function medianFilter(img: RGBABuffer, radius = 1): RGBABuffer {
  const { width: w, height: h, data } = img;
  const out = createBuffer(w, h);
  const n = (2 * radius + 1) * (2 * radius + 1);
  const buf = new Uint8Array(n);
  const mid = n >> 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const di = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let k = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const sy = Math.min(h - 1, Math.max(0, y + dy));
          for (let dx = -radius; dx <= radius; dx++) {
            const sx = Math.min(w - 1, Math.max(0, x + dx));
            buf[k++] = data[(sy * w + sx) * 4 + c];
          }
        }
        buf.sort();
        out.data[di + c] = buf[mid];
      }
      out.data[di + 3] = data[di + 3];
    }
  }
  return out;
}

// ─── 5. Area-average downscale ───────────────────────────────────────────────

/**
 * Box filter with fractional edge coverage (spec §11.5 — averaging, never bilinear).
 * Bilinear samples four pixels out of a hundred and throws the rest away; on fur that
 * is aliasing, not detail.
 *
 * When a mask is given, only subject pixels contribute colour and the output alpha is
 * the coverage fraction — so the background never bleeds into the silhouette.
 */
export function downscaleAreaAverage(
  img: RGBABuffer,
  dw: number,
  dh: number,
  mask?: Mask
): RGBABuffer {
  const { width: sw, height: sh, data } = img;
  const out = createBuffer(dw, dh);
  const sx = sw / dw;
  const sy = sh / dh;

  for (let y = 0; y < dh; y++) {
    const y0 = y * sy, y1 = (y + 1) * sy;
    for (let x = 0; x < dw; x++) {
      const x0 = x * sx, x1 = (x + 1) * sx;
      let r = 0, g = 0, b = 0, wsum = 0, cov = 0, area = 0;
      for (let py = Math.floor(y0); py < Math.ceil(y1); py++) {
        const fy = Math.min(y1, py + 1) - Math.max(y0, py);
        if (fy <= 0) continue;
        for (let px = Math.floor(x0); px < Math.ceil(x1); px++) {
          const fx = Math.min(x1, px + 1) - Math.max(x0, px);
          if (fx <= 0) continue;
          const wgt = fx * fy;
          area += wgt;
          const p = py * sw + px;
          const inside = mask ? mask.data[p] === 1 : data[p * 4 + 3] > 0;
          if (!inside) continue;
          const i = p * 4;
          r += data[i] * wgt;
          g += data[i + 1] * wgt;
          b += data[i + 2] * wgt;
          wsum += wgt;
          cov += wgt;
        }
      }
      const di = (y * dw + x) * 4;
      if (wsum > 0) {
        out.data[di] = r / wsum;
        out.data[di + 1] = g / wsum;
        out.data[di + 2] = b / wsum;
        out.data[di + 3] = area > 0 ? Math.round((cov / area) * 255) : 0;
      }
    }
  }
  return out;
}

/** Coverage → hard edge. Anti-aliased sprite edges look like dirt at 1:1. */
export function hardenAlpha(img: RGBABuffer, threshold = 128): RGBABuffer {
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] >= threshold ? 255 : 0;
  return img;
}

// ─── 6. Quantization snapped to the app palette ──────────────────────────────

function chroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/**
 * Snaps to the *app's* palette, not the photo's (spec §11.6).
 *
 * Neutral pixels are mapped by rank on the luminance ramp, which is the only thing that
 * survives on a black coat: nearest-RGB matching would collapse every shadow onto the
 * single darkest entry and undo the tone stretch. Strongly coloured pixels (a collar,
 * the tongue, an eye catching light) get a chance at an accent instead.
 */
export function quantizeToPalette(
  img: RGBABuffer,
  maxColors = 16,
  palette: readonly string[] = APP_PALETTE
): RGBABuffer {
  const accents = palette.filter((c) => !(COAT_RAMP as readonly string[]).includes(c));
  const rampHex = palette.filter((c) => (COAT_RAMP as readonly string[]).includes(c));
  const rampSteps = Math.max(2, Math.min(rampHex.length, maxColors - accents.length));
  const ramp: RGB[] = [];
  for (let i = 0; i < rampSteps; i++)
    ramp.push(hexToRgb(rampHex[Math.round((i * (rampHex.length - 1)) / (rampSteps - 1))]));
  const acc: RGB[] = accents.map(hexToRgb);

  const { data } = img;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let pick: RGB | null = null;

    if (chroma(r, g, b) > 45) {
      let bestD = Infinity;
      for (const a of acc) {
        const d = (a[0] - r) ** 2 + (a[1] - g) ** 2 + (a[2] - b) ** 2;
        if (d < bestD) { bestD = d; pick = a; }
      }
      if (bestD > 110 * 110) pick = null;
    }
    if (!pick) {
      const t = luma(r, g, b) / 255;
      pick = ramp[Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1)))];
    }
    data[i] = pick[0];
    data[i + 1] = pick[1];
    data[i + 2] = pick[2];
  }
  return img;
}

// ─── 7. Rim light ────────────────────────────────────────────────────────────

/**
 * 1px moonlight along the top contour (spec §11.7). On a dark character this buys more
 * readability than every other step combined, which is why it is also how the archetype
 * sprites are shaded.
 */
export function applyRimLight(img: RGBABuffer, rim: string = COAT_RIM): RGBABuffer {
  const { width: w, height: h, data } = img;
  const [rr, rg, rb] = hexToRgb(rim);
  const opaque = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  const marks: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (opaque(x, y) && !opaque(x, y - 1)) marks.push((y * w + x) * 4);
  for (const i of marks) {
    data[i] = rr;
    data[i + 1] = rg;
    data[i + 2] = rb;
  }
  return img;
}

// ─── 8. Accent extraction ────────────────────────────────────────────────────

/** 2–3 dominant colours → the interface accent palette (spec §11, §5 `Dog.palette`). */
export function dominantColors(img: RGBABuffer, count = 3): string[] {
  const tally = new Map<string, number>();
  const { data } = img;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const hex = rgbToHex(data[i], data[i + 1], data[i + 2]);
    tally.set(hex, (tally.get(hex) ?? 0) + 1);
  }
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([hex]) => hex);
}

// ─── Orchestration ───────────────────────────────────────────────────────────

export interface PixelizeOptions {
  size?: number;
  tolerance?: number;
  /** Skip flood fill and use this rectangle as the subject. */
  rect?: Rect;
  maxColors?: number;
  tone?: ToneStretchOptions;
}

export interface PixelizeResult {
  sprite: RGBABuffer;
  palette: string[];
  /** false when the flood fill produced nothing usable and the rect fallback is needed. */
  maskFound: boolean;
}

/**
 * Full run. `img` is consumed — the caller must not reuse it, and should drop its own
 * reference immediately so the full-resolution buffer can be collected during step 5.
 */
export function pixelize(img: RGBABuffer, opts: PixelizeOptions = {}): PixelizeResult {
  const size = opts.size ?? 64;
  let maskFound = true;

  let mask = opts.rect
    ? maskFromRect(img.width, img.height, opts.rect)
    : floodFillBackground(img, { tolerance: opts.tolerance });

  const bounds = maskBounds(mask);
  const total = img.width * img.height;
  // A mask covering ~everything or ~nothing means the fill failed, not that it succeeded.
  if (!bounds || bounds.w * bounds.h < total * 0.01 || bounds.w * bounds.h > total * 0.98) {
    maskFound = false;
    mask = maskFromRect(img.width, img.height, {
      x: (img.width * 0.1) | 0,
      y: (img.height * 0.1) | 0,
      w: (img.width * 0.8) | 0,
      h: (img.height * 0.8) | 0,
    });
  }

  stretchTonesInMask(img, mask, opts.tone);
  const cropped = cropToMask(img, mask)!;
  const flattened = medianFilter(cropped.img, 1);
  const sprite = downscaleAreaAverage(flattened, size, size, cropped.mask);

  hardenAlpha(sprite);
  quantizeToPalette(sprite, opts.maxColors ?? 16);
  applyRimLight(sprite);

  return { sprite, palette: dominantColors(sprite, 3), maskFound };
}

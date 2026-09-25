import {
  applyRimLight,
  cropToMask,
  dominantColors,
  downscaleAreaAverage,
  floodFillBackground,
  hardenAlpha,
  keepLargestBlob,
  maskBounds,
  maskFromRect,
  medianFilter,
  quantizeToPalette,
  stretchTonesInMask,
  pixelize,
} from '../pipeline';
import { APP_PALETTE, COAT_RIM, hexToRgb, luma, rgbToHex } from '../palette';
import { decodePng, encodePng } from '../png';
import { createBuffer, createMask, type RGBABuffer } from '../types';

// Node's zlib, declared locally rather than pulling @types/node into the app's tsconfig.
declare const require: (m: string) => any;

function fill(img: RGBABuffer, x0: number, y0: number, w: number, h: number, rgb: number[]) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * img.width + x) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = 255;
    }
}

const px = (img: RGBABuffer, x: number, y: number) => {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
};

// ─── area-average downscale ──────────────────────────────────────────────────

describe('downscaleAreaAverage', () => {
  it('averages whole 2×2 blocks exactly', () => {
    const src = createBuffer(4, 4);
    fill(src, 0, 0, 4, 4, [0, 0, 0]);
    fill(src, 0, 0, 2, 2, [100, 100, 100]);
    fill(src, 2, 0, 2, 2, [200, 40, 0]);

    const out = downscaleAreaAverage(src, 2, 2);
    expect(px(out, 0, 0).slice(0, 3)).toEqual([100, 100, 100]);
    expect(px(out, 1, 0).slice(0, 3)).toEqual([200, 40, 0]);
    expect(px(out, 0, 1).slice(0, 3)).toEqual([0, 0, 0]);
  });

  it('averages, it does not sample — a 1px stripe survives as a mid tone', () => {
    const src = createBuffer(4, 1);
    fill(src, 0, 0, 4, 1, [0, 0, 0]);
    fill(src, 1, 0, 1, 1, [255, 255, 255]);
    // Bilinear/nearest would return 0 or 255; area average must return 255/4.
    const out = downscaleAreaAverage(src, 1, 1);
    expect(px(out, 0, 0)[0]).toBe(64);
  });

  it('handles fractional coverage at non-integer ratios', () => {
    const src = createBuffer(3, 1);
    fill(src, 0, 0, 3, 1, [0, 0, 0]);
    fill(src, 0, 0, 1, 1, [90, 90, 90]);
    const out = downscaleAreaAverage(src, 2, 1); // each dst pixel covers 1.5 src pixels
    expect(px(out, 0, 0)[0]).toBe(60); // (90*1 + 0*0.5) / 1.5
    expect(px(out, 1, 0)[0]).toBe(0);
  });

  it('never lets the background bleed into the silhouette', () => {
    const src = createBuffer(2, 2);
    fill(src, 0, 0, 2, 2, [255, 255, 255]); // bright background
    fill(src, 0, 0, 1, 1, [40, 40, 40]); // one dark subject pixel
    const mask = createMask(2, 2);
    mask.data[0] = 1;

    const out = downscaleAreaAverage(src, 1, 1, mask);
    expect(px(out, 0, 0).slice(0, 3)).toEqual([40, 40, 40]);
    expect(px(out, 0, 0)[3]).toBe(64); // 25% coverage
  });
});

// ─── tone stretch ────────────────────────────────────────────────────────────

describe('stretchTonesInMask', () => {
  it('turns a near-black dog into a readable range', () => {
    // The real case: a whole dog inside 4% of the range, invisible on the photo.
    const img = createBuffer(8, 8);
    fill(img, 0, 0, 8, 8, [180, 190, 200]); // daylight background
    const mask = createMask(8, 8);
    for (let y = 2; y < 6; y++)
      for (let x = 2; x < 6; x++) {
        const v = 10 + (x - 2) * 1 + (y - 2) * 1; // 10..16
        fill(img, x, y, 1, 1, [v, v, v + 2]);
        mask.data[y * 8 + x] = 1;
      }

    const before = [] as number[];
    for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) before.push(px(img, x, y)[0]);
    expect(Math.max(...before) - Math.min(...before)).toBeLessThan(10);

    stretchTonesInMask(img, mask, { clipPct: 0, gamma: 1 });

    const after = [] as number[];
    for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) after.push(px(img, x, y)[0]);
    expect(Math.max(...after) - Math.min(...after)).toBeGreaterThan(200);
  });

  it('builds the histogram from the subject only — the background must not anchor it', () => {
    const img = createBuffer(4, 1);
    fill(img, 0, 0, 4, 1, [255, 255, 255]);
    fill(img, 0, 0, 1, 1, [20, 20, 20]);
    fill(img, 1, 0, 1, 1, [30, 30, 30]);
    const mask = createMask(4, 1);
    mask.data[0] = 1;
    mask.data[1] = 1;

    stretchTonesInMask(img, mask, { clipPct: 0, gamma: 1 });
    expect(px(img, 0, 0)[0]).toBe(0);
    expect(px(img, 1, 0)[0]).toBe(255);
    expect(px(img, 2, 0)[0]).toBe(255); // background untouched
  });

  it('is a no-op when the subject is genuinely flat', () => {
    const img = createBuffer(2, 1);
    fill(img, 0, 0, 2, 1, [12, 12, 12]);
    const mask = createMask(2, 1, 1);
    stretchTonesInMask(img, mask);
    expect(px(img, 0, 0)[0]).toBe(12);
  });
});

// ─── quantization ────────────────────────────────────────────────────────────

describe('quantizeToPalette', () => {
  it('snaps every opaque pixel to the app palette, not to the photo colours', () => {
    const img = createBuffer(16, 16);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++)
        fill(img, x, y, 1, 1, [x * 16, y * 16, ((x + y) * 8) % 256]);

    quantizeToPalette(img, 16);
    for (let i = 0; i < img.data.length; i += 4) {
      const hex = rgbToHex(img.data[i], img.data[i + 1], img.data[i + 2]);
      expect(APP_PALETTE).toContain(hex);
    }
  });

  it('keeps luminance order — shadow never outranks highlight', () => {
    const img = createBuffer(3, 1);
    fill(img, 0, 0, 1, 1, [10, 10, 12]);
    fill(img, 1, 0, 1, 1, [120, 120, 124]);
    fill(img, 2, 0, 1, 1, [240, 240, 244]);
    quantizeToPalette(img, 16);
    const l = [0, 1, 2].map((x) => luma(...(px(img, x, 0).slice(0, 3) as [number, number, number])));
    expect(l[0]).toBeLessThan(l[1]);
    expect(l[1]).toBeLessThan(l[2]);
  });

  it('gives a saturated pixel an accent instead of a cold grey', () => {
    const img = createBuffer(1, 1);
    fill(img, 0, 0, 1, 1, [214, 164, 76]); // a gold eye catching light
    quantizeToPalette(img, 16);
    expect(rgbToHex(img.data[0], img.data[1], img.data[2])).toBe('#d9a54a');
  });

  it('respects maxColors', () => {
    const img = createBuffer(32, 1);
    for (let x = 0; x < 32; x++) fill(img, x, 0, 1, 1, [x * 8, x * 8, x * 8]);
    quantizeToPalette(img, 8);
    const used = new Set<string>();
    for (let i = 0; i < img.data.length; i += 4)
      used.add(rgbToHex(img.data[i], img.data[i + 1], img.data[i + 2]));
    expect(used.size).toBeLessThanOrEqual(8);
  });

  it('leaves transparent pixels alone', () => {
    const img = createBuffer(1, 1);
    quantizeToPalette(img, 16);
    expect(px(img, 0, 0)[3]).toBe(0);
  });
});

// ─── rim light ───────────────────────────────────────────────────────────────

describe('applyRimLight', () => {
  const rim = hexToRgb(COAT_RIM);

  it('lights exactly the top contour, one pixel deep', () => {
    const img = createBuffer(5, 5);
    fill(img, 1, 1, 3, 3, [30, 30, 40]);
    applyRimLight(img);

    for (let x = 1; x <= 3; x++) expect(px(img, x, 1).slice(0, 3)).toEqual(rim);
    for (let x = 1; x <= 3; x++) expect(px(img, x, 2).slice(0, 3)).toEqual([30, 30, 40]);
    expect(px(img, 0, 1)[3]).toBe(0);
  });

  it('follows a stepped contour rather than a bounding box', () => {
    const img = createBuffer(4, 4);
    fill(img, 0, 2, 4, 2, [30, 30, 40]); // low block
    fill(img, 2, 0, 2, 2, [30, 30, 40]); // step up on the right
    applyRimLight(img);

    expect(px(img, 0, 2).slice(0, 3)).toEqual(rim); // top of the low part
    expect(px(img, 2, 0).slice(0, 3)).toEqual(rim); // top of the step
    expect(px(img, 2, 2).slice(0, 3)).toEqual([30, 30, 40]); // covered from above
  });

  it('rims a pixel exposed at the very top row', () => {
    const img = createBuffer(3, 3);
    fill(img, 1, 0, 1, 3, [30, 30, 40]);
    applyRimLight(img);
    expect(px(img, 1, 0).slice(0, 3)).toEqual(rim);
    expect(px(img, 1, 1).slice(0, 3)).toEqual([30, 30, 40]);
  });
});

// ─── masking / crop ──────────────────────────────────────────────────────────

describe('background removal', () => {
  it('finds a subject on a plain background', () => {
    const img = createBuffer(20, 20);
    fill(img, 0, 0, 20, 20, [200, 205, 210]);
    fill(img, 6, 5, 8, 10, [24, 26, 34]);

    const mask = floodFillBackground(img, { tolerance: 40 });
    expect(mask.data[7 * 20 + 8]).toBe(1);
    expect(mask.data[0]).toBe(0);
    expect(maskBounds(mask)).toEqual({ x: 6, y: 5, w: 8, h: 10 });
  });

  it('drops speckles and keeps the largest blob', () => {
    const mask = createMask(10, 10);
    for (let y = 1; y < 6; y++) for (let x = 1; x < 6; x++) mask.data[y * 10 + x] = 1;
    mask.data[9 * 10 + 9] = 1;
    keepLargestBlob(mask);
    expect(mask.data[9 * 10 + 9]).toBe(0);
    expect(mask.data[2 * 10 + 2]).toBe(1);
  });

  it('maskFromRect is the guaranteed fallback and never fails', () => {
    const mask = maskFromRect(10, 10, { x: 2, y: 3, w: 4, h: 5 });
    expect(maskBounds(mask)).toEqual({ x: 2, y: 3, w: 4, h: 5 });
  });

  it('crops to a square so the dog keeps his proportions', () => {
    const img = createBuffer(20, 20);
    fill(img, 0, 0, 20, 20, [10, 10, 10]);
    const mask = maskFromRect(20, 20, { x: 4, y: 6, w: 8, h: 4 });
    const out = cropToMask(img, mask)!;
    expect(out.img.width).toBe(8);
    expect(out.img.height).toBe(8);
  });
});

// ─── supporting transforms ───────────────────────────────────────────────────

describe('medianFilter', () => {
  it('removes a single-pixel speck without smearing an edge', () => {
    const img = createBuffer(5, 5);
    fill(img, 0, 0, 5, 5, [40, 40, 40]);
    fill(img, 2, 2, 1, 1, [250, 250, 250]);
    const out = medianFilter(img, 1);
    expect(px(out, 2, 2)[0]).toBe(40);

    const edge = createBuffer(5, 5);
    fill(edge, 0, 0, 5, 5, [40, 40, 40]);
    fill(edge, 3, 0, 2, 5, [200, 200, 200]);
    const outEdge = medianFilter(edge, 1);
    expect(px(outEdge, 4, 2)[0]).toBe(200);
    expect(px(outEdge, 1, 2)[0]).toBe(40);
  });
});

describe('hardenAlpha and dominantColors', () => {
  it('turns coverage into a hard edge', () => {
    const img = createBuffer(2, 1);
    img.data[3] = 200;
    img.data[7] = 40;
    hardenAlpha(img);
    expect(img.data[3]).toBe(255);
    expect(img.data[7]).toBe(0);
  });

  it('ranks the accent colours by area and ignores transparent pixels', () => {
    const img = createBuffer(4, 1);
    fill(img, 0, 0, 2, 1, [43, 48, 64]);
    fill(img, 2, 0, 1, 1, [217, 165, 74]);
    expect(dominantColors(img, 2)).toEqual(['#2b3040', '#d9a54a']);
  });
});

// ─── end to end ──────────────────────────────────────────────────────────────

describe('pixelize', () => {
  it('produces a palette-legal sprite from a near-black subject on a plain background', () => {
    const img = createBuffer(200, 200);
    fill(img, 0, 0, 200, 200, [190, 195, 205]);
    for (let y = 40; y < 160; y++)
      for (let x = 50; x < 150; x++) {
        const v = 9 + Math.round(((x - 50) / 100) * 6); // the whole dog inside 6 levels
        fill(img, x, y, 1, 1, [v, v, v + 2]);
      }

    const { sprite, palette, maskFound } = pixelize(img, { size: 64 });
    expect(maskFound).toBe(true);
    expect(sprite.width).toBe(64);

    let opaque = 0;
    for (let i = 3; i < sprite.data.length; i += 4) if (sprite.data[i]) opaque++;
    expect(opaque).toBeGreaterThan(64 * 64 * 0.2);

    const used = new Set<string>();
    for (let i = 0; i < sprite.data.length; i += 4) {
      if (!sprite.data[i + 3]) continue;
      used.add(rgbToHex(sprite.data[i], sprite.data[i + 1], sprite.data[i + 2]));
    }
    for (const hex of used) expect(APP_PALETTE).toContain(hex);
    expect(used.size).toBeGreaterThan(1); // the tone stretch did something
    expect(palette.length).toBeGreaterThan(0);
  });

  it('falls back to a rectangle when the fill finds nothing (spec §13)', () => {
    const img = createBuffer(64, 64);
    fill(img, 0, 0, 64, 64, [70, 70, 70]); // dog and background indistinguishable
    const { maskFound, sprite } = pixelize(img, { size: 64 });
    expect(maskFound).toBe(false);
    expect(sprite.width).toBe(64);
  });
});

// ─── png round trip ──────────────────────────────────────────────────────────

describe('png codec', () => {
  it('round-trips an RGBA buffer', () => {
    const img = createBuffer(9, 7);
    for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 37) % 256;
    const out = decodePng(encodePng(img));
    expect(out.width).toBe(9);
    expect(out.height).toBe(7);
    expect(Array.from(out.data)).toEqual(Array.from(img.data));
  });

  it('decodes a real deflate-compressed PNG produced outside this module', () => {
    // Huffman-coded, not stored, so the inflate path is genuinely exercised.
    const deflateSync: (b: Uint8Array, o?: any) => Uint8Array = require('zlib').deflateSync;

    const w = 16, h = 16, stride = w * 4;
    const raw = new Uint8Array((stride + 1) * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const o = y * (stride + 1) + 1 + x * 4;
        raw[o] = x * 16; raw[o + 1] = y * 16; raw[o + 2] = 128; raw[o + 3] = 255;
      }
    // Filter type 2 (Up) on every row but the first — exercises un-filtering too.
    for (let y = h - 1; y > 0; y--) {
      raw[y * (stride + 1)] = 2;
      for (let x = 0; x < stride; x++)
        raw[y * (stride + 1) + 1 + x] =
          (raw[y * (stride + 1) + 1 + x] - raw[(y - 1) * (stride + 1) + 1 + x]) & 0xff;
    }
    const z = deflateSync(raw, { level: 9 });

    const parts: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const chunk = (type: string, body: number[]) => {
      parts.push((body.length >>> 24) & 255, (body.length >>> 16) & 255, (body.length >>> 8) & 255, body.length & 255);
      for (let i = 0; i < 4; i++) parts.push(type.charCodeAt(i));
      for (const b of body) parts.push(b);
      parts.push(0, 0, 0, 0); // CRC — the decoder does not verify it
    };
    chunk('IHDR', [0, 0, 0, w, 0, 0, 0, h, 8, 6, 0, 0, 0]);
    chunk('IDAT', Array.from(z));
    chunk('IEND', []);

    const out = decodePng(new Uint8Array(parts));
    expect(out.width).toBe(16);
    expect(px(out, 3, 5).slice(0, 4)).toEqual([48, 80, 128, 255]);
  });
});

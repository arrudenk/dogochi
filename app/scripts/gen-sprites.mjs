#!/usr/bin/env node
// Bakes the archetype sighthound sprite set (spec §11 "План Б") into PNGs.
// Node stdlib only. Run: node scripts/gen-sprites.mjs
//
// Why bake instead of draw at runtime: spec §12 — sprites cost zero per frame.
// @2x/@4x are nearest-neighbour integer upscales because React Native cannot turn
// off image smoothing; crisp pixels have to come out of the build, not the GPU.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG, blank, put, get, upscale, hex } from './png.mjs';
import { POSES, PORTRAIT } from './sprite-shapes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'sprites');

// Spec §12. Never pure black: the coat is built from cold tones, #13151d is the floor.
const COAT = {
  rim: hex('#6b7a99'),   // moonlight on the back and top contour
  light: hex('#39415a'), // the rest of the silhouette edge — without it a black dog has no outline
  body: hex('#2b3040'),
  deep: hex('#1f2431'),  // interior core, and the far-side limbs
  shadow: hex('#13151d'),
  eye: hex('#d9a54a'),
};

function buildMask(size, runs) {
  const m = new Uint8Array(size * size);
  for (const [y, x0, x1] of runs) {
    if (y < 0 || y >= size) continue;
    for (let x = Math.max(0, x0); x <= Math.min(size - 1, x1); x++) m[y * size + x] = 1;
  }
  return m;
}

const at = (m, size, x, y) =>
  x < 0 || y < 0 || x >= size || y >= size ? 0 : m[y * size + x];

/** Chamfer distance from the background — one pass down, one up. Cheap and exact enough. */
function edgeDistance(mask, size) {
  const INF = 999;
  const d = new Int16Array(size * size);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? INF : 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (!d[i]) continue;
      const a = y > 0 ? d[i - size] : 0;
      const b = x > 0 ? d[i - 1] : 0;
      d[i] = Math.min(d[i], a + 1, b + 1);
    }
  for (let y = size - 1; y >= 0; y--)
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x;
      if (!d[i]) continue;
      const a = y < size - 1 ? d[i + size] : 0;
      const b = x < size - 1 ? d[i + 1] : 0;
      d[i] = Math.min(d[i], a + 1, b + 1);
    }
  return d;
}

/**
 * Shade a silhouette. One rule set for the whole set, so the five poses stay consistent.
 * Light is the moon: straight above. Top contour takes the bright rim, the underside takes
 * the deepest shadow, and every other edge pixel takes the mid light — on a dog this dark
 * an unlit side edge is literally invisible against the #0d0f14 background.
 */
function shade(shape) {
  const size = shape.size;
  const mask = buildMask(size, shape.body);
  const dist = edgeDistance(mask, size);
  const img = blank(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!at(mask, size, x, y)) continue;
      let c;
      if (!at(mask, size, x, y - 1)) c = COAT.rim;
      else if (!at(mask, size, x, y + 1)) c = COAT.shadow;
      else if (!at(mask, size, x - 1, y) || !at(mask, size, x + 1, y)) c = COAT.light;
      else if (dist[y * size + x] >= 4) c = COAT.deep;
      else c = COAT.body;
      put(img, x, y, c);
    }
  }

  // Explicit overrides win over the automatic pass, darkest first.
  const paint = (runs, color) => {
    if (!runs) return;
    for (const [y, x0, x1] of runs)
      for (let x = x0; x <= x1; x++) if (at(mask, size, x, y)) put(img, x, y, color);
  };
  paint(shape.deep, COAT.deep);
  paint(shape.shadow, COAT.shadow);
  paint(shape.light, COAT.light);
  paint(shape.rim, COAT.rim);
  // Eye last: on a black dog it is half the recognition and must never be overwritten.
  paint(shape.lid, COAT.shadow);
  paint(shape.gold, COAT.eye);
  paint(shape.pupil, COAT.shadow);
  paint(shape.spark, COAT.rim);

  for (const [x, y] of shape.eye ?? []) put(img, x, y, COAT.eye);

  return img;
}

function write(file, img) {
  fs.writeFileSync(file, encodePNG(img));
  return fs.statSync(file).size;
}

fs.mkdirSync(OUT, { recursive: true });

const shapes = { ...POSES, portrait: PORTRAIT };
const rendered = {};
let total = 0;

for (const [pose, shape] of Object.entries(shapes)) {
  const img = shade(shape);
  rendered[pose] = img;
  total += write(path.join(OUT, `${pose}.png`), img);
  total += write(path.join(OUT, `${pose}@2x.png`), upscale(img, 2));
  total += write(path.join(OUT, `${pose}@4x.png`), upscale(img, 4));
  let px = 0;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i]) px++;
  console.log(`${pose.padEnd(9)} ${shape.size}×${shape.size}  ${px} px drawn`);
}
console.log(`\n${Object.keys(shapes).length * 3} files, ${(total / 1024).toFixed(1)} KB total → assets/sprites/`);

// ── visual check ────────────────────────────────────────────────────────────
// A contact sheet is the only honest test for pixel art. Emit both a PNG (so it
// can be inspected directly) and an HTML sheet with crisp-edges scaling.
const Z = 6;
const GAP = 12;
const order = ['stand', 'sit', 'lie', 'run', 'portrait'];
const sheetH = Math.max(...order.map((p) => shapes[p].size)) * Z + GAP * 2;
const sheetW = order.reduce((w, p) => w + shapes[p].size * Z + GAP, GAP);
const sheet = blank(sheetW, sheetH);
for (let i = 0; i < sheet.data.length; i += 4) {
  sheet.data[i] = 0x0d; sheet.data[i + 1] = 0x0f; sheet.data[i + 2] = 0x14; sheet.data[i + 3] = 255;
}
let ox = GAP;
for (const pose of order) {
  const big = upscale(rendered[pose], Z);
  const oy = sheetH - GAP - big.height;
  for (let y = 0; y < big.height; y++)
    for (let x = 0; x < big.width; x++) {
      const c = get(big, x, y);
      if (c[3]) put(sheet, ox + x, oy + y, c);
    }
  ox += big.width + GAP;
}
fs.writeFileSync(path.join(ROOT, 'scripts', 'contact-sheet.png'), encodePNG(sheet));

const html = `<!doctype html><meta charset="utf-8"><title>dogochi — sprite contact sheet</title>
<style>
 body{background:#0d0f14;color:#c9b98f;font:12px ui-monospace,Menlo,monospace;margin:0;padding:24px}
 h1{color:#d9a54a;font-size:14px;letter-spacing:.14em;text-transform:uppercase;font-weight:400}
 .row{display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap;margin-bottom:28px}
 figure{margin:0;text-align:center}
 img{image-rendering:pixelated;background:
   repeating-conic-gradient(#15171f 0 25%,#0f1118 0 50%) 0 0/12px 12px;
   border:1px solid #3a3223}
 figcaption{color:#6d6349;margin-top:6px;letter-spacing:.1em;text-transform:uppercase;font-size:10px}
</style>
<h1>Архетип — нічний гонець</h1>
<div class="row">${order
  .map((p) => {
    const s = shapes[p].size * 8;
    return `<figure><img src="../assets/sprites/${p}.png" width="${s}" height="${s}"><figcaption>${p} 8×</figcaption></figure>`;
  })
  .join('')}</div>
<h1>1:1 — як воно реально читається</h1>
<div class="row">${order
  .map((p) => `<figure><img src="../assets/sprites/${p}.png"><figcaption>${p}</figcaption></figure>`)
  .join('')}</div>
<h1>на сцені лігва (~3×)</h1>
<div class="row" style="background:linear-gradient(#141926,#0b0d12);padding:18px;border:1px solid #3a3223">
${order.map((p) => `<img src="../assets/sprites/${p}@4x.png" width="${shapes[p].size * 3}">`).join('')}
</div>`;
fs.writeFileSync(path.join(ROOT, 'scripts', 'contact-sheet.html'), html);
console.log('contact sheet → scripts/contact-sheet.html + .png');

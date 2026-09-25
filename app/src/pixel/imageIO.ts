/**
 * The only file in src/pixel that talks to the platform.
 *
 * expo-image-manipulator decodes / resizes / crops; expo-file-system moves bytes;
 * `png.ts` turns bytes into an RGBA buffer and back. Everything else is pure.
 *
 * Memory budget (spec §12 — never five full-size photos at once):
 *   decode at ≤ WORK_SIZE px on the long edge  → 1024×1024×4 =  4.0 MB
 *   PNG bytes read from the manipulator's temp  →            ~ 1.5 MB
 *   mask                                        →              1.0 MB
 *   median filter output                        →              4.0 MB
 *   ────────────────────────────────────────────────────────────────
 *   peak ≈ 11 MB, one photo at a time. The 64×64 result is 16 KB.
 *
 * The manipulator downsamples natively, so a 12 MP original is never a JS buffer.
 */

import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { SpritePose } from '../core/types';
import { decodePng, encodePng } from './png';
import type { RGBABuffer } from './types';

/** Long-edge working resolution. Above this the median filter dominates the runtime
 *  and buys nothing: the output is 64 px wide. */
export const WORK_SIZE = 1024;

const SPRITE_DIR = 'sprites';

/**
 * Photo URI → RGBA buffer, downsampled on the native side first.
 * The temporary PNG is deleted before returning so it never accumulates in the cache.
 */
export async function decodeToRGBA(uri: string, maxDim = WORK_SIZE): Promise<RGBABuffer> {
  const ctx = ImageManipulator.manipulate(uri);
  const ref = await ctx.renderAsync();
  const long = Math.max(ref.width, ref.height);
  const scaled =
    long > maxDim
      ? await ImageManipulator.manipulate(uri)
          .resize(
            ref.width >= ref.height ? { width: maxDim } : { height: maxDim }
          )
          .renderAsync()
      : ref;

  const saved = await scaled.saveAsync({ format: SaveFormat.PNG });
  const file = new File(saved.uri);
  try {
    return decodePng(await file.bytes());
  } finally {
    try { file.delete(); } catch { /* cache file, best effort */ }
  }
}

/** Crop natively before decoding — cheaper than cropping a JS buffer and keeps peak low. */
export async function cropAndDecode(
  uri: string,
  rect: { x: number; y: number; w: number; h: number },
  maxDim = WORK_SIZE
): Promise<RGBABuffer> {
  const saved = await ImageManipulator.manipulate(uri)
    .crop({ originX: rect.x, originY: rect.y, width: rect.w, height: rect.h })
    .resize({ width: Math.min(maxDim, rect.w) })
    .renderAsync()
    .then((r) => r.saveAsync({ format: SaveFormat.PNG }));
  const file = new File(saved.uri);
  try {
    return decodePng(await file.bytes());
  } finally {
    try { file.delete(); } catch { /* best effort */ }
  }
}

function spriteFile(dogId: string, pose: SpritePose): File {
  const dir = new File(Paths.document, SPRITE_DIR, `${dogId}-${pose}.png`);
  return dir;
}

/** Writes the finished sprite and returns its `file://` URI for `Dog.sprites`. */
export async function writeSpritePng(
  img: RGBABuffer,
  dogId: string,
  pose: SpritePose
): Promise<string> {
  const file = spriteFile(dogId, pose);
  file.create({ intermediates: true, overwrite: true });
  file.write(encodePng(img));
  return file.uri;
}

/** Reads a previously summoned sprite back for the editor. Returns null if §13 applies. */
export async function readSpritePng(
  dogId: string,
  pose: SpritePose
): Promise<RGBABuffer | null> {
  try {
    const file = spriteFile(dogId, pose);
    if (!file.exists) return null;
    return decodePng(await file.bytes());
  } catch {
    return null; // missing or corrupt → caller falls back to the archetype
  }
}

export function deleteSprite(dogId: string, pose: SpritePose): void {
  try {
    const file = spriteFile(dogId, pose);
    if (file.exists) file.delete();
  } catch { /* best effort */ }
}

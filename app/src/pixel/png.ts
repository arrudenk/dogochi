/**
 * Minimal PNG codec in pure TypeScript.
 *
 * React Native has no zlib and the brief forbids new dependencies, so inflate is
 * implemented here (puff-style canonical Huffman) and deflate is not implemented at all:
 * encoding uses *stored* blocks, which are valid zlib and cost nothing in CPU. A 64×64
 * RGBA sprite stores at ~16 KB instead of ~2 KB. That is the right trade — sprites are
 * written once per summoning, and the alternative is shipping a compressor we would
 * then have to trust.
 */

import { createBuffer, type RGBABuffer } from './types';

// ─── inflate ─────────────────────────────────────────────────────────────────

const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CLORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

interface Huff {
  count: Int32Array;
  symbol: Int32Array;
}

function buildHuff(lengths: Uint8Array, n: number): Huff {
  const count = new Int32Array(16);
  for (let i = 0; i < n; i++) count[lengths[i]]++;
  count[0] = 0;
  const offs = new Int32Array(16);
  for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1];
  const symbol = new Int32Array(n);
  for (let i = 0; i < n; i++) if (lengths[i]) symbol[offs[lengths[i]]++] = i;
  return { count, symbol };
}

class BitStream {
  pos = 0;
  private buf = 0;
  private cnt = 0;
  constructor(readonly src: Uint8Array) {}

  bits(need: number): number {
    let val = this.buf;
    while (this.cnt < need) {
      if (this.pos >= this.src.length) throw new Error('png: truncated deflate stream');
      val |= this.src[this.pos++] << this.cnt;
      this.cnt += 8;
    }
    this.buf = val >>> need;
    this.cnt -= need;
    return val & ((1 << need) - 1);
  }

  align(): void {
    this.buf = 0;
    this.cnt = 0;
  }

  decode(h: Huff): number {
    let code = 0, first = 0, index = 0;
    for (let len = 1; len < 16; len++) {
      code |= this.bits(1);
      const c = h.count[len];
      if (code - first < c) return h.symbol[index + (code - first)];
      index += c;
      first = (first + c) << 1;
      code <<= 1;
    }
    throw new Error('png: bad huffman code');
  }
}

let FIXED_LIT: Huff | null = null;
let FIXED_DIST: Huff | null = null;
function fixedTables(): [Huff, Huff] {
  if (!FIXED_LIT) {
    const l = new Uint8Array(288);
    l.fill(8, 0, 144); l.fill(9, 144, 256); l.fill(7, 256, 280); l.fill(8, 280, 288);
    FIXED_LIT = buildHuff(l, 288);
    FIXED_DIST = buildHuff(new Uint8Array(30).fill(5), 30);
  }
  return [FIXED_LIT, FIXED_DIST!];
}

/** zlib-wrapped inflate. `hint` is the expected output size — supply it to avoid regrowth. */
export function inflate(src: Uint8Array, hint = 0): Uint8Array {
  if (src.length < 2) throw new Error('png: empty zlib stream');
  const s = new BitStream(src.subarray(2)); // skip CMF/FLG
  let out = new Uint8Array(hint || Math.max(1024, src.length * 4));
  let len = 0;
  const need = (n: number) => {
    if (len + n <= out.length) return;
    let cap = out.length * 2;
    while (cap < len + n) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(out.subarray(0, len));
    out = next;
  };

  for (;;) {
    const last = s.bits(1);
    const type = s.bits(2);
    if (type === 0) {
      s.align();
      const blockLen = s.src[s.pos] | (s.src[s.pos + 1] << 8);
      s.pos += 4;
      need(blockLen);
      out.set(s.src.subarray(s.pos, s.pos + blockLen), len);
      s.pos += blockLen;
      len += blockLen;
    } else {
      let lit: Huff, dist: Huff;
      if (type === 1) {
        [lit, dist] = fixedTables();
      } else if (type === 2) {
        const nlen = s.bits(5) + 257;
        const ndist = s.bits(5) + 1;
        const ncode = s.bits(4) + 4;
        const clen = new Uint8Array(19);
        for (let i = 0; i < ncode; i++) clen[CLORDER[i]] = s.bits(3);
        const ch = buildHuff(clen, 19);
        const lengths = new Uint8Array(nlen + ndist);
        let i = 0;
        while (i < nlen + ndist) {
          const sym = s.decode(ch);
          if (sym < 16) lengths[i++] = sym;
          else if (sym === 16) {
            const prev = lengths[i - 1];
            for (let r = s.bits(2) + 3; r > 0; r--) lengths[i++] = prev;
          } else if (sym === 17) {
            i += s.bits(3) + 3;
          } else {
            i += s.bits(7) + 11;
          }
        }
        lit = buildHuff(lengths.subarray(0, nlen), nlen);
        dist = buildHuff(lengths.subarray(nlen), ndist);
      } else {
        throw new Error('png: invalid deflate block type');
      }

      for (;;) {
        const sym = s.decode(lit);
        if (sym < 256) {
          need(1);
          out[len++] = sym;
        } else if (sym === 256) {
          break;
        } else {
          const si = sym - 257;
          const l = LBASE[si] + s.bits(LEXT[si]);
          const ds = s.decode(dist);
          const d = DBASE[ds] + s.bits(DEXT[ds]);
          need(l);
          let from = len - d;
          for (let k = 0; k < l; k++) out[len++] = out[from++];
        }
      }
    }
    if (last) break;
  }
  return out.subarray(0, len);
}

// ─── decode ──────────────────────────────────────────────────────────────────

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Non-interlaced, 8-bit, colour type 0/2/4/6. That is everything expo-image-manipulator emits. */
export function decodePng(bytes: Uint8Array): RGBABuffer {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 8;
  let width = 0, height = 0, colorType = 6, depth = 8;
  const idat: Uint8Array[] = [];
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;

  while (p + 8 <= bytes.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
    const body = bytes.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = dv.getUint32(p + 8);
      height = dv.getUint32(p + 12);
      depth = bytes[p + 16];
      colorType = bytes[p + 17];
      if (bytes[p + 20] !== 0) throw new Error('png: interlaced images are not supported');
    } else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') trns = body;
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8) throw new Error(`png: unsupported bit depth ${depth}`);

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const stride = width * channels;

  let comp: Uint8Array;
  if (idat.length === 1) comp = idat[0];
  else {
    let n = 0;
    for (const c of idat) n += c.length;
    comp = new Uint8Array(n);
    let o = 0;
    for (const c of idat) { comp.set(c, o); o += c.length; }
  }
  const raw = inflate(comp, (stride + 1) * height);

  // Un-filter inside `raw` itself. A second scanline buffer would be another 4 MB
  // on a 1024² photo for no reason — the filtered bytes are never needed again.
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)];
    if (ft === 0) continue;
    const row = y * (stride + 1) + 1;
    const up = row - (stride + 1);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? raw[row + x - channels] : 0;
      const b = y > 0 ? raw[up + x] : 0;
      const c = x >= channels && y > 0 ? raw[up + x - channels] : 0;
      const v = raw[row + x];
      raw[row + x] =
        ft === 1 ? v + a :
        ft === 2 ? v + b :
        ft === 3 ? v + ((a + b) >> 1) :
        v + paeth(a, b, c);
    }
  }

  const out = createBuffer(width, height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1) + 1;
    for (let x = 0; x < width; x++) {
      const s = row + x * channels;
      const o = (y * width + x) * 4;
      if (channels === 4) {
        out.data[o] = raw[s]; out.data[o + 1] = raw[s + 1];
        out.data[o + 2] = raw[s + 2]; out.data[o + 3] = raw[s + 3];
      } else if (channels === 3) {
        out.data[o] = raw[s]; out.data[o + 1] = raw[s + 1];
        out.data[o + 2] = raw[s + 2]; out.data[o + 3] = 255;
      } else if (channels === 2) {
        out.data[o] = out.data[o + 1] = out.data[o + 2] = raw[s];
        out.data[o + 3] = raw[s + 1];
      } else if (palette) {
        const q = raw[s] * 3;
        out.data[o] = palette[q]; out.data[o + 1] = palette[q + 1]; out.data[o + 2] = palette[q + 2];
        out.data[o + 3] = trns && raw[s] < trns.length ? trns[raw[s]] : 255;
      } else {
        out.data[o] = out.data[o + 1] = out.data[o + 2] = raw[s];
        out.data[o + 3] = 255;
      }
    }
  }
  return out;
}

// ─── encode ──────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Uint8Array, from = 0, to = buf.length): number {
  let c = -1;
  for (let i = from; i < to; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function adler32(buf: Uint8Array): number {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** zlib stream made entirely of stored blocks — valid, and no compressor to ship. */
function storedZlib(raw: Uint8Array): Uint8Array {
  const MAX = 65535;
  const blocks = Math.max(1, Math.ceil(raw.length / MAX));
  const out = new Uint8Array(2 + blocks * 5 + raw.length + 4);
  let o = 0;
  out[o++] = 0x78;
  out[o++] = 0x01;
  for (let i = 0; i < blocks; i++) {
    const start = i * MAX;
    const n = Math.min(MAX, raw.length - start);
    out[o++] = i === blocks - 1 ? 1 : 0;
    out[o++] = n & 0xff;
    out[o++] = (n >> 8) & 0xff;
    out[o++] = ~n & 0xff;
    out[o++] = (~n >> 8) & 0xff;
    out.set(raw.subarray(start, start + n), o);
    o += n;
  }
  const ad = adler32(raw);
  out[o++] = (ad >>> 24) & 0xff;
  out[o++] = (ad >>> 16) & 0xff;
  out[o++] = (ad >>> 8) & 0xff;
  out[o++] = ad & 0xff;
  return out.subarray(0, o);
}

export function encodePng(img: RGBABuffer): Uint8Array {
  const { width, height, data } = img;
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    raw.set(data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const z = storedZlib(raw);

  const size = 8 + (12 + 13) + (12 + z.length) + 12;
  const out = new Uint8Array(size);
  const dv = new DataView(out.buffer);
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  let o = 8;

  const chunk = (type: string, len: number, fill: (at: number) => void) => {
    dv.setUint32(o, len);
    for (let i = 0; i < 4; i++) out[o + 4 + i] = type.charCodeAt(i);
    fill(o + 8);
    dv.setUint32(o + 8 + len, crc32(out, o + 4, o + 8 + len));
    o += 12 + len;
  };

  chunk('IHDR', 13, (at) => {
    dv.setUint32(at, width);
    dv.setUint32(at + 4, height);
    out[at + 8] = 8;
    out[at + 9] = 6;
  });
  chunk('IDAT', z.length, (at) => out.set(z, at));
  chunk('IEND', 0, () => {});
  return out.subarray(0, o);
}

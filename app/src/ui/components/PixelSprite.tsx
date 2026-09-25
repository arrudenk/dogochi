import React, { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import { PIXEL_PALETTE } from '@/ui/theme';
import type { PixelGrid } from './pixelIcons';

interface Run {
  x: number;
  y: number;
  w: number;
  fill: string;
}

interface Baked {
  w: number;
  h: number;
  runs: Run[];
}

/** Сітки печуться один раз на застосунок, а не на кожен рендер. */
const CACHE = new WeakMap<object, Baked>();

function bake(rows: PixelGrid, palette: Record<string, string>): Baked {
  const w = rows[0]?.length ?? 0;
  const h = rows.length;
  const runs: Run[] = [];
  for (let y = 0; y < h; y++) {
    const row = rows[y] ?? '';
    let x = 0;
    while (x < w) {
      const fill = palette[row[x] ?? '.'];
      if (fill == null) {
        x++;
        continue;
      }
      // горизонтальні пробіги замість піксель-на-прямокутник — менше вузлів у дереві
      let run = 1;
      while (x + run < w && row[x + run] === row[x]) run++;
      runs.push({ x, y, w: run, fill });
      x += run;
    }
  }
  return { w, h, runs };
}

export interface PixelSpriteProps {
  rows: PixelGrid;
  /** цілий множник пікселя — тільки цілі, інакше сітка «попливе» */
  px?: number;
  palette?: Record<string, string>;
  opacity?: number;
}

function PixelSpriteBase({ rows, px = 3, palette, opacity }: PixelSpriteProps) {
  const pal = palette ?? PIXEL_PALETTE;
  const baked = useMemo(() => {
    if (pal === PIXEL_PALETTE) {
      const hit = CACHE.get(rows as object);
      if (hit != null) return hit;
      const made = bake(rows, pal);
      CACHE.set(rows as object, made);
      return made;
    }
    return bake(rows, pal);
  }, [rows, pal]);

  const scale = Math.max(1, Math.round(px));
  return (
    <Svg
      width={baked.w * scale}
      height={baked.h * scale}
      viewBox={`0 0 ${baked.w} ${baked.h}`}
      opacity={opacity}
    >
      {baked.runs.map((r, i) => (
        <Rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </Svg>
  );
}

export default React.memo(PixelSpriteBase);

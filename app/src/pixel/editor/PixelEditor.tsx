/**
 * Редактор доопрацювання (spec §11).
 *
 * Deliberately minimal: a grid on the whole screen, the sprite's own palette along the
 * bottom, tap to paint, eyedropper, undo. No layers, no selection. The owner does not
 * photograph the dog — he forges him.
 *
 * Rendering: 4096 `<View>`s would be 4096 shadow nodes re-laid-out on every paint. Instead
 * the grid is one `<Svg>` with *one `<Path>` per colour*, built by run-length merging each
 * row — ~16 nodes total, rebuilt only when a pixel actually changes. The grid lines are a
 * single static path memoized once.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { C, FONT, SPACING } from '../../ui/theme';
import { rgbToHex } from '../palette';
import type { RGBABuffer } from '../types';

export interface PixelDoc {
  /** One palette index per pixel. 0 is always transparent. */
  indices: Uint8Array;
  palette: string[];
  size: number;
}

/** RGBA sprite → indexed doc. Index 0 is reserved for "erased". */
export function toDoc(img: RGBABuffer): PixelDoc {
  const size = img.width;
  const indices = new Uint8Array(size * size);
  const palette: string[] = ['transparent'];
  const lookup = new Map<string, number>();
  for (let p = 0; p < size * size; p++) {
    const i = p * 4;
    if (img.data[i + 3] === 0) continue;
    const hex = rgbToHex(img.data[i], img.data[i + 1], img.data[i + 2]);
    let idx = lookup.get(hex);
    if (idx === undefined) {
      idx = palette.length;
      palette.push(hex);
      lookup.set(hex, idx);
    }
    indices[p] = idx;
  }
  return { indices, palette, size };
}

export function fromDoc(doc: PixelDoc, out: RGBABuffer): RGBABuffer {
  for (let p = 0; p < doc.indices.length; p++) {
    const i = p * 4;
    const idx = doc.indices[p];
    if (!idx) {
      out.data[i + 3] = 0;
      continue;
    }
    const hex = doc.palette[idx];
    out.data[i] = parseInt(hex.slice(1, 3), 16);
    out.data[i + 1] = parseInt(hex.slice(3, 5), 16);
    out.data[i + 2] = parseInt(hex.slice(5, 7), 16);
    out.data[i + 3] = 255;
  }
  return out;
}

/** Run-length merge every row of one colour into a single SVG path. */
function pathFor(indices: Uint8Array, size: number, idx: number): string {
  let d = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (indices[y * size + x] !== idx) { x++; continue; }
      let run = 1;
      while (x + run < size && indices[y * size + x + run] === idx) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return d;
}

export interface PixelEditorProps {
  doc: PixelDoc;
  onChange: (doc: PixelDoc) => void;
  onDone?: () => void;
  /** Rendered edge length in points. Should be an integer multiple of `doc.size`. */
  boardSize?: number;
}

type Stroke = { p: number; before: number }[];

export function PixelEditor({ doc, onChange, onDone, boardSize = 320 }: PixelEditorProps) {
  const [color, setColor] = useState(1);
  const [eyedropper, setEyedropper] = useState(false);
  const [version, setVersion] = useState(0);
  const undo = useRef<Stroke[]>([]);
  const stroke = useRef<Stroke | null>(null);

  const size = doc.size;
  const cell = boardSize / size;

  const paths = useMemo(() => {
    void version; // rebuilt only when a pixel actually changed
    return doc.palette
      .map((hex, idx) => ({ idx, hex, d: idx === 0 ? '' : pathFor(doc.indices, size, idx) }))
      .filter((p) => p.d.length > 0);
  }, [doc, size, version]);

  const grid = useMemo(() => {
    let d = '';
    for (let i = 0; i <= size; i += 8) d += `M${i} 0v${size}M0 ${i}h${size}`;
    return d;
  }, [size]);

  const touch = useCallback(
    (lx: number, ly: number, begin: boolean) => {
      const x = Math.floor(lx / cell);
      const y = Math.floor(ly / cell);
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      const p = y * size + x;

      if (eyedropper) {
        setColor(doc.indices[p]);
        setEyedropper(false);
        return;
      }
      if (doc.indices[p] === color) return;
      if (begin || !stroke.current) {
        stroke.current = [];
        undo.current.push(stroke.current);
        if (undo.current.length > 32) undo.current.shift();
      }
      stroke.current.push({ p, before: doc.indices[p] });
      doc.indices[p] = color;
      setVersion((v) => v + 1);
      onChange(doc);
    },
    [cell, color, doc, eyedropper, onChange, size]
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) =>
          touch(e.nativeEvent.locationX, e.nativeEvent.locationY, true),
        onPanResponderMove: (e) =>
          touch(e.nativeEvent.locationX, e.nativeEvent.locationY, false),
        onPanResponderRelease: () => { stroke.current = null; },
      }),
    [touch]
  );

  const doUndo = useCallback(() => {
    const last = undo.current.pop();
    if (!last) return;
    for (let i = last.length - 1; i >= 0; i--) doc.indices[last[i].p] = last[i].before;
    setVersion((v) => v + 1);
    onChange(doc);
  }, [doc, onChange]);

  return (
    <View style={s.wrap}>
      <View
        style={[s.board, { width: boardSize, height: boardSize }]}
        {...responder.panHandlers}
      >
        <Svg width={boardSize} height={boardSize} viewBox={`0 0 ${size} ${size}`}>
          <Rect x={0} y={0} width={size} height={size} fill={C.panelDeep} />
          {paths.map((p) => (
            <Path key={p.idx} d={p.d} fill={p.hex} />
          ))}
          <Path d={grid} stroke={C.frameInner} strokeWidth={0.06} fill="none" />
        </Svg>
      </View>

      <View style={s.tools}>
        <Tool label="ПІПЕТКА" active={eyedropper} onPress={() => setEyedropper((v) => !v)} />
        <Tool label="СТЕРТИ" active={color === 0} onPress={() => setColor(0)} />
        <Tool label="НАЗАД" onPress={doUndo} />
        {onDone ? <Tool label="ГОТОВО" gold onPress={onDone} /> : null}
      </View>

      <View style={s.palette}>
        {doc.palette.map((hex, idx) =>
          idx === 0 ? null : (
            <Pressable
              key={`${hex}-${idx}`}
              onPress={() => { setColor(idx); setEyedropper(false); }}
              style={[s.swatch, { backgroundColor: hex }, color === idx && s.swatchOn]}
            />
          )
        )}
      </View>
    </View>
  );
}

function Tool({
  label,
  onPress,
  active,
  gold,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  gold?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[s.tool, active && s.toolOn]}>
      <Text style={[s.toolText, gold && { color: C.gold }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },
  board: { borderWidth: 1, borderColor: C.frameOuter, backgroundColor: C.panelDeep },
  tools: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  tool: {
    borderWidth: 1,
    borderColor: C.frameInner,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: C.panel,
  },
  toolOn: { borderColor: C.gold },
  toolText: { color: C.text, fontSize: FONT.sizeSm, letterSpacing: FONT.letter },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    justifyContent: 'center',
  },
  swatch: { width: 26, height: 26, borderWidth: 1, borderColor: C.frameInner },
  swatchOn: { borderColor: C.gold, borderWidth: 2 },
});

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import PixelSprite from './PixelSprite';
import PixelText from './PixelText';
import XpBar from './XpBar';
import DogSprite from './DogSprite';
import { ICONS } from './pixelIcons';
import type { SpriteMap } from './types';
import { C, METRICS, SPACING } from '@/ui/theme';

export interface DenSceneProps {
  level: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  sprites?: SpriteMap;
  height?: number;
  /** у v1 предмети — декорації; дії живуть на дошці квестів (§12) */
  onPressDog: () => void;
}

const STRIPE = 8;

/** Фон малюється одним статичним SVG: небо, підлога, вікно, місяць. Нуль роботи щокадру. */
const Backdrop = React.memo(function Backdrop({ w, h }: { w: number; h: number }) {
  const floorTop = Math.round(h * 0.58);
  const stripes = useMemo(() => {
    const out: number[] = [];
    for (let x = 0; x < w; x += STRIPE * 2) out.push(x);
    return out;
  }, [w]);

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.skyTop} />
          <Stop offset="1" stopColor={C.skyBottom} />
        </LinearGradient>
        <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.floorTop} />
          <Stop offset="1" stopColor={C.floorBottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={floorTop} fill="url(#sky)" />
      <Rect x={0} y={floorTop} width={w} height={h - floorTop} fill="url(#floor)" />
      <Rect x={0} y={floorTop} width={w} height={1} fill={C.floorEdge} />
      {stripes.map((x) => (
        <Rect
          key={x}
          x={x}
          y={floorTop + 1}
          width={STRIPE}
          height={h - floorTop - 1}
          fill={C.floorStripe}
        />
      ))}
      <Rect
        x={w - 48}
        y={6}
        width={38}
        height={38}
        fill={C.windowGlass}
        stroke={C.windowFrame}
        strokeWidth={1}
      />
      <Circle cx={w - 29} cy={25} r={9} fill={C.moon} opacity={0.28} />
      <Circle cx={w - 29} cy={25} r={6} fill={C.moon} />
    </Svg>
  );
});

function DenSceneBase({
  level,
  xpIntoLevel,
  xpPerLevel,
  sprites,
  height = METRICS.denHeight,
  onPressDog,
}: DenSceneProps) {
  return (
    <View style={[s.den, { height }]}>
      <View style={StyleSheet.absoluteFill}>
        <Backdrop w={300} h={height} />
      </View>

      <View style={s.plate} pointerEvents="none">
        <XpBar level={level} xpIntoLevel={xpIntoLevel} xpPerLevel={xpPerLevel} />
      </View>

      <View style={[s.obj, s.bed]} pointerEvents="none">
        <PixelSprite rows={ICONS.bed} px={4} />
        <PixelText variant="tiny" align="center" style={s.tag}>
          ЛЕЖАНКА
        </PixelText>
      </View>

      <View style={[s.obj, s.bowl]} pointerEvents="none">
        <PixelSprite rows={ICONS.bowl} px={4} />
        <PixelText variant="tiny" align="center" style={s.tag}>
          МИСКА
        </PixelText>
      </View>

      <View style={[s.obj, s.shelf]} pointerEvents="none">
        <PixelSprite rows={ICONS.flask} px={3} />
        <PixelText variant="tiny" align="center" style={s.tag}>
          ЗІЛЛЯ
        </PixelText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Балу — відкрити лист персонажа"
        onPress={onPressDog}
        style={({ pressed }) => [s.dog, pressed ? s.pressed : null]}
        hitSlop={SPACING.sm}
      >
        <DogSprite pose="stand" sprites={sprites} px={METRICS.spritePx} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  den: { borderWidth: 1, borderColor: C.frameInner, overflow: 'hidden' },
  plate: { position: 'absolute', top: SPACING.sm, left: 0, right: 0, alignItems: 'center' },
  obj: { position: 'absolute', alignItems: 'center' },
  tag: { marginTop: 2 },
  bed: { left: SPACING.sm, bottom: SPACING.sm },
  bowl: { right: SPACING.md, bottom: SPACING.sm },
  shelf: { right: 62, top: 54 },
  dog: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  pressed: { opacity: 0.75 },
});

export default React.memo(DenSceneBase);

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { SpritePose } from '@/core/types';
import PixelSprite from './PixelSprite';
import { BALU_ARCHETYPE, BALU_HEAD } from './pixelIcons';
import type { SpriteMap } from './types';

export interface DogSpriteProps {
  pose: SpritePose;
  sprites?: SpriteMap;
  /** цілий множник пікселя: 64×64 × px. Дробові множники дають кашу. */
  px?: number;
  /** сторона вихідного спрайта: 64 для поз, 96 для портрета */
  source?: number;
  /** сторона рамки в dp — спрайт ніколи з неї не вилазить */
  maxSide?: number;
}

/** Найбільший цілий множник, за якого `unit × k` влазить у ліміт. Дробових множників не буває. */
function fitScale(unit: number, desired: number, cap?: number): number {
  const limit = cap != null ? Math.min(desired, cap) : desired;
  return Math.max(1, Math.floor(limit / unit));
}

/**
 * Спрайт власника, якщо він уже викуваний; інакше — архетипний силует (§11, план Б).
 * Статичне зображення, нуль роботи щокадру.
 */
function DogSpriteBase({ pose, sprites, px = 5, source, maxSide }: DogSpriteProps) {
  const asset = sprites?.[pose];
  const scale = Math.max(1, Math.round(px));
  if (asset != null) {
    const base = source ?? (pose === 'portrait' ? 96 : 64);
    // цілий множник від рідного розміру — інакше з'являється згладжування
    const side = base * fitScale(base, 24 * scale, maxSide);
    return (
      <View style={s.wrap} pointerEvents="none">
        <Image
          source={asset}
          style={{ width: side, height: side }}
          resizeMode="contain"
          fadeDuration={0}
        />
      </View>
    );
  }
  const rows = pose === 'portrait' ? BALU_HEAD : BALU_ARCHETYPE;
  // сітка ширша за висоту, тож у рамку її заганяє саме ширина
  const unit = Math.max(rows[0]?.length ?? 1, rows.length);
  return (
    <View style={s.wrap} pointerEvents="none">
      <PixelSprite rows={rows} px={Math.min(scale, fitScale(unit, unit * scale, maxSide))} />
    </View>
  );
}

const s = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'flex-end' } });

export default React.memo(DogSpriteBase);

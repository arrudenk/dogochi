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
}

/**
 * Спрайт власника, якщо він уже викуваний; інакше — архетипний силует (§11, план Б).
 * Статичне зображення, нуль роботи щокадру.
 */
function DogSpriteBase({ pose, sprites, px = 5, source }: DogSpriteProps) {
  const asset = sprites?.[pose];
  const scale = Math.max(1, Math.round(px));
  if (asset != null) {
    const base = source ?? (pose === 'portrait' ? 96 : 64);
    // цілий множник від рідного розміру — інакше з'являється згладжування
    const side = base * Math.max(1, Math.round((24 * scale) / base));
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
  return (
    <View style={s.wrap} pointerEvents="none">
      <PixelSprite rows={pose === 'portrait' ? BALU_HEAD : BALU_ARCHETYPE} px={scale} />
    </View>
  );
}

const s = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'flex-end' } });

export default React.memo(DogSpriteBase);

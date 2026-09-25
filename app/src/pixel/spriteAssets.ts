import type { ImageSourcePropType } from 'react-native';
import type { SpritePose } from '../core/types';

/**
 * The baked archetype set (spec §11 "План Б" / §13 fallback). Always present in the
 * bundle, so the app has a dog on screen before any photo is taken and after any
 * failure of the pixelizer.
 *
 * Metro resolves the `@2x` / `@4x` siblings automatically by screen density; those are
 * nearest-neighbour integer upscales baked by `scripts/gen-sprites.mjs`, because React
 * Native cannot disable image smoothing. Cost: 13 KB of assets, zero at runtime.
 */
export const SPRITES: Record<SpritePose, ImageSourcePropType> = {
  stand: require('../../assets/sprites/stand.png'),
  sit: require('../../assets/sprites/sit.png'),
  lie: require('../../assets/sprites/lie.png'),
  run: require('../../assets/sprites/run.png'),
  portrait: require('../../assets/sprites/portrait.png'),
};

/** Logical (1×) pixel dimensions. Render at an integer multiple of these or it will blur. */
export const SPRITE_SIZE: Record<SpritePose, { w: number; h: number }> = {
  stand: { w: 64, h: 64 },
  sit: { w: 64, h: 64 },
  lie: { w: 64, h: 64 },
  run: { w: 64, h: 64 },
  portrait: { w: 96, h: 96 },
};

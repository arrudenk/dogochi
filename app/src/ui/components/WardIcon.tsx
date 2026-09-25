import React from 'react';
import PixelSprite from './PixelSprite';
import { ICONS, isIconName, type IconName } from './pixelIcons';
import { METRICS } from '@/ui/theme';

export interface WardIconProps {
  /** ключ з `CareRoutine.icon`; невідомий ключ тихо падає на щит */
  name: string;
  px?: number;
  /** згас — іконка тьмяніє, а не змінює форму */
  dead?: boolean;
}

function WardIconBase({ name, px = METRICS.iconPx, dead = false }: WardIconProps) {
  const key: IconName = isIconName(name) ? name : 'shield';
  return <PixelSprite rows={ICONS[key]} px={px} opacity={dead ? 0.3 : 1} />;
}

export default React.memo(WardIconBase);

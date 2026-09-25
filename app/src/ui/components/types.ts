/** Види, які існують тільки для UI. Доменні типи живуть у core і сюди не дублюються. */

import type { ImageSourcePropType } from 'react-native';
import type { Millis, SpritePose } from '@/core/types';

/** Спрайти приходять пропом, а не імпортом, — екрани лишаються презентаційними. */
export type SpriteMap = Partial<Record<SpritePose, ImageSourcePropType>>;

export type TabKey = 'den' | 'places' | 'chronicle' | 'trophies';

export type ChronicleKind = 'event' | 'ward' | 'unlock' | 'summary';

/** Готовий до показу рядок хроніки. Групування по днях робить екран, вибірка — двигун. */
export interface ChronicleEntry {
  id: string;
  routineId?: string;
  title: string;
  detail?: string;
  occurredAt: Millis;
  xp?: number;
  /** записано минулим числом */
  backdated?: boolean;
  kind: ChronicleKind;
}

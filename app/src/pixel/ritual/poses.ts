import type { SpritePose } from '../../core/types';

/**
 * The five steps of the summoning (spec §11). Five frames, five quest steps.
 * The tips are only the three that actually change the result — a longer list gets
 * skipped wholesale.
 */
export interface RitualStepSpec {
  pose: SpritePose;
  title: string;
  /** Silhouette hint of the wanted pose. */
  hint: string;
  size: number;
}

export const RITUAL_TIPS = [
  'ДЕННЕ СВІТЛО',
  'ПРОФІЛЬ ЗБОКУ',
  'ПРОСТИЙ ФОН',
] as const;

export const RITUAL_STEPS: RitualStepSpec[] = [
  { pose: 'stand', title: 'СТОЇТЬ', hint: 'Весь силует збоку, лапи видно', size: 64 },
  { pose: 'sit', title: 'СИДИТЬ', hint: 'Збоку, голова піднята', size: 64 },
  { pose: 'lie', title: 'ЛЕЖИТЬ', hint: 'Збоку, на рівній підлозі', size: 64 },
  { pose: 'run', title: 'БІЖИТЬ', hint: 'Збоку, у русі — розмиття не страшне', size: 64 },
  { pose: 'portrait', title: 'ПОРТРЕТ', hint: 'Голова й груди, профіль', size: 96 },
];

export const POSE_SIZE: Record<SpritePose, number> = {
  stand: 64,
  sit: 64,
  lie: 64,
  run: 64,
  portrait: 96,
};

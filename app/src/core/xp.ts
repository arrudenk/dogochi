// 150 XP на рівень, стеля 999. Рівень математично не може впасти — сума невідʼємних доданків.

import { MAX_LEVEL, XP_PER_LEVEL } from './catalog';
import type { CareEvent, CareRoutine, Millis } from './types';

export { MAX_LEVEL, XP_PER_LEVEL };

export interface LevelInfo {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpPerLevel: number;
}

export function totalXpOf(routines: CareRoutine[], events: CareEvent[], now: Millis): number {
  const weight = new Map<string, number>();
  for (const r of routines) weight.set(r.id, Math.max(0, r.xp));
  let sum = 0;
  for (const e of events) {
    if (e.occurredAt > now) continue;
    sum += weight.get(e.routineId) ?? 0;
  }
  return sum;
}

export function levelFor(totalXp: number): LevelInfo {
  const raw = Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1;
  const level = Math.min(MAX_LEVEL, raw);
  const xpIntoLevel = level === MAX_LEVEL ? XP_PER_LEVEL : Math.max(0, totalXp) % XP_PER_LEVEL;
  return { totalXp, level, xpIntoLevel, xpPerLevel: XP_PER_LEVEL };
}

export function computeXp(routines: CareRoutine[], events: CareEvent[], now: Millis): LevelInfo {
  return levelFor(totalXpOf(routines, events, now));
}

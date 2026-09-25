// Трофеї — запити до журналу, тому працюють ретроспективно: доданий сьогодні відкривається одразу, якщо умова вже виконана.

import type {
  AchievementView,
  CareEvent,
  CareRoutine,
  Dog,
  Millis,
  Place,
  UnlockedAchievement,
} from './types';
import { addDays, addYears, diffDays, startOfDay } from './time';

export interface AchievementContext {
  dog: Dog;
  routines: CareRoutine[];
  events: CareEvent[];
  places: Place[];
  appStart: Millis;
  now: Millis;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** 0..1 */
  progress: (ctx: AchievementContext) => number;
  label: (ctx: AchievementContext) => string;
}

function countOf(events: CareEvent[], routineId: string, now: Millis): number {
  let n = 0;
  for (const e of events) if (e.routineId === routineId && e.occurredAt <= now) n += 1;
  return n;
}

function ratio(n: number, target: number): number {
  return Math.max(0, Math.min(1, n / target));
}

/** Найдовший безперервний відрізок днів, укритий хоч одним протипаразитарним оберегом. */
export function longestWardStreakDays(routines: CareRoutine[], events: CareEvent[], now: Millis): number {
  const spans: Array<[Millis, Millis]> = [];
  const today = startOfDay(now);
  for (const r of routines) {
    if (r.kind !== 'ward') continue;
    for (const e of events) {
      if (e.routineId !== r.id || e.occurredAt > now) continue;
      const s = startOfDay(e.occurredAt);
      const end = Math.min(today, addDays(s, r.wardDays ?? 0));
      if (end >= s) spans.push([s, end]);
    }
  }
  if (spans.length === 0) return 0;
  spans.sort((a, b) => a[0] - b[0]);
  let best = 0;
  let curStart = spans[0][0];
  let curEnd = spans[0][1];
  for (let i = 1; i < spans.length; i += 1) {
    const [s, e] = spans[i];
    if (diffDays(curEnd, s) <= 1) {
      if (e > curEnd) curEnd = e;
    } else {
      best = Math.max(best, diffDays(curStart, curEnd) + 1);
      curStart = s;
      curEnd = e;
    }
  }
  return Math.max(best, diffDays(curStart, curEnd) + 1);
}

/** Найдовша серія зважувань підряд, де вага в цільовому діапазоні. */
export function longestInRangeWeighStreak(dog: Dog, events: CareEvent[], now: Millis): number {
  const weighs = events
    .filter((e) => e.routineId === 'weigh' && e.occurredAt <= now && e.weightKg !== undefined)
    .sort((a, b) => a.occurredAt - b.occurredAt);
  let best = 0;
  let cur = 0;
  for (const w of weighs) {
    const kg = w.weightKg as number;
    if (kg >= dog.targetWeightMin && kg <= dog.targetWeightMax) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

/** Скільки днів народження минуло, поки журнал уже жив. */
export function birthdaysInApp(dog: Dog, appStart: Millis, now: Millis, hasEvents: boolean): number {
  if (!hasEvents) return 0;
  let n = 0;
  for (let year = 1; year <= 40; year += 1) {
    const b = startOfDay(addYears(dog.bornAt, year));
    if (b > now) break;
    if (b >= startOfDay(appStart)) n += 1;
  }
  return n;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'night-courier',
    title: 'Нічний гонець',
    description: '50 вільних забігів',
    progress: (c) => ratio(countOf(c.events, 'run', c.now), 50),
    label: (c) => `${Math.min(50, countOf(c.events, 'run', c.now))} з 50 забігів`,
  },
  {
    id: 'unbroken-shield',
    title: 'Незламний щит',
    description: 'Рік без жодного дня без протипаразитарного оберега',
    progress: (c) => ratio(longestWardStreakDays(c.routines, c.events, c.now), 365),
    label: (c) => `${Math.min(365, longestWardStreakDays(c.routines, c.events, c.now))} з 365 днів під оберегом`,
  },
  {
    id: 'cartographer',
    title: 'Картограф',
    description: '10 різних місць',
    progress: (c) => ratio(c.places.length, 10),
    label: (c) => `${Math.min(10, c.places.length)} з 10 місць`,
  },
  {
    id: 'deep-forest',
    title: 'Глибокий ліс',
    description: '12 походів у Глибокий Ліс',
    progress: (c) => ratio(countOf(c.events, 'forest', c.now), 12),
    label: (c) => `${Math.min(12, countOf(c.events, 'forest', c.now))} з 12 походів`,
  },
  {
    id: 'keen-eye',
    title: 'Пильне око',
    description: '20 оглядів на кліщів після походу',
    progress: (c) => ratio(countOf(c.events, 'tickcheck', c.now), 20),
    label: (c) => `${Math.min(20, countOf(c.events, 'tickcheck', c.now))} з 20 оглядів`,
  },
  {
    id: 'steady',
    title: 'Стабільний',
    description: '12 зважувань у цільовому діапазоні підряд',
    progress: (c) => ratio(longestInRangeWeighStreak(c.dog, c.events, c.now), 12),
    label: (c) => `${Math.min(12, longestInRangeWeighStreak(c.dog, c.events, c.now))} з 12 зважувань підряд`,
  },
  {
    id: 'fifth-year',
    title: 'Пʼятий рік',
    description: 'День народження, зустрінутий у світі',
    progress: (c) => (birthdaysInApp(c.dog, c.appStart, c.now, c.events.length > 0) > 0 ? 1 : 0),
    label: (c) =>
      birthdaysInApp(c.dog, c.appStart, c.now, c.events.length > 0) > 0
        ? 'День народження зустрінуто'
        : 'День народження ще попереду',
  },
];

export interface AchievementResult {
  views: AchievementView[];
  newlyUnlocked: string[];
}

export function computeAchievements(ctx: AchievementContext, unlocked: UnlockedAchievement[]): AchievementResult {
  const byId = new Map(unlocked.map((u) => [u.id, u]));
  const views: AchievementView[] = [];
  const newlyUnlocked: string[] = [];
  for (const def of ACHIEVEMENTS) {
    const progress = Math.max(0, Math.min(1, def.progress(ctx)));
    const satisfied = progress >= 1;
    const prev = byId.get(def.id);
    if (satisfied && !prev) newlyUnlocked.push(def.id);
    views.push({
      id: def.id,
      title: def.title,
      description: def.description,
      unlocked: satisfied || prev !== undefined,
      unlockedAt: prev?.unlockedAt,
      progress,
      progressLabel: def.label(ctx),
    });
  }
  return { views, newlyUnlocked };
}

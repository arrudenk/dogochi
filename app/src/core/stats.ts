// Ковзні вікна, спека §8.2. Пропущене саме випадає з вікна — окрема механіка «прощення» не потрібна.

import type { CareEvent, CareRoutine, Dog, Millis, Place, QuestView, Stats } from './types';
import { addDays, dayKey, startOfDay } from './time';

export const STAMINA_WINDOW_DAYS = 14;
export const COAT_WINDOW_DAYS = 14;
export const BOND_WINDOW_DAYS = 30;
export const PLACES_WINDOW_DAYS = 90;

/** Ваги Vitality за спекою §8.2; рахуються лише ті розклади, що є і увімкнені. */
const VITALITY_WEIGHTS: Record<string, number> = {
  fleas: 20,
  worms: 20,
  healer: 15,
  vaccine: 15,
  weigh: 20,
  claws: 10,
};

function windowFrom(now: Millis, days: number): Millis {
  return addDays(startOfDay(now), -(days - 1));
}

function countIn(events: CareEvent[], routineId: string, from: Millis, now: Millis): number {
  let n = 0;
  for (const e of events) {
    if (e.routineId !== routineId) continue;
    if (e.occurredAt >= from && e.occurredAt <= now) n += 1;
  }
  return n;
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function notOverdue(quests: QuestView[], routineId: string): boolean {
  const q = quests.find((x) => x.routine.id === routineId);
  return q ? q.status !== 'overdue' && q.status !== 'expired' : false;
}

function wardActive(quests: QuestView[], routineId: string): boolean {
  const q = quests.find((x) => x.routine.id === routineId);
  return q ? q.status !== 'expired' : false;
}

export function vitality(
  routines: CareRoutine[],
  quests: QuestView[],
  weightInRange: boolean | undefined,
): number {
  let max = 0;
  let earned = 0;
  for (const r of routines) {
    const w = VITALITY_WEIGHTS[r.id];
    if (w === undefined || !r.enabled) continue;
    max += w;
    let ok: boolean;
    if (r.kind === 'ward') ok = wardActive(quests, r.id);
    else if (r.id === 'weigh') ok = notOverdue(quests, r.id) && weightInRange === true;
    else ok = notOverdue(quests, r.id);
    if (ok) earned += w;
  }
  if (max === 0) return 100; // нічого не відстежується — нічому й падати
  return clamp100((100 * earned) / max);
}

export function stamina(events: CareEvent[], now: Millis): number {
  const from = windowFrom(now, STAMINA_WINDOW_DAYS);
  const patrols = countIn(events, 'patrol', from, now);
  const runs = countIn(events, 'run', from, now);
  return clamp100(70 * Math.min(1, patrols / 42) + 30 * Math.min(1, runs / 4));
}

export function coat(events: CareEvent[], quests: QuestView[], now: Millis): number {
  const from = windowFrom(now, COAT_WINDOW_DAYS);
  const fangs = countIn(events, 'fangs', from, now);
  return clamp100(60 * Math.min(1, fangs / 6) + 40 * (notOverdue(quests, 'claws') ? 1 : 0));
}

export function bond(events: CareEvent[], places: Place[], now: Millis): number {
  const from = windowFrom(now, BOND_WINDOW_DAYS);
  const journeys = countIn(events, 'forest', from, now);
  const days = new Set<string>();
  for (const e of events) {
    if (e.occurredAt >= from && e.occurredAt <= now) days.add(dayKey(e.occurredAt));
  }
  const placesFrom = windowFrom(now, PLACES_WINDOW_DAYS);
  const freshPlaces = places.filter((p) => p.firstVisitedAt >= placesFrom && p.firstVisitedAt <= now).length;
  return clamp100(
    50 * Math.min(1, journeys / 1) +
      30 * Math.min(1, days.size / BOND_WINDOW_DAYS) +
      20 * Math.min(1, freshPlaces / 1),
  );
}

export function computeStats(args: {
  dog: Dog;
  routines: CareRoutine[];
  events: CareEvent[];
  places: Place[];
  quests: QuestView[];
  weightInRange: boolean | undefined;
  now: Millis;
}): Stats {
  const { routines, events, places, quests, weightInRange, now } = args;
  return {
    vitality: vitality(routines, quests, weightInRange),
    stamina: stamina(events, now),
    coat: coat(events, quests, now),
    bond: bond(events, places, now),
  };
}

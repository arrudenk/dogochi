// Оберіг = [дата події, дата події + тривалість]. Захист не накопичується — нова доза рахується від нової дати.

import type { CareEvent, CareRoutine, Millis, Ward } from './types';
import { addDays, diffDays, startOfDay } from './time';

export interface WardHorizon {
  startedAt: Millis;
  /** Останній день, коли оберіг ще діє (початок доби). */
  expiresAt: Millis;
  active: boolean;
  daysLeft: number;
}

/** Найсвіжіша подія розкладу, що вже відбулась. */
export function lastEventFor(events: CareEvent[], routineId: string, now: Millis): CareEvent | undefined {
  let best: CareEvent | undefined;
  for (const e of events) {
    if (e.routineId !== routineId) continue;
    if (e.occurredAt > now) continue;
    if (!best || e.occurredAt > best.occurredAt) best = e;
  }
  return best;
}

export function wardHorizon(routine: CareRoutine, events: CareEvent[], now: Millis): WardHorizon | undefined {
  if (routine.kind !== 'ward') return undefined;
  const last = lastEventFor(events, routine.id, now);
  if (!last) return undefined;
  const startedAt = startOfDay(last.occurredAt);
  const expiresAt = addDays(startedAt, routine.wardDays ?? 0);
  const daysLeft = diffDays(now, expiresAt);
  return { startedAt, expiresAt, active: daysLeft >= 0, daysLeft: Math.max(0, daysLeft) };
}

export function computeWards(routines: CareRoutine[], events: CareEvent[], now: Millis): Ward[] {
  const out: Ward[] = [];
  for (const r of routines) {
    if (r.kind !== 'ward' || !r.enabled) continue;
    const h = wardHorizon(r, events, now);
    if (!h) continue;
    out.push({
      routineId: r.id,
      title: r.title,
      icon: r.icon,
      startedAt: h.startedAt,
      expiresAt: h.expiresAt,
      active: h.active,
      daysLeft: h.daysLeft,
    });
  }
  return out.sort((a, b) => a.expiresAt - b.expiresAt);
}

/** Чи діє хоч один протипаразитарний оберіг у вказану добу. */
export function anyWardActiveOn(routines: CareRoutine[], events: CareEvent[], day: Millis): boolean {
  for (const r of routines) {
    if (r.kind !== 'ward') continue;
    const h = wardHorizon(r, events, day);
    if (h && h.active) return true;
  }
  return false;
}

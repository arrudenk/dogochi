// Пʼять типів розкладів поводяться протилежно — спека §6. Зведення їх в одну сутність дало б або токсичну апку, або беззубу.

import type { CareEvent, CareRoutine, Millis, QuestStatus, QuestView } from './types';
import {
  addHours,
  addMonths,
  dayKey,
  diffDays,
  monthStart,
  nextMonthStart,
  nextWeekStart,
  startOfDay,
  weekStart,
} from './time';
import { lastEventFor, wardHorizon } from './wards';

/** Оберіг вважається «скоро згасне» за стільки днів. */
export const WARD_DUE_SOON_DAYS = 7;
/** Обовʼязок підсвічується за стільки днів до терміну — збігається з першою стадією герольда. */
export const DUTY_DUE_SOON_DAYS = 30;

/** Початок історії: найраніша подія, інакше — зараз. Від неї відлічуються ніколи не виконані обовʼязки. */
export function appStartOf(events: CareEvent[], now: Millis): Millis {
  let min: Millis | undefined;
  for (const e of events) {
    if (e.occurredAt > now) continue;
    if (min === undefined || e.occurredAt < min) min = e.occurredAt;
  }
  return startOfDay(min ?? now);
}

function eventsFor(events: CareEvent[], routineId: string, now: Millis): CareEvent[] {
  return events.filter((e) => e.routineId === routineId && e.occurredAt <= now);
}

export function quotaPeriodBounds(routine: CareRoutine, now: Millis): { start: Millis; endExclusive: Millis } {
  if (routine.quotaPeriod === 'month') {
    return { start: monthStart(now), endExclusive: nextMonthStart(now) };
  }
  return { start: weekStart(now), endExclusive: nextWeekStart(now) };
}

function slottedView(routine: CareRoutine, events: CareEvent[], now: Millis): QuestView {
  const key = dayKey(now);
  const mine = eventsFor(events, routine.id, now);
  const doneToday = mine.filter((e) => dayKey(e.occurredAt) === key).length;
  const perDay = routine.perDay ?? 1;
  const last = mine.reduce<Millis | undefined>((a, e) => (a === undefined || e.occurredAt > a ? e.occurredAt : a), undefined);
  return {
    routine,
    status: doneToday >= perDay ? 'done' : 'idle',
    doneToday,
    periodTarget: perDay,
    lastDoneAt: last,
    xp: routine.xp,
  };
}

function quotaView(routine: CareRoutine, events: CareEvent[], now: Millis): QuestView {
  const { start, endExclusive } = quotaPeriodBounds(routine, now);
  const mine = eventsFor(events, routine.id, now);
  const periodDone = mine.filter((e) => e.occurredAt >= start && e.occurredAt < endExclusive).length;
  const target = routine.quotaCount ?? 1;
  const last = mine.reduce<Millis | undefined>((a, e) => (a === undefined || e.occurredAt > a ? e.occurredAt : a), undefined);
  return {
    routine,
    status: periodDone >= target ? 'done' : 'idle',
    periodDone,
    periodTarget: target,
    periodEndsAt: endExclusive,
    lastDoneAt: last,
    xp: routine.xp,
  };
}

function wardView(routine: CareRoutine, events: CareEvent[], now: Millis): QuestView {
  const h = wardHorizon(routine, events, now);
  if (!h) {
    return { routine, status: 'expired', xp: routine.xp };
  }
  const daysLeft = diffDays(now, h.expiresAt);
  let status: QuestStatus;
  if (daysLeft < 0) status = 'expired';
  else if (daysLeft <= WARD_DUE_SOON_DAYS) status = 'dueSoon';
  else status = 'done';
  return {
    routine,
    status,
    dueAt: h.expiresAt,
    wardExpiresAt: h.expiresAt,
    wardDaysLeft: Math.max(0, daysLeft),
    overdueDays: daysLeft < 0 ? -daysLeft : 0,
    lastDoneAt: h.startedAt,
    xp: routine.xp,
  };
}

function dutyView(routine: CareRoutine, events: CareEvent[], now: Millis, appStart: Millis): QuestView {
  const last = lastEventFor(events, routine.id, now);
  const dueAt = last ? addMonths(startOfDay(last.occurredAt), routine.everyMonths ?? 1) : appStart;
  const daysUntil = diffDays(now, dueAt);
  let status: QuestStatus;
  if (daysUntil <= 0) status = 'overdue';
  else if (daysUntil <= DUTY_DUE_SOON_DAYS) status = 'dueSoon';
  else status = 'done';
  return {
    routine,
    status,
    dueAt,
    overdueDays: daysUntil < 0 ? -daysUntil : 0,
    lastDoneAt: last?.occurredAt,
    xp: routine.xp,
  };
}

export function buildQuests(routines: CareRoutine[], events: CareEvent[], now: Millis, appStart: Millis): QuestView[] {
  const out: QuestView[] = [];
  for (const r of routines) {
    if (!r.enabled || r.kind === 'spawned') continue;
    if (r.kind === 'slotted') out.push(slottedView(r, events, now));
    else if (r.kind === 'quota') out.push(quotaView(r, events, now));
    else if (r.kind === 'ward') out.push(wardView(r, events, now));
    else out.push(dutyView(r, events, now, appStart));
  }
  return out;
}

/** Вікно породженого квесту, якщо воно зараз живе: тільки найсвіжіша батьківська подія породжує. */
export function spawnWindow(
  routine: CareRoutine,
  events: CareEvent[],
  now: Millis,
): { start: Millis; end: Millis } | undefined {
  if (routine.kind !== 'spawned' || !routine.spawnedBy) return undefined;
  const parent = lastEventFor(events, routine.spawnedBy, now);
  if (!parent) return undefined;
  const end = addHours(parent.occurredAt, routine.spawnWindowHours ?? 24);
  if (now > end) return undefined;
  return { start: parent.occurredAt, end };
}

export function buildSpawned(routines: CareRoutine[], events: CareEvent[], now: Millis): QuestView[] {
  const out: QuestView[] = [];
  for (const r of routines) {
    if (!r.enabled || r.kind !== 'spawned') continue;
    const w = spawnWindow(r, events, now);
    if (!w) continue;
    const done = events.find((e) => e.routineId === r.id && e.occurredAt >= w.start && e.occurredAt <= w.end);
    out.push({
      routine: r,
      status: done ? 'done' : 'dueSoon',
      spawnExpiresAt: w.end,
      lastDoneAt: done?.occurredAt,
      xp: r.xp,
    });
  }
  return out;
}

export type LogRejection = 'future' | 'slotFull' | 'unknownRoutine' | 'disabled';

/** Дві заборони зі спеки §5 і §13: майбутня дата й перебір слотів за добу. */
export function canLogEvent(
  routines: CareRoutine[],
  events: CareEvent[],
  routineId: string,
  occurredAt: Millis,
  now: Millis,
): { ok: true } | { ok: false; reason: LogRejection } {
  const routine = routines.find((r) => r.id === routineId);
  if (!routine) return { ok: false, reason: 'unknownRoutine' };
  if (!routine.enabled) return { ok: false, reason: 'disabled' };
  if (occurredAt > now) return { ok: false, reason: 'future' };
  if (routine.kind === 'slotted') {
    const key = dayKey(occurredAt);
    const sameDayCount = events.filter((e) => e.routineId === routineId && dayKey(e.occurredAt) === key).length;
    if (sameDayCount >= (routine.perDay ?? 1)) return { ok: false, reason: 'slotFull' };
  }
  return { ok: true };
}

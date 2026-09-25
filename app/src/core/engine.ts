// State = compute(events, routines, dog, now). Єдина точка входу; нічого не зберігається, все виводиться.

import type { CareEvent, ComputedState, EngineInput, Millis } from './types';
import { diffDays, monthsBetween, startOfDay } from './time';
import { appStartOf, buildQuests, buildSpawned } from './quests';
import { computeWards } from './wards';
import { computeStats } from './stats';
import { computeXp } from './xp';
import { computeAchievements } from './achievements';

function pluralUk(n: number, forms: [string, string, string]): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  const mod10 = n % 10;
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function ageLabel(bornAt: Millis, now: Millis): string {
  const months = monthsBetween(bornAt, now);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${pluralUk(years, ['рік', 'роки', 'років'])}`);
  if (rest > 0 || years === 0) parts.push(`${rest} ${pluralUk(rest, ['місяць', 'місяці', 'місяців'])}`);
  return parts.join(' ');
}

function sortedPastEvents(events: CareEvent[], now: Millis): CareEvent[] {
  return events
    .filter((e) => e.occurredAt <= now)
    .slice()
    .sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function compute(input: EngineInput): ComputedState {
  const { dog, routines, places, unlocked, now } = input;
  const events = sortedPastEvents(input.events, now);
  const appStart = appStartOf(events, now);

  const quests = buildQuests(routines, events, now, appStart);
  const spawned = buildSpawned(routines, events, now);
  const wards = computeWards(routines, events, now);

  let lastWeight: CareEvent | undefined;
  for (const e of events) if (e.weightKg !== undefined) lastWeight = e;
  const weightInRange =
    lastWeight === undefined
      ? undefined
      : (lastWeight.weightKg as number) >= dog.targetWeightMin &&
        (lastWeight.weightKg as number) <= dog.targetWeightMax;

  const stats = computeStats({ dog, routines, events, places, quests, weightInRange, now });
  const xp = computeXp(routines, events, now);
  const { views, newlyUnlocked } = computeAchievements(
    { dog, routines, events, places, appStart, now },
    unlocked,
  );

  const journeyIds = new Set(routines.filter((r) => r.group === 'journey' && r.kind !== 'spawned').map((r) => r.id));
  const journeysCount = events.filter((e) => journeyIds.has(e.routineId)).length;
  const last = events.length > 0 ? events[events.length - 1] : undefined;

  return {
    now,
    totalXp: xp.totalXp,
    level: xp.level,
    xpIntoLevel: xp.xpIntoLevel,
    xpPerLevel: xp.xpPerLevel,
    stats,
    wards,
    quests,
    spawned,
    achievements: views,
    newlyUnlocked,
    ageLabel: ageLabel(dog.bornAt, now),
    lastWeightKg: lastWeight?.weightKg,
    lastWeightAt: lastWeight?.occurredAt,
    weightInRange,
    placesCount: places.length,
    journeysCount,
    daysSinceLastEvent: last ? Math.max(0, diffDays(last.occurredAt, now)) : undefined,
  };
}

export { pluralUk };

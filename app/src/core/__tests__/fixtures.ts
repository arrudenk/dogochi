import type { CareEvent, EngineInput, Millis, Place } from '../types';
import { BALU, DEFAULT_ROUTINES } from '../catalog';
import { addDays, addHours, addMonths, startOfDay } from '../time';

/** 1 січня 2025, 09:00 локального часу. Фіксована точка — двигун ніколи не питає системний час. */
export const YEAR_START = new Date(2025, 0, 1, 9, 0, 0, 0).getTime();

export function makeLog() {
  let seq = 0;
  const events: CareEvent[] = [];
  const push = (routineId: string, occurredAt: Millis, extra: Partial<CareEvent> = {}) => {
    seq += 1;
    events.push({
      id: `e${seq}`,
      routineId,
      occurredAt,
      recordedAt: occurredAt,
      source: 'manual',
      ...extra,
    });
  };
  return { events, push };
}

function atHour(start: Millis, day: number, hour: number): Millis {
  return startOfDay(addDays(start, day)) + hour * 3_600_000;
}

/** Щоденні тапи цілий рік і більше нічого — стеля сенсу зі спеки §8.3. */
export function dailyOnlyYear(start: Millis = YEAR_START): CareEvent[] {
  const { events, push } = makeLog();
  for (let d = 0; d < 365; d += 1) {
    push('feed', atHour(start, d, 8));
    push('feed', atHour(start, d, 19));
    push('patrol', atHour(start, d, 7));
    push('patrol', atHour(start, d, 13));
    push('patrol', atHour(start, d, 21));
  }
  for (let w = 0; w < 52; w += 1) {
    push('run', atHour(start, w * 7 + 1, 10));
    push('run', atHour(start, w * 7 + 4, 10));
    push('fangs', atHour(start, w * 7, 22));
    push('fangs', atHour(start, w * 7 + 2, 22));
    push('fangs', atHour(start, w * 7 + 5, 22));
  }
  return events;
}

/** Ідеальний рік за таблицею спеки §7: ті самі кількості подій, з яких виведено ≈147 000 XP. */
export function perfectYear(start: Millis = YEAR_START): CareEvent[] {
  const events = dailyOnlyYear(start);
  const { events: rare, push } = makeLog();
  for (let i = 0; i < 12; i += 1) push('fleas', atHour(start, i * 30, 11));
  for (let i = 0; i < 4; i += 1) push('worms', atHour(start, i * 90, 12));
  push('healer', atHour(start, 0, 14));
  push('healer', atHour(start, 182, 14));
  push('vaccine', atHour(start, 0, 15));
  for (let m = 0; m < 12; m += 1) {
    const day = addMonths(start, m);
    push('weigh', startOfDay(day) + 9 * 3_600_000, { weightKg: 11.5 });
    push('claws', startOfDay(day) + 16 * 3_600_000);
    push('forest', startOfDay(day) + 10 * 3_600_000, { placeId: `place-${m % 10}` });
    push('tickcheck', startOfDay(day) + 12 * 3_600_000);
  }
  return events.concat(rare.map((e, i) => ({ ...e, id: `r${i}` })));
}

export function places(n: number, start: Millis = YEAR_START): Place[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `place-${i}`,
    name: `Місце ${i}`,
    firstVisitedAt: addDays(start, i * 7),
  }));
}

export function input(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    dog: BALU,
    routines: DEFAULT_ROUTINES,
    events: [],
    places: [],
    unlocked: [],
    now: addHours(YEAR_START, 1),
    ...overrides,
  };
}

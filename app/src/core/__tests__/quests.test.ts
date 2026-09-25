import { compute } from '../engine';
import { canLogEvent } from '../quests';
import { DEFAULT_ROUTINES } from '../catalog';
import { addDays, addHours, startOfDay } from '../time';
import { input, makeLog } from './fixtures';

const MON = new Date(2025, 7, 4, 9, 0, 0, 0).getTime(); // понеділок
const questOf = (state: ReturnType<typeof compute>, id: string) => state.quests.find((q) => q.routine.id === id)!;

describe('слотовий добовий', () => {
  test('пропущене годування не зʼявляється завтра як борг', () => {
    const { events, push } = makeLog();
    push('feed', MON); // одне з двох
    const tomorrow = addDays(MON, 1);
    const q = questOf(compute(input({ events, now: tomorrow })), 'feed');
    expect(q.doneToday).toBe(0);
    expect(q.periodTarget).toBe(2);
    expect(q.status).toBe('idle');
    expect(q.overdueDays).toBeUndefined();
  });

  test('обидва слоти закриті — статус done', () => {
    const { events, push } = makeLog();
    push('feed', MON);
    push('feed', addHours(MON, 8));
    expect(questOf(compute(input({ events, now: addHours(MON, 9) })), 'feed').status).toBe('done');
  });

  test('слотовий не пускає більше N за добу', () => {
    const { events, push } = makeLog();
    push('feed', MON);
    push('feed', addHours(MON, 8));
    const now = addHours(MON, 9);
    expect(canLogEvent(DEFAULT_ROUTINES, events, 'feed', now, now)).toEqual({ ok: false, reason: 'slotFull' });
    expect(canLogEvent(DEFAULT_ROUTINES, events, 'feed', addDays(now, 1), addDays(now, 1)).ok).toBe(true);
  });

  test('подія в майбутньому відхиляється', () => {
    expect(canLogEvent(DEFAULT_ROUTINES, [], 'feed', addDays(MON, 1), MON)).toEqual({ ok: false, reason: 'future' });
  });
});

describe('квота', () => {
  test('тиждень починається з понеділка; неділя ще в тому ж періоді', () => {
    const { events, push } = makeLog();
    push('run', MON);
    push('run', addDays(MON, 6)); // неділя
    const q = questOf(compute(input({ events, now: addDays(MON, 6) })), 'run');
    expect(q.periodDone).toBe(2);
    expect(q.status).toBe('done');
    expect(q.periodEndsAt).toBe(startOfDay(addDays(MON, 7)));
  });

  test('новий тиждень обнуляє лічильник і не створює боргу', () => {
    const { events, push } = makeLog();
    push('run', MON);
    push('run', addDays(MON, 1));
    const q = questOf(compute(input({ events, now: addDays(MON, 7) })), 'run');
    expect(q.periodDone).toBe(0);
    expect(q.status).toBe('idle');
    expect(q.overdueDays).toBeUndefined();
  });
});

describe('обовʼязок', () => {
  test('борг накопичується від останньої події', () => {
    const { events, push } = makeLog();
    push('claws', MON); // раз на місяць
    const q = questOf(compute(input({ events, now: addDays(MON, 40) })), 'claws');
    expect(q.status).toBe('overdue');
    expect(q.overdueDays).toBe(9);
  });

  test('ніколи не виконаний обовʼязок прострочений від початку журналу', () => {
    const { events, push } = makeLog();
    push('feed', MON);
    const q = questOf(compute(input({ events, now: addDays(MON, 10) })), 'vaccine');
    expect(q.status).toBe('overdue');
    expect(q.overdueDays).toBe(10);
  });
});

describe('породжений квест', () => {
  test('похід породжує огляд на кліщів на 24 години', () => {
    const { events, push } = makeLog();
    push('forest', MON);
    const live = compute(input({ events, now: addHours(MON, 5) })).spawned;
    expect(live).toHaveLength(1);
    expect(live[0].routine.id).toBe('tickcheck');
    expect(live[0].status).toBe('dueSoon');
    expect(live[0].spawnExpiresAt).toBe(addHours(MON, 24));

    expect(compute(input({ events, now: addHours(MON, 25) })).spawned).toHaveLength(0);
  });

  test('виконаний огляд закриває породжений квест, не породжуючи борг', () => {
    const { events, push } = makeLog();
    push('forest', MON);
    push('tickcheck', addHours(MON, 2));
    const live = compute(input({ events, now: addHours(MON, 5) })).spawned;
    expect(live[0].status).toBe('done');
  });

  test('породжує лише найсвіжіший похід', () => {
    const { events, push } = makeLog();
    push('forest', MON);
    push('forest', addDays(MON, 10));
    const live = compute(input({ events, now: addDays(MON, 10) })).spawned;
    expect(live).toHaveLength(1);
    expect(live[0].spawnExpiresAt).toBe(addHours(addDays(MON, 10), 24));
  });
});

describe('дописування минулим числом', () => {
  test('вчорашня подія, записана сьогодні, дає той самий стан', () => {
    const yesterday = addDays(MON, -1);
    const today = MON;
    const asRecordedYesterday = compute(
      input({
        events: [{ id: 'a', routineId: 'fleas', occurredAt: yesterday, recordedAt: yesterday, source: 'manual' }],
        now: today,
      }),
    );
    const asBackdatedToday = compute(
      input({
        events: [{ id: 'a', routineId: 'fleas', occurredAt: yesterday, recordedAt: today, source: 'manual' }],
        now: today,
      }),
    );
    expect(asBackdatedToday).toEqual(asRecordedYesterday);
  });

  test('подія з майбутнім occurredAt не впливає на стан', () => {
    const state = compute(
      input({
        events: [{ id: 'f', routineId: 'vaccine', occurredAt: addDays(MON, 5), recordedAt: MON, source: 'manual' }],
        now: MON,
      }),
    );
    expect(state.totalXp).toBe(0);
  });
});

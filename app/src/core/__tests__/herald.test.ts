import { compute } from '../engine';
import { heraldQueue } from '../herald';
import type { HeraldShown } from '../types';
import { addDays } from '../time';
import { input, makeLog } from './fixtures';

const START = new Date(2025, 7, 4, 9, 0, 0, 0).getTime();

function queueAt(now: number, shown: HeraldShown[] = []) {
  const { events, push } = makeLog();
  push('fleas', START);
  push('feed', START);
  return heraldQueue(compute(input({ events, now })), shown);
}

describe('герольд', () => {
  test('слотовий ніколи не піднімає герольда', () => {
    const q = queueAt(addDays(START, 23));
    expect(q.every((i) => i.routineId !== 'feed')).toBe(true);
  });

  test('стадія −7 днів для оберега, з голосом світу', () => {
    const item = queueAt(addDays(START, 23)).find((i) => i.routineId === 'fleas')!;
    expect(item.stage).toBe('ward:pre7');
    expect(item.body).toBe('Оберіг «Зілля від кровопивць» згасне через сім днів.');
  });

  test('стадія −3 дні', () => {
    expect(queueAt(addDays(START, 27)).find((i) => i.routineId === 'fleas')!.stage).toBe('ward:pre3');
  });

  test('день згасання, +1 день, далі кожні 7', () => {
    expect(queueAt(addDays(START, 30)).find((i) => i.routineId === 'fleas')!.stage).toBe('ward:day0');
    expect(queueAt(addDays(START, 31)).find((i) => i.routineId === 'fleas')!.stage).toBe('ward:over:1');
    expect(queueAt(addDays(START, 37)).find((i) => i.routineId === 'fleas')!.stage).toBe('ward:over:7');
    expect(queueAt(addDays(START, 44)).find((i) => i.routineId === 'fleas')!.stage).toBe('ward:over:14');
  });

  test('та сама стадія двічі — другого разу тиша', () => {
    const now = addDays(START, 23);
    const first = queueAt(now).find((i) => i.routineId === 'fleas')!;
    const shown: HeraldShown[] = [{ routineId: first.routineId, stage: first.stage, shownAt: now }];
    expect(queueAt(now, shown).find((i) => i.routineId === 'fleas')).toBeUndefined();
  });

  test('«нагадай за три дні» мовчить про цей розклад до строку', () => {
    const now = addDays(START, 23);
    const shown: HeraldShown[] = [
      { routineId: 'fleas', stage: 'ward:pre7', shownAt: now, snoozedUntil: addDays(now, 3) },
    ];
    expect(queueAt(addDays(START, 24), shown).find((i) => i.routineId === 'fleas')).toBeUndefined();
    expect(queueAt(addDays(START, 27), shown).find((i) => i.routineId === 'fleas')!.stage).toBe('ward:pre3');
  });

  test('прострочена стадія відкривається знову, коли снуз вийшов', () => {
    const now = addDays(START, 23); // ward:pre7, вікно ще триває
    const shown: HeraldShown[] = [
      { routineId: 'fleas', stage: 'ward:pre7', shownAt: now, snoozedUntil: addDays(now, 3) },
    ];
    const later = addDays(START, 26); // стадія та сама, снуз минув
    const item = queueAt(later, shown).find((i) => i.routineId === 'fleas');
    expect(item?.stage).toBe('ward:pre7');
  });

  test('три різні рішення, ніколи одне «ОК»', () => {
    const item = queueAt(addDays(START, 31)).find((i) => i.routineId === 'fleas')!;
    expect(item.actions).toHaveLength(3);
    expect(new Set(item.actions.map((a) => a.kind)).size).toBe(3);
    expect(item.actions.map((a) => a.kind)).toContain('markDone');
    expect(item.actions.map((a) => a.kind)).toContain('snooze3d');
  });

  test('обовʼязок з календарною страховкою пропонує календар', () => {
    const { events, push } = makeLog();
    push('healer', START);
    const q = heraldQueue(compute(input({ events, now: addDays(START, 200) })), []);
    const healer = q.find((i) => i.routineId === 'healer')!;
    expect(healer.stage).toBe('duty:over:14');
    expect(healer.actions.map((a) => a.kind)).toContain('calendar');
  });

  test('стадії обовʼязку: −30, −14, −3, день, далі кожні 14', () => {
    const { events, push } = makeLog();
    push('claws', START); // раз на місяць
    const stage = (d: number) =>
      heraldQueue(compute(input({ events, now: addDays(START, d) })), []).find((i) => i.routineId === 'claws')?.stage;
    expect(stage(5)).toBe('duty:pre30');
    expect(stage(25)).toBe('duty:pre14');
    expect(stage(29)).toBe('duty:pre3');
    expect(stage(31)).toBe('duty:day0');
    expect(stage(45)).toBe('duty:over:14');
  });

  test('квота — один раз за період, за 5 днів до кінця, якщо нуль', () => {
    const { events, push } = makeLog();
    push('feed', START);
    const wed = addDays(START, 2); // середа, до кінця тижня 5 днів
    const q = heraldQueue(compute(input({ events, now: wed })), []);
    const run = q.find((i) => i.routineId === 'run')!;
    expect(run.stage).toBe('quota:end5:2025-08-11');
    expect(run.body).toContain('0 з 2');
    // один забіг у періоді — герольд мовчить
    push('run', START);
    expect(heraldQueue(compute(input({ events, now: wed })), []).find((i) => i.routineId === 'run')).toBeUndefined();
  });

  test('квота: вікно рівно 5 днів до кінця періоду', () => {
    const { events, push } = makeLog();
    push('feed', START);
    const stage = (d: number) =>
      heraldQueue(compute(input({ events, now: addDays(START, d) })), []).find((i) => i.routineId === 'run')?.stage;
    expect(stage(1)).toBeUndefined(); // вівторок — до кінця тижня 6 днів
    expect(stage(2)).toBe('quota:end5:2025-08-11'); // середа — рівно 5
    expect(stage(6)).toBe('quota:end5:2025-08-11'); // неділя — останній день
  });

  test('невідомий обряд питає, а не звинувачує', () => {
    const q = heraldQueue(compute(input({ events: [], now: START })), []);
    const healer = q.filter((i) => i.routineId === 'healer');
    expect(healer).toHaveLength(1);
    expect(healer[0].stage).toBe('duty:unknown');
    expect(healer[0].body).not.toMatch(/прострочен|згас|немає захисту/i);
    expect(healer[0].actions.map((a) => a.kind)).toEqual(['markDone', 'snooze3d', 'dismiss']);

    const fleas = q.filter((i) => i.routineId === 'fleas');
    expect(fleas).toHaveLength(1);
    expect(fleas[0].stage).toBe('ward:unknown');
    expect(fleas[0].actions.map((a) => a.kind)).toEqual(['markDone', 'snooze3d', 'dismiss']);
  });

  test('невідоме стоїть нижче за будь-яке справжнє прострочення', () => {
    const { events, push } = makeLog();
    push('claws', addDays(START, -90)); // давно прострочений обовʼязок
    const ids = heraldQueue(compute(input({ events, now: START })), []).map((i) => i.routineId);
    expect(ids[0]).toBe('claws');
    expect(ids.indexOf('claws')).toBeLessThan(ids.indexOf('healer'));
  });

  test('невідома стадія показується один раз', () => {
    const first = heraldQueue(compute(input({ events: [], now: START })), []).find((i) => i.routineId === 'vaccine')!;
    const shown: HeraldShown[] = [{ routineId: 'vaccine', stage: first.stage, shownAt: START }];
    const again = heraldQueue(compute(input({ events: [], now: addDays(START, 1) })), shown);
    expect(again.find((i) => i.routineId === 'vaccine')).toBeUndefined();
  });

  test('черга впорядкована: прострочене → скоро згасне → квота', () => {
    const { events, push } = makeLog();
    push('fleas', START);
    push('worms', addDays(START, -85)); // згас
    const q = heraldQueue(compute(input({ events, now: addDays(START, 25) })), []);
    const kinds = q.map((i) => i.routineId);
    expect(kinds.indexOf('worms')).toBeLessThan(kinds.indexOf('fleas'));
    expect(kinds.indexOf('fleas')).toBeLessThan(kinds.indexOf('run'));
  });
});

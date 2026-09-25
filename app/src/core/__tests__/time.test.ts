import { addDays, addMonths, dayKey, diffDays, monthStart, monthsBetween, nextMonthStart, weekStart } from '../time';
import { ageLabel } from '../engine';
import { computeStats } from '../stats';
import { compute } from '../engine';
import { BALU } from '../catalog';
import { input, makeLog } from './fixtures';

describe('календарна арифметика', () => {
  test('тиждень починається з понеділка', () => {
    const sun = new Date(2025, 7, 10, 23, 0, 0).getTime();
    expect(dayKey(weekStart(sun))).toBe('2025-08-04');
    const mon = new Date(2025, 7, 4, 0, 30, 0).getTime();
    expect(weekStart(mon)).toBe(new Date(2025, 7, 4).getTime());
  });

  test('місяць — календарний', () => {
    const t = new Date(2025, 7, 17, 5, 0, 0).getTime();
    expect(dayKey(monthStart(t))).toBe('2025-08-01');
    expect(dayKey(nextMonthStart(t))).toBe('2025-09-01');
  });

  test('addMonths не перестрибує короткий місяць', () => {
    expect(dayKey(addMonths(new Date(2025, 0, 31).getTime(), 1))).toBe('2025-02-28');
    expect(dayKey(addMonths(new Date(2024, 0, 31).getTime(), 1))).toBe('2024-02-29');
  });

  test('diffDays рахує цілі доби і переживає перехід на літній час', () => {
    expect(diffDays(new Date(2025, 2, 29, 23, 0).getTime(), new Date(2025, 3, 1, 1, 0).getTime())).toBe(3);
    expect(diffDays(new Date(2025, 7, 3).getTime(), addDays(new Date(2025, 7, 3).getTime(), 30))).toBe(30);
  });

  test('вік підписується українською', () => {
    const born = new Date(2022, 0, 1).getTime();
    expect(ageLabel(born, new Date(2026, 2, 5).getTime())).toBe('4 роки 2 місяці');
    expect(ageLabel(born, new Date(2023, 0, 1).getTime())).toBe('1 рік');
    expect(ageLabel(born, new Date(2027, 5, 1).getTime())).toBe('5 років 5 місяців');
    expect(monthsBetween(born, new Date(2022, 0, 15).getTime())).toBe(0);
  });
});

describe('статі — ковзне вікно', () => {
  const START = new Date(2025, 7, 4, 9, 0, 0).getTime();

  test('порожній журнал — усе на нулі', () => {
    const s = compute(input({ now: START })).stats;
    expect(s).toEqual({ vitality: 0, stamina: 0, coat: 0, bond: 0 });
  });

  test('Stamina: 3 патрулі × 14 днів і 4 забіги = 100', () => {
    const { events, push } = makeLog();
    for (let d = 0; d < 14; d += 1) for (let i = 0; i < 3; i += 1) push('patrol', addDays(START, d) + i * 3_600_000);
    for (let i = 0; i < 4; i += 1) push('run', addDays(START, i));
    const s = compute(input({ events, now: addDays(START, 13) + 12 * 3_600_000 })).stats;
    expect(s.stamina).toBe(100);
  });

  test('провал випадає з вікна сам, без окремої механіки прощення', () => {
    const { events, push } = makeLog();
    for (let d = 0; d < 14; d += 1) for (let i = 0; i < 3; i += 1) push('patrol', addDays(START, d) + i * 3_600_000);
    const later = compute(input({ events, now: addDays(START, 40) })).stats;
    expect(later.stamina).toBe(0);
  });

  test('Vitality нормалізується по наявних розкладах', () => {
    const { events, push } = makeLog();
    push('fleas', START);
    push('worms', START);
    push('healer', START);
    push('vaccine', START);
    push('weigh', START, { weightKg: 11.5 });
    push('claws', START);
    const state = compute(input({ events, now: addDays(START, 3) }));
    expect(state.stats.vitality).toBe(100);
    expect(state.weightInRange).toBe(true);
  });

  test('вага поза діапазоном знімає свої 20', () => {
    const { events, push } = makeLog();
    push('fleas', START);
    push('worms', START);
    push('healer', START);
    push('vaccine', START);
    push('weigh', START, { weightKg: 16 });
    push('claws', START);
    const state = compute(input({ events, now: addDays(START, 3) }));
    expect(state.weightInRange).toBe(false);
    expect(state.stats.vitality).toBe(80);
  });

  test('computeStats не залежить від нічого, крім аргументів', () => {
    const args = {
      dog: BALU,
      routines: [],
      events: [],
      places: [],
      quests: [],
      weightInRange: undefined,
      now: START,
    };
    expect(computeStats(args)).toEqual(computeStats(args));
  });
});

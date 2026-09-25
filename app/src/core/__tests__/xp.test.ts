import { compute } from '../engine';
import { levelFor, totalXpOf } from '../xp';
import { DEFAULT_ROUTINES } from '../catalog';
import { addDays } from '../time';
import { YEAR_START, dailyOnlyYear, input, perfectYear } from './fixtures';

const YEAR_END = addDays(YEAR_START, 365);

describe('XP і рівень', () => {
  test('ідеальний рік дає ≈147 000 XP за таблицею спеки §7', () => {
    const xp = totalXpOf(DEFAULT_ROUTINES, perfectYear(), YEAR_END);
    expect(xp).toBe(147_290);
    expect(Math.abs(xp - 147_000)).toBeLessThanOrEqual(500);
  });

  test('ідеальний рік не дістає до стелі 999 — їй бракує 2 410 XP', () => {
    const { level } = levelFor(147_290);
    expect(level).toBe(982);
    expect(levelFor(149_700).level).toBe(999);
    expect(levelFor(1_000_000).level).toBe(999); // стеля тримає
  });

  test('стеля вбудовує сенс: самі щоденні тапи цілий рік — і все', () => {
    const state = compute(input({ events: dailyOnlyYear(), now: YEAR_END }));
    expect(state.totalXp).toBe(64_090);
    // спека §8.3 називає 427 як floor(xp/150); формула рівня стартує з 1, тому 428
    expect(state.level).toBeLessThanOrEqual(428);
    expect(state.level).toBeLessThan(500);
  });

  test('рідке відчувається як подія', () => {
    expect(Math.floor(2500 / 150)).toBe(16); // похід
    expect(Math.floor(4000 / 150)).toBe(26); // огляд Цілителя
    expect(Math.floor(6000 / 150)).toBe(40); // вакцинація
  });

  test('рівень ніколи не падає від додавання події', () => {
    const base = perfectYear();
    let prev = 0;
    for (let i = 0; i <= base.length; i += 200) {
      const state = compute(input({ events: base.slice(0, i), now: YEAR_END }));
      expect(state.level).toBeGreaterThanOrEqual(prev);
      prev = state.level;
    }
  });

  test('подія невідомого розкладу не ламає суму', () => {
    const xp = totalXpOf(DEFAULT_ROUTINES, [
      { id: 'x', routineId: 'ghost', occurredAt: YEAR_START, recordedAt: YEAR_START, source: 'manual' },
    ], YEAR_END);
    expect(xp).toBe(0);
  });

  test('xpIntoLevel узгоджений з рівнем', () => {
    const info = levelFor(1_000);
    expect(info.level).toBe(7);
    expect(info.xpIntoLevel).toBe(100);
    expect(info.xpPerLevel).toBe(150);
  });
});

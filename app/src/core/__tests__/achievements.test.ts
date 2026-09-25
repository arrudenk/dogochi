import { compute } from '../engine';
import { longestWardStreakDays } from '../achievements';
import { BALU, DEFAULT_ROUTINES } from '../catalog';
import { addDays, addYears } from '../time';
import { YEAR_START, input, makeLog, perfectYear, places } from './fixtures';

const view = (state: ReturnType<typeof compute>, id: string) => state.achievements.find((a) => a.id === id)!;

describe('трофеї', () => {
  test('ретроспективні: умова вже виконана в журналі — відкривається одразу', () => {
    const { events, push } = makeLog();
    for (let i = 0; i < 50; i += 1) push('run', addDays(YEAR_START, i * 2));
    const state = compute(input({ events, now: addDays(YEAR_START, 200), unlocked: [] }));
    expect(view(state, 'night-courier').unlocked).toBe(true);
    expect(state.newlyUnlocked).toContain('night-courier');
  });

  test('уже записаний трофей не потрапляє в newlyUnlocked вдруге', () => {
    const { events, push } = makeLog();
    for (let i = 0; i < 50; i += 1) push('run', addDays(YEAR_START, i * 2));
    const now = addDays(YEAR_START, 200);
    const state = compute(input({ events, now, unlocked: [{ id: 'night-courier', unlockedAt: now }] }));
    expect(state.newlyUnlocked).not.toContain('night-courier');
    expect(view(state, 'night-courier').unlockedAt).toBe(now);
  });

  test('прогрес і підпис українською', () => {
    const { events, push } = makeLog();
    for (let i = 0; i < 25; i += 1) push('run', addDays(YEAR_START, i * 2));
    const v = view(compute(input({ events, now: addDays(YEAR_START, 60) })), 'night-courier');
    expect(v.progress).toBeCloseTo(0.5);
    expect(v.progressLabel).toBe('25 з 50 забігів');
    expect(v.unlocked).toBe(false);
  });

  test('картограф рахує місця', () => {
    const state = compute(input({ places: places(10), now: addDays(YEAR_START, 100) }));
    expect(view(state, 'cartographer').unlocked).toBe(true);
  });

  test('незламний щит — безперервне покриття оберегами', () => {
    const { events, push } = makeLog();
    for (let i = 0; i < 13; i += 1) push('fleas', addDays(YEAR_START, i * 30));
    const streak = longestWardStreakDays(DEFAULT_ROUTINES, events, addDays(YEAR_START, 400));
    expect(streak).toBe(391); // 12 × 30 + повний останній оберіг
  });

  test('розрив у покритті ламає серію', () => {
    const { events, push } = makeLog();
    push('fleas', YEAR_START);
    push('fleas', addDays(YEAR_START, 60)); // 29 днів без захисту
    const streak = longestWardStreakDays(DEFAULT_ROUTINES, events, addDays(YEAR_START, 200));
    expect(streak).toBe(31);
  });

  test('стабільний — 12 зважувань у діапазоні підряд, збій обнуляє', () => {
    const { events, push } = makeLog();
    for (let i = 0; i < 12; i += 1) push('weigh', addDays(YEAR_START, i * 30), { weightKg: i === 5 ? 14.0 : 11.5 });
    const state = compute(input({ events, now: addDays(YEAR_START, 400) }));
    expect(view(state, 'steady').progress).toBeCloseTo(6 / 12);
  });

  test('пʼятий рік — день народження, зустрінутий у світі', () => {
    const { events, push } = makeLog();
    const birthday = addYears(BALU.bornAt, 4);
    push('feed', addDays(birthday, -10));
    const before = compute(input({ events, now: addDays(birthday, -1) }));
    expect(view(before, 'fifth-year').unlocked).toBe(false);
    const after = compute(input({ events, now: addDays(birthday, 1) }));
    expect(view(after, 'fifth-year').unlocked).toBe(true);
  });

  test('ідеальний рік відкриває похідні трофеї', () => {
    const state = compute(input({ events: perfectYear(), now: addDays(YEAR_START, 365), places: places(10) }));
    expect(view(state, 'deep-forest').unlocked).toBe(true);
    expect(view(state, 'keen-eye').unlocked).toBe(false); // 12 з 20 — трофей на кілька років
    expect(view(state, 'night-courier').unlocked).toBe(true);
  });
});

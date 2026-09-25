import { compute } from '../engine';
import { addDays } from '../time';
import { input, makeLog } from './fixtures';

const AUG_3 = new Date(2025, 7, 3, 11, 0, 0, 0).getTime();
const day = (y: number, m: number, d: number) => new Date(y, m, d, 18, 0, 0, 0).getTime();

function wardQuest(now: number, events = fleasOn(AUG_3)) {
  const state = compute(input({ events, now }));
  return state.quests.find((q) => q.routine.id === 'fleas')!;
}

function fleasOn(...times: number[]) {
  const { events, push } = makeLog();
  for (const t of times) push('fleas', t);
  return events;
}

describe('горизонт оберега', () => {
  test('видано 3 серпня на 30 днів: 2 вересня активний, 3 вересня згас', () => {
    const active = wardQuest(day(2025, 8, 2));
    expect(active.status).not.toBe('expired');
    expect(active.wardDaysLeft).toBe(0);

    const expired = wardQuest(day(2025, 8, 3));
    expect(expired.status).toBe('expired');
    expect(expired.overdueDays).toBe(1);
  });

  test('оберіг не накопичується: доза на 25-й день дає термін від нової дати', () => {
    const redose = addDays(AUG_3, 25);
    const q = wardQuest(addDays(redose, 1), fleasOn(AUG_3, redose));
    expect(q.wardExpiresAt).toBe(addDays(new Date(redose).setHours(0, 0, 0, 0), 30));
    expect(q.wardDaysLeft).toBe(29); // не 34 — захист не додається до залишку
  });

  test('оберіг за 5 днів до згасання — dueSoon, раніше — done', () => {
    expect(wardQuest(addDays(AUG_3, 25)).status).toBe('dueSoon');
    expect(wardQuest(addDays(AUG_3, 10)).status).toBe('done');
  });

  test('жодної дози — оберіг відсутній у списку, квест невідомий', () => {
    const state = compute(input({ events: [], now: AUG_3 }));
    expect(state.wards.find((w) => w.routineId === 'fleas')).toBeUndefined();
    expect(state.quests.find((q) => q.routine.id === 'fleas')!.status).toBe('unknown');
  });
});

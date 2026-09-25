import { compute } from '../engine';
import { desiredNotifications, HOWL_TITLE } from '../notifications';
import { addDays } from '../time';
import { input, makeLog } from './fixtures';

const START = new Date(2025, 7, 4, 9, 0, 0, 0).getTime();

function stateWith(events: ReturnType<typeof makeLog>['events'], now: number) {
  return compute(input({ events, now }));
}

function fullCatalogLog(anchor: number) {
  const { events, push } = makeLog();
  push('fleas', anchor);
  push('worms', anchor);
  push('healer', anchor);
  push('vaccine', anchor);
  push('weigh', anchor, { weightKg: 11.5 });
  push('claws', anchor);
  return events;
}

describe('детектор тишини', () => {
  test('регулярні відкриття — жодного АУУУУУУ', () => {
    const now = addDays(START, 25);
    const events = fullCatalogLog(START);
    const req = desiredNotifications({
      now,
      quests: stateWith(events, now).quests,
      lastOpenedAt: addDays(now, -1),
    });
    expect(req).toEqual([]);
  });

  test('3 дні тиші, але нічого дорогого — теж тиша', () => {
    const now = addDays(START, 5); // усе щойно зроблено
    const events = fullCatalogLog(START);
    const req = desiredNotifications({
      now,
      quests: stateWith(events, now).quests,
      lastOpenedAt: addDays(now, -5),
    });
    expect(req).toEqual([]);
  });

  test('рівно три запити на now+3д, now+6д, now+10д', () => {
    const now = addDays(START, 26); // оберіг від кліщів гасне за 4 дні
    const events = fullCatalogLog(START);
    const req = desiredNotifications({
      now,
      quests: stateWith(events, now).quests,
      lastOpenedAt: addDays(now, -4),
    });
    expect(req.map((r) => r.id)).toEqual(['howl-3d', 'howl-6d', 'howl-10d']);
    expect(req.map((r) => r.fireAt)).toEqual([addDays(now, 3), addDays(now, 6), addDays(now, 10)]);
    expect(req.every((r) => r.title === HOWL_TITLE)).toBe(true);
    expect(req[0].routineId).toBe('fleas');
    expect(req[0].body).toContain('Зілля від кровопивць');
    expect(req[0].body).toContain('Я тебе гукаю');
    expect(req[0].body).not.toMatch(/покинув|забув|сумує/);
  });

  test('згаслий оберіг важливіший за той, що тільки гасне', () => {
    const now = addDays(START, 95);
    const events = fullCatalogLog(START);
    const req = desiredNotifications({
      now,
      quests: stateWith(events, now).quests,
      lastOpenedAt: addDays(now, -10),
    });
    expect(req[0].routineId).toBe('fleas'); // згас 65 днів тому
    expect(req[0].body).toContain('І ще');
  });

  test('бюджет 64: детектор тишини ніколи не просить більше чотирьох слотів', () => {
    const now = addDays(START, 400);
    const events = fullCatalogLog(START);
    const req = desiredNotifications({
      now,
      quests: stateWith(events, now).quests,
      lastOpenedAt: START,
    });
    expect(req.length).toBeLessThanOrEqual(4);
  });
});

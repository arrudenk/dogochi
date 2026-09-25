import { BALU, DEFAULT_ROUTINES } from '../../core/catalog';
import type { CareEvent, HeraldShown, Place, UnlockedAchievement } from '../../core/types';
import {
  FutureEventError,
  achievementToRow,
  assertNotFuture,
  dogToRow,
  draftToEvent,
  eventToRow,
  heraldKey,
  heraldToRow,
  newId,
  placeToRow,
  rowToAchievement,
  rowToDog,
  rowToEvent,
  rowToHerald,
  rowToPlace,
  rowToRoutine,
  routineToRow,
} from '../mapping';

const NOW = Date.UTC(2026, 7, 20, 12, 0, 0);

describe('dog mapping', () => {
  it('round-trips Балу разом зі спрайтами й палітрою', () => {
    const dog = { ...BALU, sprites: { stand: 'a.png', portrait: 'p.png' } as const };
    expect(rowToDog(dogToRow(dog))).toEqual(dog);
  });

  it('відкочується на порожні спрайти, якщо JSON побитий', () => {
    const row = { ...dogToRow(BALU), sprites: '{not json', palette: '' };
    const dog = rowToDog(row);
    expect(dog.sprites).toEqual({});
    expect(dog.palette).toEqual([]);
  });
});

describe('routine mapping', () => {
  it('round-trips увесь каталог за замовчуванням', () => {
    for (const routine of DEFAULT_ROUTINES) {
      expect(rowToRoutine(routineToRow(routine))).toEqual(routine);
    }
  });

  it('enabled і calendarBackup живуть як 0/1, а відсутній прапорець лишається null', () => {
    const row = routineToRow(DEFAULT_ROUTINES.find((r) => r.id === 'healer')!);
    expect(row.enabled).toBe(1);
    expect(row.calendarBackup).toBe(1);
    expect(routineToRow(DEFAULT_ROUTINES[0]).calendarBackup).toBeNull();
  });

  it('невживані поля типу розкладу лягають у NULL, а не в 0', () => {
    const row = routineToRow(DEFAULT_ROUTINES.find((r) => r.id === 'feed')!);
    expect(row.perDay).toBe(2);
    expect(row.wardDays).toBeNull();
    expect(row.everyMonths).toBeNull();
    expect(row.quotaPeriod).toBeNull();
  });

  it('calendarEventId не є частиною доменного типу й не ламає маппінг назад', () => {
    const routine = DEFAULT_ROUTINES.find((r) => r.id === 'vaccine')!;
    const row = routineToRow(routine, 'EK-123');
    expect(row.calendarEventId).toBe('EK-123');
    expect(rowToRoutine(row)).toEqual(routine);
  });
});

describe('event mapping', () => {
  const event: CareEvent = {
    id: 'ev1',
    routineId: 'fleas',
    occurredAt: NOW - 1000,
    recordedAt: NOW,
    source: 'manual',
    weightKg: 11.5,
    note: 'нотатка',
    placeId: 'pl1',
  };

  it('round-trips повну подію', () => {
    expect(rowToEvent(eventToRow(event))).toEqual(event);
  });

  it('порожнє навантаження їде як NULL і повертається як undefined', () => {
    const bare: CareEvent = {
      id: 'ev2',
      routineId: 'feed',
      occurredAt: NOW,
      recordedAt: NOW,
      source: 'auto',
    };
    const row = eventToRow(bare);
    expect(row.weightKg).toBeNull();
    expect(row.note).toBeNull();
    expect(row.placeId).toBeNull();
    expect(rowToEvent(row)).toEqual(bare);
  });

  it('невідоме джерело нормалізується в manual', () => {
    expect(rowToEvent({ ...eventToRow(event), source: 'garbage' }).source).toBe('manual');
  });
});

describe('заборонена дата', () => {
  it('подія в майбутньому відхиляється типізованою помилкою', () => {
    expect(() => assertNotFuture(NOW + 1, NOW)).toThrow(FutureEventError);
    expect(() => draftToEvent({ routineId: 'feed', occurredAt: NOW + 1, source: 'manual' }, NOW)).toThrow(
      FutureEventError,
    );
  });

  it('подія рівно зараз і дописування минулим числом проходять', () => {
    expect(() => assertNotFuture(NOW, NOW)).not.toThrow();
    const back = draftToEvent(
      { routineId: 'forest', occurredAt: NOW - 86_400_000, source: 'manual' },
      NOW,
    );
    expect(back.occurredAt).toBe(NOW - 86_400_000);
    expect(back.recordedAt).toBe(NOW);
  });

  it('помилка несе обидві дати й ловиться по instanceof', () => {
    try {
      assertNotFuture(NOW + 5, NOW);
      throw new Error('мало кинути');
    } catch (e) {
      expect(e).toBeInstanceOf(FutureEventError);
      expect((e as FutureEventError).occurredAt).toBe(NOW + 5);
      expect((e as FutureEventError).now).toBe(NOW);
    }
  });

  it('NaN не проскакує як валідна дата', () => {
    expect(() => assertNotFuture(Number.NaN, NOW)).toThrow(FutureEventError);
  });
});

describe('чернетка події', () => {
  it('дописує id, recordedAt і source за замовчуванням', () => {
    const e = draftToEvent({ routineId: 'feed', occurredAt: NOW, source: 'manual' }, NOW);
    expect(e.id).toMatch(/^ev_/);
    expect(e.recordedAt).toBe(NOW);
    expect(e.source).toBe('manual');
  });

  it('передані id і recordedAt поважаються', () => {
    const e = draftToEvent(
      { id: 'fixed', routineId: 'feed', occurredAt: NOW, recordedAt: NOW - 5, source: 'auto' },
      NOW,
    );
    expect(e.id).toBe('fixed');
    expect(e.recordedAt).toBe(NOW - 5);
  });

  it('newId не повторюється', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId('ev')));
    expect(ids.size).toBe(500);
  });
});

describe('place / achievement / herald mapping', () => {
  it('місце без координат round-trips', () => {
    const p: Place = { id: 'pl1', name: 'Глибокий Ліс', firstVisitedAt: NOW };
    const row = placeToRow(p);
    expect(row.lat).toBeNull();
    expect(rowToPlace(row)).toEqual(p);
  });

  it('місце з координатами round-trips', () => {
    const p: Place = { id: 'pl2', name: 'Парк', firstVisitedAt: NOW, lat: 50.4, lon: 30.5 };
    expect(rowToPlace(placeToRow(p))).toEqual(p);
  });

  it('трофей round-trips', () => {
    const a: UnlockedAchievement = { id: 'nightrunner', unlockedAt: NOW };
    expect(rowToAchievement(achievementToRow(a))).toEqual(a);
  });

  it('герольд round-trips і має стабільний ключ стадії', () => {
    const h: HeraldShown = { routineId: 'healer', stage: 'overdue+14', shownAt: NOW };
    const row = heraldToRow(h);
    expect(row.id).toBe(heraldKey('healer', 'overdue+14'));
    expect(row.snoozedUntil).toBeNull();
    expect(rowToHerald(row)).toEqual(h);
  });

  it('відкладений герольд зберігає snoozedUntil', () => {
    const h: HeraldShown = {
      routineId: 'healer',
      stage: 'due-3',
      shownAt: NOW,
      snoozedUntil: NOW + 3 * 86_400_000,
    };
    expect(rowToHerald(heraldToRow(h))).toEqual(h);
  });
});

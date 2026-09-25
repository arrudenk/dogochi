// Репозиторій: типізований CRUD, маппінг рядків ↔ доменних значень з core/types.
// Журнал подій append-only: додати й видалити є, оновити — ні. Спека §4, §5.

import type {
  CareEvent,
  CareRoutine,
  Dog,
  HeraldShown,
  Millis,
  Place,
  SpritePose,
  UnlockedAchievement,
} from '../core/types';
import { getDb } from './db';
import {
  achievementToRow,
  assertNotFuture,
  boolToInt,
  draftToEvent,
  dogToRow,
  eventToRow,
  heraldKey,
  placeToRow,
  rowToAchievement,
  rowToDog,
  rowToEvent,
  rowToHerald,
  rowToPlace,
  rowToRoutine,
  routineToRow,
  type AchievementRow,
  type DogRow,
  type EventRow,
  type HeraldRow,
  type NewEvent,
  type PlaceRow,
  type RoutineRow,
} from './mapping';
import { META_LAST_OPENED_AT, META_ONBOARDING_DONE } from './schema';

// ─── Dog ─────────────────────────────────────────────────────────────────────

export async function getDog(): Promise<Dog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DogRow>('SELECT * FROM dog LIMIT 1');
  return row ? rowToDog(row) : null;
}

export async function upsertDog(dog: Dog): Promise<void> {
  const db = await getDb();
  const r = dogToRow(dog);
  await db.runAsync(
    `INSERT INTO dog (id, name, bornAt, breedNote, targetWeightMin, targetWeightMax, sprites, palette)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       bornAt = excluded.bornAt,
       breedNote = excluded.breedNote,
       targetWeightMin = excluded.targetWeightMin,
       targetWeightMax = excluded.targetWeightMax,
       sprites = excluded.sprites,
       palette = excluded.palette`,
    [r.id, r.name, r.bornAt, r.breedNote, r.targetWeightMin, r.targetWeightMax, r.sprites, r.palette],
  );
}

/** Ритуал виклику кує спрайти по одному — мержимо, а не перезаписуємо весь набір. */
export async function setSprite(dogId: string, pose: SpritePose, path: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<DogRow>('SELECT * FROM dog WHERE id = ?', [dogId]);
  if (!row) return;
  const dog = rowToDog(row);
  dog.sprites = { ...dog.sprites, [pose]: path };
  await db.runAsync('UPDATE dog SET sprites = ? WHERE id = ?', [JSON.stringify(dog.sprites), dogId]);
}

export async function setPalette(dogId: string, palette: string[]): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE dog SET palette = ? WHERE id = ?', [JSON.stringify(palette), dogId]);
}

// ─── CareRoutine ─────────────────────────────────────────────────────────────

export async function listRoutines(): Promise<CareRoutine[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RoutineRow>('SELECT * FROM care_routine');
  return rows.map(rowToRoutine);
}

export async function upsertRoutine(routine: CareRoutine): Promise<void> {
  const db = await getDb();
  await upsertRoutineOn(db, routine);
}

export async function setRoutineEnabled(routineId: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE care_routine SET enabled = ? WHERE id = ?', [boolToInt(enabled), routineId]);
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM care_routine WHERE id = ?', [routineId]);
}

/** Ідентифікатор EKEvent живе на розкладі, щоб страховку оновлювати, а не дублювати (спека §10). */
export async function setRoutineCalendarEventId(
  routineId: string,
  calendarEventId: string | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE care_routine SET calendarEventId = ? WHERE id = ?', [
    calendarEventId,
    routineId,
  ]);
}

export async function getRoutineCalendarEventIds(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; calendarEventId: string | null }>(
    'SELECT id, calendarEventId FROM care_routine WHERE calendarEventId IS NOT NULL',
  );
  const out: Record<string, string> = {};
  for (const row of rows) if (row.calendarEventId) out[row.id] = row.calendarEventId;
  return out;
}

// ─── CareEvent (append-only) ─────────────────────────────────────────────────

export interface ListEventsOptions {
  routineId?: string;
  since?: Millis;
  until?: Millis;
  limit?: number;
  order?: 'asc' | 'desc';
}

/** Кидає FutureEventError, якщо `occurredAt` пізніше за переданий `now`. Repo сам час не читає. */
export async function addEvent(draft: NewEvent, now: Millis): Promise<CareEvent> {
  const event = draftToEvent(draft, now);
  const db = await getDb();
  const r = eventToRow(event);
  await db.runAsync(
    `INSERT INTO care_event (id, routineId, occurredAt, recordedAt, source, weightKg, note, placeId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [r.id, r.routineId, r.occurredAt, r.recordedAt, r.source, r.weightKg, r.note, r.placeId],
  );
  return event;
}

/** Єдиний спосіб прибрати запис — скасування помилкового тапу (спека §13). Оновлення події не існує. */
export async function deleteEvent(eventId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM care_event WHERE id = ?', [eventId]);
}

export async function listEvents(opts: ListEventsOptions = {}): Promise<CareEvent[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (opts.routineId !== undefined) {
    where.push('routineId = ?');
    params.push(opts.routineId);
  }
  if (opts.since !== undefined) {
    where.push('occurredAt >= ?');
    params.push(opts.since);
  }
  if (opts.until !== undefined) {
    where.push('occurredAt <= ?');
    params.push(opts.until);
  }

  const sql =
    'SELECT * FROM care_event' +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ` ORDER BY occurredAt ${opts.order === 'asc' ? 'ASC' : 'DESC'}` +
    (opts.limit !== undefined ? ' LIMIT ?' : '');
  if (opts.limit !== undefined) params.push(opts.limit);

  const rows = await db.getAllAsync<EventRow>(sql, params);
  return rows.map(rowToEvent);
}

export async function countEvents(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM care_event');
  return row?.n ?? 0;
}

/** Останнє зважування — окремим запитом, щоб не тягнути весь журнал заради однієї цифри. */
export async function lastEventFor(routineId: string): Promise<CareEvent | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EventRow>(
    'SELECT * FROM care_event WHERE routineId = ? ORDER BY occurredAt DESC LIMIT 1',
    [routineId],
  );
  return row ? rowToEvent(row) : null;
}

// ─── Place ───────────────────────────────────────────────────────────────────

export async function listPlaces(): Promise<Place[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlaceRow>('SELECT * FROM place ORDER BY firstVisitedAt DESC');
  return rows.map(rowToPlace);
}

export async function upsertPlace(place: Place): Promise<void> {
  const db = await getDb();
  const r = placeToRow(place);
  await db.runAsync(
    `INSERT INTO place (id, name, firstVisitedAt, lat, lon)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       firstVisitedAt = excluded.firstVisitedAt,
       lat = excluded.lat,
       lon = excluded.lon`,
    [r.id, r.name, r.firstVisitedAt, r.lat, r.lon],
  );
}

export async function deletePlace(placeId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM place WHERE id = ?', [placeId]);
}

// ─── UnlockedAchievement ─────────────────────────────────────────────────────

export async function listUnlocked(): Promise<UnlockedAchievement[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AchievementRow>('SELECT * FROM unlocked_achievement');
  return rows.map(rowToAchievement);
}

/** Перше виконання фіксується один раз — спектакль не повторюється при кожному перерахунку (спека §5). */
export async function unlockAchievement(id: string, unlockedAt: Millis): Promise<void> {
  const db = await getDb();
  const r = achievementToRow({ id, unlockedAt });
  await db.runAsync('INSERT OR IGNORE INTO unlocked_achievement (id, unlockedAt) VALUES (?, ?)', [
    r.id,
    r.unlockedAt,
  ]);
}

export async function unlockAchievements(ids: string[], unlockedAt: Millis): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const values = ids.map(() => '(?, ?)').join(', ');
  const params: (string | number)[] = [];
  for (const id of ids) params.push(id, unlockedAt);
  await db.runAsync(`INSERT OR IGNORE INTO unlocked_achievement (id, unlockedAt) VALUES ${values}`, params);
}

// ─── HeraldShown ─────────────────────────────────────────────────────────────

export async function listShown(): Promise<HeraldShown[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HeraldRow>('SELECT * FROM herald_shown');
  return rows.map(rowToHerald);
}

export async function recordShown(routineId: string, stage: string, shownAt: Millis): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO herald_shown (id, routineId, stage, shownAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET shownAt = excluded.shownAt`,
    [heraldKey(routineId, stage), routineId, stage, shownAt],
  );
}

/** «Нагадай за три дні» стосується розкладу цілком, тому тримаємо ще й рядок-сентинел зі стадією '*'. */
export async function snooze(routineId: string, until: Millis): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO herald_shown (id, routineId, stage, shownAt) VALUES (?, ?, '*', 0)`,
    [heraldKey(routineId, '*'), routineId],
  );
  await db.runAsync('UPDATE herald_shown SET snoozedUntil = ? WHERE routineId = ?', [until, routineId]);
}

export async function clearShown(routineId?: string): Promise<void> {
  const db = await getDb();
  if (routineId === undefined) await db.runAsync('DELETE FROM herald_shown');
  else await db.runAsync('DELETE FROM herald_shown WHERE routineId = ?', [routineId]);
}

// ─── app_meta ────────────────────────────────────────────────────────────────

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function getLastOpenedAt(): Promise<Millis | null> {
  const raw = await getMeta(META_LAST_OPENED_AT);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function setLastOpenedAt(now: Millis): Promise<void> {
  await setMeta(META_LAST_OPENED_AT, String(now));
}

export async function isOnboardingComplete(): Promise<boolean> {
  return (await getMeta(META_ONBOARDING_DONE)) === '1';
}

export async function setOnboardingComplete(done: boolean): Promise<void> {
  await setMeta(META_ONBOARDING_DONE, done ? '1' : '0');
}

// ─── loadAll ─────────────────────────────────────────────────────────────────

export interface StoreSnapshot {
  dog: Dog | null;
  routines: CareRoutine[];
  events: CareEvent[];
  places: Place[];
  unlocked: UnlockedAchievement[];
  heraldShown: HeraldShown[];
}

/** Шість запитів на весь стан застосунку. ~11 000 подій за 5 років — одиниці мілісекунд (спека §12). */
export async function loadAll(): Promise<StoreSnapshot> {
  const db = await getDb();
  const [dogRow, routineRows, eventRows, placeRows, achRows, heraldRows] = await Promise.all([
    db.getFirstAsync<DogRow>('SELECT * FROM dog LIMIT 1'),
    db.getAllAsync<RoutineRow>('SELECT * FROM care_routine'),
    db.getAllAsync<EventRow>('SELECT * FROM care_event ORDER BY occurredAt ASC'),
    db.getAllAsync<PlaceRow>('SELECT * FROM place ORDER BY firstVisitedAt DESC'),
    db.getAllAsync<AchievementRow>('SELECT * FROM unlocked_achievement'),
    db.getAllAsync<HeraldRow>('SELECT * FROM herald_shown'),
  ]);

  return {
    dog: dogRow ? rowToDog(dogRow) : null,
    routines: routineRows.map(rowToRoutine),
    events: eventRows.map(rowToEvent),
    places: placeRows.map(rowToPlace),
    unlocked: achRows.map(rowToAchievement),
    heraldShown: heraldRows.map(rowToHerald),
  };
}

// ─── внутрішнє ───────────────────────────────────────────────────────────────

type Runner = { runAsync(source: string, params: (string | number | null)[]): Promise<unknown> };

export async function upsertRoutineOn(db: Runner, routine: CareRoutine): Promise<void> {
  const r = routineToRow(routine);
  await db.runAsync(
    `INSERT INTO care_routine (
       id, title, kind, grp, xp, enabled, icon, perDay, wardDays, everyMonths,
       quotaCount, quotaPeriod, spawnedBy, spawnWindowHours, calendarBackup, hint
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       kind = excluded.kind,
       grp = excluded.grp,
       xp = excluded.xp,
       enabled = excluded.enabled,
       icon = excluded.icon,
       perDay = excluded.perDay,
       wardDays = excluded.wardDays,
       everyMonths = excluded.everyMonths,
       quotaCount = excluded.quotaCount,
       quotaPeriod = excluded.quotaPeriod,
       spawnedBy = excluded.spawnedBy,
       spawnWindowHours = excluded.spawnWindowHours,
       calendarBackup = excluded.calendarBackup,
       hint = excluded.hint`,
    [
      r.id,
      r.title,
      r.kind,
      r.grp,
      r.xp,
      r.enabled,
      r.icon,
      r.perDay,
      r.wardDays,
      r.everyMonths,
      r.quotaCount,
      r.quotaPeriod,
      r.spawnedBy,
      r.spawnWindowHours,
      r.calendarBackup,
      r.hint,
    ],
  );
}

export { assertNotFuture };

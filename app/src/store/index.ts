// Публічний API шару персистенції. Поза цим модулем expo-sqlite ніхто не імпортує.

export { DB_NAME, closeDb, getDb, type Db } from './db';
export {
  MIGRATIONS,
  SCHEMA_VERSION,
  META_LAST_OPENED_AT,
  META_ONBOARDING_DONE,
  META_SCHEMA_VERSION,
  runMigrations,
} from './schema';

export {
  FutureEventError,
  assertNotFuture,
  heraldKey,
  isFutureEventError,
  newId,
  type NewEvent,
} from './mapping';

export { seedIfNeeded, type SeedResult } from './seed';

export {
  // dog
  getDog,
  upsertDog,
  setSprite,
  setPalette,
  // routines
  listRoutines,
  upsertRoutine,
  setRoutineEnabled,
  deleteRoutine,
  setRoutineCalendarEventId,
  getRoutineCalendarEventIds,
  // events (append-only)
  addEvent,
  deleteEvent,
  listEvents,
  countEvents,
  lastEventFor,
  // places
  listPlaces,
  upsertPlace,
  deletePlace,
  // achievements
  listUnlocked,
  unlockAchievement,
  unlockAchievements,
  // herald
  listShown,
  recordShown,
  snooze,
  clearShown,
  // meta
  getMeta,
  setMeta,
  getLastOpenedAt,
  setLastOpenedAt,
  isOnboardingComplete,
  setOnboardingComplete,
  // все одним викликом
  loadAll,
  type ListEventsOptions,
  type StoreSnapshot,
} from './repo';

import { getDb } from './db';
import { seedIfNeeded } from './seed';

/** Один виклик на старті: відкрити, змігрувати, засідити. Все async, головний потік вільний. */
export async function initStore(): Promise<void> {
  await getDb();
  await seedIfNeeded();
}

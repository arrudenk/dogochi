// SQL DDL + мінімальний мігратор на PRAGMA user_version.
// Правила моделі під CloudKit (спека §4): кожна колонка має DEFAULT або nullable,
// жодних UNIQUE крім первинних ключів, жодних FK і обовʼязкових звʼязків.

export type SqlExecutor = { execAsync(source: string): Promise<void> };

/** Кожен елемент = одна версія схеми. Індекс + 1 === user_version. Ніколи не редагуємо вже випущені. */
export const MIGRATIONS: string[] = [
  // v1 — початкова схема
  `
  CREATE TABLE IF NOT EXISTS dog (
    id               TEXT PRIMARY KEY,
    name             TEXT    NOT NULL DEFAULT '',
    bornAt           INTEGER NOT NULL DEFAULT 0,
    breedNote        TEXT    NOT NULL DEFAULT '',
    targetWeightMin  REAL    NOT NULL DEFAULT 0,
    targetWeightMax  REAL    NOT NULL DEFAULT 0,
    sprites          TEXT    NOT NULL DEFAULT '{}',
    palette          TEXT    NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS care_routine (
    id                TEXT PRIMARY KEY,
    title             TEXT    NOT NULL DEFAULT '',
    kind              TEXT    NOT NULL DEFAULT 'slotted',
    grp               TEXT    NOT NULL DEFAULT 'daily',
    xp                INTEGER NOT NULL DEFAULT 0,
    enabled           INTEGER NOT NULL DEFAULT 1,
    icon              TEXT    NOT NULL DEFAULT '',
    perDay            INTEGER,
    wardDays          INTEGER,
    everyMonths       INTEGER,
    quotaCount        INTEGER,
    quotaPeriod       TEXT,
    spawnedBy         TEXT,
    spawnWindowHours  INTEGER,
    calendarBackup    INTEGER,
    hint              TEXT,
    calendarEventId   TEXT
  );

  CREATE TABLE IF NOT EXISTS care_event (
    id          TEXT PRIMARY KEY,
    routineId   TEXT    NOT NULL DEFAULT '',
    occurredAt  INTEGER NOT NULL DEFAULT 0,
    recordedAt  INTEGER NOT NULL DEFAULT 0,
    source      TEXT    NOT NULL DEFAULT 'manual',
    weightKg    REAL,
    note        TEXT,
    placeId     TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_care_event_routineId  ON care_event (routineId);
  CREATE INDEX IF NOT EXISTS idx_care_event_occurredAt ON care_event (occurredAt);

  CREATE TABLE IF NOT EXISTS place (
    id              TEXT PRIMARY KEY,
    name            TEXT    NOT NULL DEFAULT '',
    firstVisitedAt  INTEGER NOT NULL DEFAULT 0,
    lat             REAL,
    lon             REAL
  );

  CREATE TABLE IF NOT EXISTS unlocked_achievement (
    id          TEXT PRIMARY KEY,
    unlockedAt  INTEGER NOT NULL DEFAULT 0
  );

  -- id === routineId|stage: один рядок на стадію без composite-ключа, дружньо до майбутнього CloudKit
  CREATE TABLE IF NOT EXISTS herald_shown (
    id            TEXT PRIMARY KEY,
    routineId     TEXT    NOT NULL DEFAULT '',
    stage         TEXT    NOT NULL DEFAULT '',
    shownAt       INTEGER NOT NULL DEFAULT 0,
    snoozedUntil  INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_herald_shown_routineId ON herald_shown (routineId);

  CREATE TABLE IF NOT EXISTS app_meta (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL DEFAULT ''
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export const META_SCHEMA_VERSION = 'schemaVersion';
export const META_LAST_OPENED_AT = 'lastOpenedAt';
export const META_ONBOARDING_DONE = 'onboardingComplete';

/** Прикладає всі непрокачані міграції. Кожна — в своїй транзакції, щоб напівзастосована схема не лишилась. */
export async function runMigrations(
  db: SqlExecutor & { getFirstAsync<T>(source: string): Promise<T | null> },
): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  for (let i = version; i < MIGRATIONS.length; i += 1) {
    // PRAGMA user_version не приймає плейсхолдери, тому інлайним число з індексу — не з вводу.
    await db.execAsync(`BEGIN;${MIGRATIONS[i]};PRAGMA user_version = ${i + 1};COMMIT;`);
    version = i + 1;
  }

  await db.execAsync(
    `INSERT INTO app_meta (key, value) VALUES ('${META_SCHEMA_VERSION}', '${version}')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );

  return version;
}

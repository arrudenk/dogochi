// Чисті перетворення рядок БД ↔ доменне значення. Жодного імпорту expo-sqlite —
// саме тому цей модуль тестується звичайним jest без пристрою.

import type {
  CareEvent,
  CareRoutine,
  Dog,
  EventSource,
  HeraldShown,
  Millis,
  Place,
  QuotaPeriod,
  RoutineGroup,
  RoutineKind,
  SpritePose,
  UnlockedAchievement,
} from '../core/types';

// ─── Помилки ─────────────────────────────────────────────────────────────────

/** Подія з `occurredAt` у майбутньому відхиляється — спека §5, §13. */
export class FutureEventError extends Error {
  readonly occurredAt: Millis;
  readonly now: Millis;

  constructor(occurredAt: Millis, now: Millis) {
    super(`Дата події в майбутньому: occurredAt=${occurredAt} > now=${now}`);
    this.name = 'FutureEventError';
    this.occurredAt = occurredAt;
    this.now = now;
    Object.setPrototypeOf(this, FutureEventError.prototype);
  }
}

export function isFutureEventError(e: unknown): e is FutureEventError {
  return e instanceof FutureEventError;
}

/** `now` приходить аргументом: валідація ніколи не смикає Date.now() сама. */
export function assertNotFuture(occurredAt: Millis, now: Millis): void {
  if (!Number.isFinite(occurredAt) || occurredAt > now) {
    throw new FutureEventError(occurredAt, now);
  }
}

// ─── Дрібні хелпери ──────────────────────────────────────────────────────────

export function boolToInt(v: boolean | undefined): number {
  return v ? 1 : 0;
}

export function intToBool(v: number | null | undefined): boolean {
  return v === 1;
}

function optInt(v: number | null | undefined): number | undefined {
  return v === null || v === undefined ? undefined : v;
}

function optStr(v: string | null | undefined): string | undefined {
  return v === null || v === undefined ? undefined : v;
}

function nullable<T>(v: T | undefined): T | null {
  return v === undefined ? null : v;
}

/** Побитий JSON зі спрайтами не має ламати запуск — відкат на порожнє, спека §13. */
function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/** Ідентифікатори локальні й непослідовні — щоб майбутній мерж журналів не конфліктував. */
export function newId(prefix = 'e'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/** Стабільний ключ «один раз на стадію» (спека §9). */
export function heraldKey(routineId: string, stage: string): string {
  return `${routineId}|${stage}`;
}

// ─── Рядки ───────────────────────────────────────────────────────────────────

export interface DogRow {
  id: string;
  name: string;
  bornAt: number;
  breedNote: string;
  targetWeightMin: number;
  targetWeightMax: number;
  sprites: string;
  palette: string;
}

export interface RoutineRow {
  id: string;
  title: string;
  kind: string;
  grp: string;
  xp: number;
  enabled: number;
  icon: string;
  perDay: number | null;
  wardDays: number | null;
  everyMonths: number | null;
  quotaCount: number | null;
  quotaPeriod: string | null;
  spawnedBy: string | null;
  spawnWindowHours: number | null;
  calendarBackup: number | null;
  hint: string | null;
  calendarEventId: string | null;
}

export interface EventRow {
  id: string;
  routineId: string;
  occurredAt: number;
  recordedAt: number;
  source: string;
  weightKg: number | null;
  note: string | null;
  placeId: string | null;
}

export interface PlaceRow {
  id: string;
  name: string;
  firstVisitedAt: number;
  lat: number | null;
  lon: number | null;
}

export interface AchievementRow {
  id: string;
  unlockedAt: number;
}

export interface HeraldRow {
  id: string;
  routineId: string;
  stage: string;
  shownAt: number;
  snoozedUntil: number | null;
}

// ─── Dog ─────────────────────────────────────────────────────────────────────

export function rowToDog(row: DogRow): Dog {
  return {
    id: row.id,
    name: row.name,
    bornAt: row.bornAt,
    breedNote: row.breedNote,
    targetWeightMin: row.targetWeightMin,
    targetWeightMax: row.targetWeightMax,
    sprites: parseJson<Partial<Record<SpritePose, string>>>(row.sprites, {}),
    palette: parseJson<string[]>(row.palette, []),
  };
}

export function dogToRow(dog: Dog): DogRow {
  return {
    id: dog.id,
    name: dog.name,
    bornAt: dog.bornAt,
    breedNote: dog.breedNote,
    targetWeightMin: dog.targetWeightMin,
    targetWeightMax: dog.targetWeightMax,
    sprites: JSON.stringify(dog.sprites ?? {}),
    palette: JSON.stringify(dog.palette ?? []),
  };
}

// ─── CareRoutine ─────────────────────────────────────────────────────────────

export function rowToRoutine(row: RoutineRow): CareRoutine {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind as RoutineKind,
    group: row.grp as RoutineGroup,
    xp: row.xp,
    enabled: intToBool(row.enabled),
    icon: row.icon,
    perDay: optInt(row.perDay),
    wardDays: optInt(row.wardDays),
    everyMonths: optInt(row.everyMonths),
    quotaCount: optInt(row.quotaCount),
    quotaPeriod: (optStr(row.quotaPeriod) as QuotaPeriod | undefined) ?? undefined,
    spawnedBy: optStr(row.spawnedBy),
    spawnWindowHours: optInt(row.spawnWindowHours),
    calendarBackup: row.calendarBackup === null ? undefined : intToBool(row.calendarBackup),
    hint: optStr(row.hint),
  };
}

export function routineToRow(r: CareRoutine, calendarEventId?: string): RoutineRow {
  return {
    id: r.id,
    title: r.title,
    kind: r.kind,
    grp: r.group,
    xp: r.xp,
    enabled: boolToInt(r.enabled),
    icon: r.icon,
    perDay: nullable(r.perDay),
    wardDays: nullable(r.wardDays),
    everyMonths: nullable(r.everyMonths),
    quotaCount: nullable(r.quotaCount),
    quotaPeriod: nullable(r.quotaPeriod),
    spawnedBy: nullable(r.spawnedBy),
    spawnWindowHours: nullable(r.spawnWindowHours),
    calendarBackup: r.calendarBackup === undefined ? null : boolToInt(r.calendarBackup),
    hint: nullable(r.hint),
    calendarEventId: nullable(calendarEventId),
  };
}

// ─── CareEvent ───────────────────────────────────────────────────────────────

export function rowToEvent(row: EventRow): CareEvent {
  return {
    id: row.id,
    routineId: row.routineId,
    occurredAt: row.occurredAt,
    recordedAt: row.recordedAt,
    source: (row.source === 'auto' ? 'auto' : 'manual') as EventSource,
    weightKg: row.weightKg === null ? undefined : row.weightKg,
    note: optStr(row.note),
    placeId: optStr(row.placeId),
  };
}

export function eventToRow(e: CareEvent): EventRow {
  return {
    id: e.id,
    routineId: e.routineId,
    occurredAt: e.occurredAt,
    recordedAt: e.recordedAt,
    source: e.source,
    weightKg: nullable(e.weightKg),
    note: nullable(e.note),
    placeId: nullable(e.placeId),
  };
}

/** Чернетка події: id і recordedAt дописуються тут, щоб repo лишався тонким. */
export type NewEvent = Omit<CareEvent, 'id' | 'recordedAt'> & {
  id?: string;
  recordedAt?: Millis;
};

export function draftToEvent(draft: NewEvent, now: Millis): CareEvent {
  assertNotFuture(draft.occurredAt, now);
  return {
    id: draft.id ?? newId('ev'),
    routineId: draft.routineId,
    occurredAt: draft.occurredAt,
    recordedAt: draft.recordedAt ?? now,
    source: draft.source ?? 'manual',
    weightKg: draft.weightKg,
    note: draft.note,
    placeId: draft.placeId,
  };
}

// ─── Place ───────────────────────────────────────────────────────────────────

export function rowToPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    firstVisitedAt: row.firstVisitedAt,
    lat: row.lat === null ? undefined : row.lat,
    lon: row.lon === null ? undefined : row.lon,
  };
}

export function placeToRow(p: Place): PlaceRow {
  return {
    id: p.id,
    name: p.name,
    firstVisitedAt: p.firstVisitedAt,
    lat: nullable(p.lat),
    lon: nullable(p.lon),
  };
}

// ─── UnlockedAchievement ─────────────────────────────────────────────────────

export function rowToAchievement(row: AchievementRow): UnlockedAchievement {
  return { id: row.id, unlockedAt: row.unlockedAt };
}

export function achievementToRow(a: UnlockedAchievement): AchievementRow {
  return { id: a.id, unlockedAt: a.unlockedAt };
}

// ─── HeraldShown ─────────────────────────────────────────────────────────────

export function rowToHerald(row: HeraldRow): HeraldShown {
  return {
    routineId: row.routineId,
    stage: row.stage,
    shownAt: row.shownAt,
    snoozedUntil: row.snoozedUntil === null ? undefined : row.snoozedUntil,
  };
}

export function heraldToRow(h: HeraldShown): HeraldRow {
  return {
    id: heraldKey(h.routineId, h.stage),
    routineId: h.routineId,
    stage: h.stage,
    shownAt: h.shownAt,
    snoozedUntil: nullable(h.snoozedUntil),
  };
}

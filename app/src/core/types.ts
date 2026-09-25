// Domain value types. Zero dependencies — this module must never import UI, storage or platform APIs.

export type Millis = number;

export type RoutineKind =
  | 'slotted' // N разів на день, борг не переноситься
  | 'ward' // дає оберіг на X днів
  | 'duty' // обовʼязок раз на N місяців, борг накопичується
  | 'quota' // хоча б N разів за період, без боргу
  | 'spawned'; // породжений іншою подією, живе X годин

export type RoutineGroup = 'daily' | 'rite' | 'journey';

export type QuotaPeriod = 'week' | 'month';

export interface CareRoutine {
  id: string;
  title: string;
  kind: RoutineKind;
  group: RoutineGroup;
  /** XP за одне виконання. Обернено пропорційне частоті — див. спеку §8.3. */
  xp: number;
  enabled: boolean;
  icon: string;
  /** slotted */
  perDay?: number;
  /** ward: тривалість оберега в днях */
  wardDays?: number;
  /** duty: періодичність у місяцях */
  everyMonths?: number;
  /** quota */
  quotaCount?: number;
  quotaPeriod?: QuotaPeriod;
  /** spawned */
  spawnedBy?: string;
  spawnWindowHours?: number;
  /** duty: дублювати в системний календар */
  calendarBackup?: boolean;
  /** довільний опис для листа персонажа */
  hint?: string;
}

export type EventSource = 'manual' | 'auto';

/** Незмінний факт. Ніколи не редагується після запису — лише видаляється. */
export interface CareEvent {
  id: string;
  routineId: string;
  occurredAt: Millis;
  recordedAt: Millis;
  source: EventSource;
  weightKg?: number;
  note?: string;
  placeId?: string;
}

export interface Dog {
  id: string;
  name: string;
  bornAt: Millis;
  breedNote: string;
  targetWeightMin: number;
  targetWeightMax: number;
  /** ключ позиції -> шлях до спрайта */
  sprites: Partial<Record<SpritePose, string>>;
  /** акцентні кольори, витягнуті з фото */
  palette: string[];
}

export type SpritePose = 'stand' | 'sit' | 'lie' | 'run' | 'portrait';

export interface Place {
  id: string;
  name: string;
  firstVisitedAt: Millis;
  lat?: number;
  lon?: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: Millis;
}

export interface HeraldShown {
  routineId: string;
  stage: string;
  shownAt: Millis;
  /** «нагадай за 3 дні» — до цього моменту герольд мовчить про цей розклад */
  snoozedUntil?: Millis;
}

// ─── Обчислюваний стан ────────────────────────────────────────────────────────

export type QuestStatus =
  | 'idle' // можна зробити, нічого не горить
  | 'done' // на сьогодні / на період закрито
  | 'dueSoon' // скоро
  | 'overdue' // прострочено
  | 'expired' // оберіг згас
  | 'unknown'; // журнал нічого про це не знає — не борг і не провина

export interface QuestView {
  routine: CareRoutine;
  status: QuestStatus;
  /** slotted: скільки з perDay зроблено сьогодні */
  doneToday?: number;
  /** quota: скільки з quotaCount за поточний період */
  periodDone?: number;
  periodTarget?: number;
  periodEndsAt?: Millis;
  /** duty / ward: коли настає або настав термін */
  dueAt?: Millis;
  overdueDays?: number;
  /** ward */
  wardExpiresAt?: Millis;
  wardDaysLeft?: number;
  /** spawned */
  spawnExpiresAt?: Millis;
  lastDoneAt?: Millis;
  xp: number;
}

export interface Ward {
  routineId: string;
  title: string;
  icon: string;
  startedAt: Millis;
  expiresAt: Millis;
  active: boolean;
  daysLeft: number;
}

export interface Stats {
  vitality: number;
  stamina: number;
  coat: number;
  bond: number;
}

export interface AchievementView {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: Millis;
  progress: number; // 0..1
  progressLabel: string;
}

export interface ComputedState {
  now: Millis;
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  stats: Stats;
  wards: Ward[];
  quests: QuestView[];
  /** породжені квести, що ще живі */
  spawned: QuestView[];
  achievements: AchievementView[];
  /** трофеї, які щойно виконались і ще не записані в UnlockedAchievement */
  newlyUnlocked: string[];
  ageLabel: string;
  lastWeightKg?: number;
  lastWeightAt?: Millis;
  weightInRange?: boolean;
  placesCount: number;
  journeysCount: number;
  daysSinceLastEvent?: number;
}

export interface EngineInput {
  dog: Dog;
  routines: CareRoutine[];
  events: CareEvent[];
  places: Place[];
  unlocked: UnlockedAchievement[];
  now: Millis;
}

// ─── Герольд ─────────────────────────────────────────────────────────────────

export type HeraldActionKind =
  | 'markDone' // «вже звершено» — відкриває дописування датою
  | 'snooze3d'
  | 'calendar' // кинути в системний календар
  | 'dismiss';

export interface HeraldAction {
  kind: HeraldActionKind;
  label: string;
}

export interface HeraldItem {
  routineId: string;
  /** стабільний ключ стадії; повторний показ тієї самої стадії заборонений */
  stage: string;
  title: string;
  /** голос світу — хроніка бестіарію */
  body: string;
  priority: number;
  actions: HeraldAction[];
}

// ─── Нотифікації ─────────────────────────────────────────────────────────────

export interface NotificationRequest {
  id: string;
  title: string;
  body: string;
  fireAt: Millis;
  /** квест, який підняв виття — для кнопки «Звершено» з локскріна */
  routineId?: string;
}

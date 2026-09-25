/**
 * Фікстура для рендера екранів в ізоляції. Не використовується в продакшн-збірці —
 * жодний екран її не імпортує, вона імпортує їх.
 */

import { BALU, DEFAULT_ROUTINES, XP_PER_LEVEL } from '@/core/catalog';
import type {
  AchievementView,
  CareRoutine,
  ComputedState,
  Dog,
  HeraldItem,
  Place,
  QuestView,
  Ward,
} from '@/core/types';
import type { ChronicleEntry } from '@/ui/components/types';

const DAY = 86_400_000;
export const MOCK_NOW = Date.UTC(2026, 8, 25, 20, 30);

function routine(id: string): CareRoutine {
  const r = DEFAULT_ROUTINES.find((x) => x.id === id);
  if (r == null) throw new Error(`фікстура посилається на невідомий розклад: ${id}`);
  return r;
}

const quests: QuestView[] = [
  // щоденні — слоти закриті частково
  { routine: routine('feed'), status: 'idle', doneToday: 1, xp: 20, lastDoneAt: MOCK_NOW - 9 * 3_600_000 },
  { routine: routine('patrol'), status: 'idle', doneToday: 2, xp: 30, lastDoneAt: MOCK_NOW - 4 * 3_600_000 },
  {
    routine: routine('run'),
    status: 'done',
    periodDone: 2,
    periodTarget: 2,
    periodEndsAt: MOCK_NOW + 2 * DAY,
    xp: 100,
  },
  {
    routine: routine('fangs'),
    status: 'idle',
    periodDone: 2,
    periodTarget: 3,
    periodEndsAt: MOCK_NOW + 2 * DAY,
    xp: 40,
  },

  // обряди — один прострочений, один оберіг на межі
  {
    routine: routine('healer'),
    status: 'overdue',
    dueAt: MOCK_NOW - 12 * DAY,
    overdueDays: 12,
    lastDoneAt: MOCK_NOW - 195 * DAY,
    xp: 4000,
  },
  {
    routine: routine('fleas'),
    status: 'dueSoon',
    wardExpiresAt: MOCK_NOW + 3 * DAY,
    wardDaysLeft: 3,
    lastDoneAt: MOCK_NOW - 27 * DAY,
    xp: 1200,
  },
  {
    routine: routine('worms'),
    status: 'idle',
    wardExpiresAt: MOCK_NOW + 54 * DAY,
    wardDaysLeft: 54,
    lastDoneAt: MOCK_NOW - 36 * DAY,
    xp: 2000,
  },
  {
    routine: routine('weigh'),
    status: 'dueSoon',
    dueAt: MOCK_NOW + 6 * DAY,
    lastDoneAt: MOCK_NOW - 24 * DAY,
    xp: 600,
  },
  { routine: routine('claws'), status: 'idle', dueAt: MOCK_NOW + 19 * DAY, xp: 400 },
  { routine: routine('vaccine'), status: 'idle', dueAt: MOCK_NOW + 210 * DAY, xp: 6000 },

  // походи
  {
    routine: routine('forest'),
    status: 'idle',
    periodDone: 0,
    periodTarget: 1,
    periodEndsAt: MOCK_NOW + 5 * DAY,
    xp: 2500,
  },
];

const spawned: QuestView[] = [
  {
    routine: routine('tickcheck'),
    status: 'dueSoon',
    spawnExpiresAt: MOCK_NOW + 9 * 3_600_000,
    xp: 400,
  },
];

const wards: Ward[] = [
  {
    routineId: 'fleas',
    title: 'Кліщі',
    icon: 'ward-blood',
    startedAt: MOCK_NOW - 27 * DAY,
    expiresAt: MOCK_NOW + 3 * DAY,
    active: true,
    daysLeft: 3,
  },
  {
    routineId: 'worms',
    title: 'Глисти',
    icon: 'ward-worm',
    startedAt: MOCK_NOW - 36 * DAY,
    expiresAt: MOCK_NOW + 54 * DAY,
    active: true,
    daysLeft: 54,
  },
  {
    routineId: 'healer',
    title: 'Огляд',
    icon: 'healer',
    startedAt: MOCK_NOW - 195 * DAY,
    expiresAt: MOCK_NOW - 12 * DAY,
    active: false,
    daysLeft: 0,
  },
];

const achievements: AchievementView[] = [
  {
    id: 'night-runner',
    title: 'Нічний гонець',
    description: '50 вільних забігів',
    unlocked: true,
    unlockedAt: MOCK_NOW - 40 * DAY,
    progress: 1,
    progressLabel: '50 / 50',
  },
  {
    id: 'cartographer',
    title: 'Картограф',
    description: '10 різних місць',
    unlocked: false,
    progress: 0.7,
    progressLabel: '7 / 10',
  },
  {
    id: 'deep-forest',
    title: 'Глибокий ліс',
    description: '12 походів у ліс',
    unlocked: false,
    progress: 11 / 12,
    progressLabel: '11 / 12',
  },
  {
    id: 'unbroken-shield',
    title: 'Незламний щит',
    description: 'Рік без жодного дня без протипаразитарного оберега',
    unlocked: false,
    progress: 0.93,
    progressLabel: '341 / 365 днів',
  },
  {
    id: 'watchful-eye',
    title: 'Пильне око',
    description: '20 оглядів на кліщів після походу',
    unlocked: false,
    progress: 0.6,
    progressLabel: '12 / 20',
  },
];

export const MOCK_STATE: ComputedState = {
  now: MOCK_NOW,
  totalXp: 19_293,
  level: 128,
  xpIntoLevel: 93,
  xpPerLevel: XP_PER_LEVEL,
  stats: { vitality: 68, stamina: 81, coat: 91, bond: 74 },
  wards,
  quests,
  spawned,
  achievements,
  newlyUnlocked: [],
  ageLabel: '4 роки 8 місяців',
  lastWeightKg: 11.5,
  lastWeightAt: MOCK_NOW - 24 * DAY,
  weightInRange: true,
  placesCount: 7,
  journeysCount: 11,
  daysSinceLastEvent: 0,
};

export const MOCK_DOG: Dog = BALU;

export const MOCK_PLACES: Place[] = [
  { id: 'p1', name: 'Глибокий Ліс', firstVisitedAt: MOCK_NOW - 320 * DAY },
  { id: 'p2', name: 'Поле за греблею', firstVisitedAt: MOCK_NOW - 180 * DAY },
  { id: 'p3', name: 'Стара насип', firstVisitedAt: MOCK_NOW - 42 * DAY },
];

export const MOCK_HERALD: HeraldItem = {
  routineId: 'healer',
  stage: 'overdue-12',
  title: 'Огляд Цілителя',
  body: 'Огляд Цілителя прострочено дванадцять днів.',
  priority: 100,
  actions: [
    { kind: 'calendar', label: 'Записатись до Цілителя' },
    { kind: 'snooze3d', label: 'Нагадай за три дні' },
    { kind: 'markDone', label: 'Вже звершено — записати датою' },
  ],
};

export const MOCK_CHRONICLE: ChronicleEntry[] = [
  {
    id: 'c1',
    routineId: 'patrol',
    title: 'Патруль',
    detail: 'Вечірній обхід',
    occurredAt: MOCK_NOW - 4 * 3_600_000,
    xp: 30,
    kind: 'event',
  },
  {
    id: 'c2',
    routineId: 'feed',
    title: 'Годування',
    occurredAt: MOCK_NOW - 9 * 3_600_000,
    xp: 20,
    kind: 'event',
  },
  {
    id: 'c3',
    routineId: 'forest',
    title: 'Похід у Глибокий Ліс',
    detail: 'Глибокий Ліс',
    occurredAt: MOCK_NOW - DAY - 6 * 3_600_000,
    xp: 2500,
    kind: 'event',
  },
  {
    id: 'c4',
    routineId: 'tickcheck',
    title: 'Огляд на кліщів',
    occurredAt: MOCK_NOW - DAY - 2 * 3_600_000,
    xp: 400,
    backdated: true,
    kind: 'event',
  },
  {
    id: 'c5',
    title: 'Оберіг від кровопивць згас',
    detail: 'Захист не поновлено',
    occurredAt: MOCK_NOW - 12 * DAY,
    kind: 'ward',
  },
  {
    id: 'c6',
    title: 'Трофей: Нічний гонець',
    detail: '50 вільних забігів',
    occurredAt: MOCK_NOW - 40 * DAY,
    kind: 'unlock',
  },
];

export const MOCK_CHRONICLE_LINE = 'Огляд Цілителя прострочено дванадцять днів.';
export const MOCK_YEAR_DAY = 'РІК I · ДЕНЬ 47';
export const MOCK_YEAR_XP = 19_293;
export const MOCK_HERALD_META = 'ОСТАННІЙ ОГЛЯД — 12 БЕРЕЗНЯ · +4000 XP';

export const MOCK_ROUTINES: CareRoutine[] = DEFAULT_ROUTINES;

// ─── день перший ─────────────────────────────────────────────────────────────

/**
 * Статус «не записано» долітає з core окремою гілкою. Фікстура не мусить її чекати,
 * тому звужуємо рядок вручну — код лишається збірним в обох випадках.
 */
const UNKNOWN = 'unknown' as unknown as QuestView['status'];

/**
 * Свіжа установка: жодної події в журналі. Проба на головне — день перший
 * не має бути стіною червоного. Ніде не мусить з'явитись «прострочено 0 днів».
 */
export const FRESH_STATE: ComputedState = {
  now: MOCK_NOW,
  totalXp: 0,
  level: 1,
  xpIntoLevel: 0,
  xpPerLevel: XP_PER_LEVEL,
  stats: { vitality: 0, stamina: 0, coat: 0, bond: 0 },
  wards: [],
  quests: DEFAULT_ROUTINES.filter((r) => r.kind !== 'spawned').map((r) => {
    const known = r.kind === 'slotted' || r.kind === 'quota';
    return {
      routine: r,
      status: known ? 'idle' : UNKNOWN,
      doneToday: r.kind === 'slotted' ? 0 : undefined,
      periodDone: r.kind === 'quota' ? 0 : undefined,
      periodTarget: r.kind === 'quota' ? r.quotaCount : undefined,
      periodEndsAt: r.kind === 'quota' ? MOCK_NOW + 5 * DAY : undefined,
      xp: r.xp,
    };
  }),
  spawned: [],
  achievements: achievements.map((a) => ({
    ...a,
    unlocked: false,
    unlockedAt: undefined,
    progress: 0,
    progressLabel: '0',
  })),
  newlyUnlocked: [],
  ageLabel: '4 роки 8 місяців',
  placesCount: 0,
  journeysCount: 0,
};

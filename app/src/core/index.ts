// Публічний API доменного двигуна. Нічого звідси не імпортує UI-логіку, і навпаки — це головна межа в проєкті.

export * from './types';
export { DEFAULT_ROUTINES, BALU, XP_PER_LEVEL, MAX_LEVEL } from './catalog';
export {
  HOUR_MS,
  DAY_MS,
  startOfDay,
  endOfDay,
  addDays,
  addHours,
  addMonths,
  addYears,
  dayKey,
  weekStart,
  monthStart,
  nextWeekStart,
  nextMonthStart,
  diffDays,
  sameDay,
  monthsBetween,
} from './time';
export { computeWards, wardHorizon, anyWardActiveOn, lastEventFor } from './wards';
export type { WardHorizon } from './wards';
export {
  appStartOf,
  buildQuests,
  buildSpawned,
  canLogEvent,
  quotaPeriodBounds,
  spawnWindow,
  WARD_DUE_SOON_DAYS,
  DUTY_DUE_SOON_DAYS,
} from './quests';
export type { LogRejection } from './quests';
export { computeStats, vitality, stamina, coat, bond } from './stats';
export { computeXp, levelFor, totalXpOf } from './xp';
export type { LevelInfo } from './xp';
export {
  ACHIEVEMENTS,
  computeAchievements,
  longestWardStreakDays,
  longestInRangeWeighStreak,
  birthdaysInApp,
} from './achievements';
export type { AchievementDef, AchievementContext, AchievementResult } from './achievements';
export { compute, ageLabel, pluralUk } from './engine';
export { heraldQueue, stageFor, numWord, daysWord } from './herald';
export type { HeraldInput, HeraldStage } from './herald';
export {
  desiredNotifications,
  HOWL_TITLE,
  SILENCE_DAYS,
  MAX_SILENCE_NOTIFICATIONS,
  WARD_HORIZON_DAYS,
  DUTY_HORIZON_DAYS,
} from './notifications';
export type { NotificationInput } from './notifications';

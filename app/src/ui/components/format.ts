/** Форматування українською. Чисті функції — викликаються з useMemo, не з тіла рендера. */

import type { Millis, QuestStatus, QuestView } from '@/core/types';

const DAY = 86_400_000;

export const MONTHS_GEN = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня',
] as const;

export const MONTHS_NOM = [
  'СІЧЕНЬ',
  'ЛЮТИЙ',
  'БЕРЕЗЕНЬ',
  'КВІТЕНЬ',
  'ТРАВЕНЬ',
  'ЧЕРВЕНЬ',
  'ЛИПЕНЬ',
  'СЕРПЕНЬ',
  'ВЕРЕСЕНЬ',
  'ЖОВТЕНЬ',
  'ЛИСТОПАД',
  'ГРУДЕНЬ',
] as const;

export const WEEKDAYS_SHORT = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'] as const;

/** one / few / many */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export const days = (n: number): string => plural(n, ['день', 'дні', 'днів']);
export const hours = (n: number): string => plural(n, ['година', 'години', 'годин']);
export const times = (n: number): string => plural(n, ['раз', 'рази', 'разів']);

/** Локальна північ — межа доби для групування хроніки. */
export function startOfDay(ms: Millis): Millis {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function daysBetween(from: Millis, to: Millis): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY);
}

export function formatDate(ms: Millis): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function formatDayHeading(dayStart: Millis, now: Millis): string {
  const diff = daysBetween(dayStart, now);
  if (diff === 0) return 'СЬОГОДНІ';
  if (diff === 1) return 'УЧОРА';
  if (diff === 2) return 'ПОЗАВЧОРА';
  const d = new Date(dayStart);
  const nowYear = new Date(now).getFullYear();
  const tail = d.getFullYear() === nowYear ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()].toUpperCase()}${tail}`;
}

export function formatTime(ms: Millis): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatXp(xp: number): string {
  // Без Intl — Hermes не всюди його має.
  return String(Math.round(xp)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

/** Українська кома як десятковий роздільник — єдина форма ваги в усьому шарі UI. */
export function formatWeight(kg: number): string {
  return `${formatKg(kg)} кг`;
}

/** Число без одиниці — для полів вводу й діапазонів. */
export function formatKg(kg: number): string {
  return kg.toFixed(1).replace('.', ',');
}

export function formatWeightRange(min: number, max: number): string {
  return `${formatKg(min)}–${formatKg(max)} кг`;
}

/** «не записано» долітає з core окремою гілкою — порівнюємо через string, щоб збиралось і без неї. */
export function isUnknownStatus(status: QuestStatus): boolean {
  return (status as string) === 'unknown';
}

const PERIOD_LABEL = { week: 'ЦЬОГО ТИЖНЯ', month: 'ЦЬОГО МІСЯЦЯ' } as const;

/**
 * Підпис під назвою квесту. Голос механічний: стан, а не докір.
 */
export function questSubtitle(q: QuestView, now: Millis): string {
  const r = q.routine;
  // ніколи не рахуємо борг від невідомої дати — «прострочено 0 днів» це брехня, а не стан
  if (isUnknownStatus(q.status)) return 'НЕ ЗАПИСАНО';
  switch (r.kind) {
    case 'slotted': {
      const done = q.doneToday ?? 0;
      return `${done} / ${r.perDay ?? 1} СЬОГОДНІ`;
    }
    case 'quota': {
      const period = PERIOD_LABEL[r.quotaPeriod ?? 'week'];
      return `${q.periodDone ?? 0} / ${q.periodTarget ?? r.quotaCount ?? 1} ${period}`;
    }
    case 'ward': {
      if (q.status === 'expired') return 'ОБЕРІГ ЗГАС';
      const left = q.wardDaysLeft ?? 0;
      if (left <= 0) return 'ОБЕРІГ ГАСНЕ СЬОГОДНІ';
      return `ЧИННИЙ ЩЕ ${left} ${days(left).toUpperCase()}`;
    }
    case 'duty': {
      if (q.status === 'overdue') {
        const n = q.overdueDays ?? 0;
        return `ПРОСТРОЧЕНО ${n} ${days(n).toUpperCase()}`;
      }
      if (q.dueAt == null) return 'ТЕРМІН НЕ ВИЗНАЧЕНО';
      const n = Math.max(0, daysBetween(now, q.dueAt));
      return n === 0 ? 'СЬОГОДНІ' : `ЧЕРЕЗ ${n} ${days(n).toUpperCase()}`;
    }
    case 'spawned': {
      if (q.spawnExpiresAt == null) return 'ПОРОДЖЕНИЙ КВЕСТ';
      const h = Math.max(0, Math.ceil((q.spawnExpiresAt - now) / 3_600_000));
      return `ЩЕ ${h} ${hours(h).toUpperCase()}`;
    }
    default:
      return '';
  }
}

/**
 * Відмова записати подію. Реєстр механічний: констатуємо правило, не вибачаємось (§2, §13).
 * Ключі збігаються з `reason` із `canLogEvent`.
 */
export const REFUSAL_TEXT: Record<string, string> = {
  slotFull: 'Слоти на сьогодні закриті',
  quotaFull: 'Квоту на період вибрано',
  future: 'Майбутня дата не приймається',
  disabled: 'Розклад вимкнено',
  expired: 'Вікно квесту зачинилось',
  unknownRoutine: 'Розкладу не знайдено',
};

export function refusalText(reason: string): string {
  return REFUSAL_TEXT[reason] ?? 'Запис відхилено';
}

export function wardStatusLabel(daysLeft: number, active: boolean): string {
  if (!active) return 'ЗГАС';
  if (daysLeft <= 0) return 'СЬОГОДНІ';
  return `${daysLeft}д`;
}

// Герольд — діалог при вході. Голос світу: суха хроніка реєстру бестіарію, ніколи не докір. Спека §9.

import type { HeraldAction, HeraldItem, HeraldShown, Millis, QuestView } from './types';
import { addDays, dayKey, diffDays } from './time';
import { pluralUk } from './engine';

const NUM_WORDS = ['нуль', 'один', 'два', 'три', 'чотири', 'пʼять', 'шість', 'сім', 'вісім', 'девʼять', 'десять'];

export function numWord(n: number): string {
  return n >= 0 && n <= 10 ? NUM_WORDS[n] : String(n);
}

export function daysWord(n: number): string {
  return `${numWord(n)} ${pluralUk(n, ['день', 'дні', 'днів'])}`;
}

export interface HeraldStage {
  stage: string;
  priority: number;
  body: string;
}

function quoted(title: string): string {
  return `«${title}»`;
}

/** Нижче за будь-яке справжнє прострочення (300+) і за «скоро» (150+), але вище за квоту. */
export const UNKNOWN_PRIORITY = 120;

/** Журнал мовчить — світ питає, а не дорікає. Дія одна: записати датою. */
function unknownStage(q: QuestView): HeraldStage | undefined {
  const title = quoted(q.routine.title);
  if (q.routine.kind === 'ward') {
    return { stage: 'ward:unknown', priority: UNKNOWN_PRIORITY, body: `Коли востаннє викувано оберіг ${title} — у реєстрі не записано.` };
  }
  if (q.routine.kind === 'duty') {
    return { stage: 'duty:unknown', priority: UNKNOWN_PRIORITY, body: `Коли востаннє звершено обряд ${title} — у реєстрі не записано.` };
  }
  return undefined;
}

function wardStage(q: QuestView, now: Millis): HeraldStage | undefined {
  const title = quoted(q.routine.title);
  if (q.wardExpiresAt === undefined) return undefined;
  const left = diffDays(now, q.wardExpiresAt);
  if (left < 0) {
    const over = -left;
    const body =
      over === 1
        ? `Оберіг ${title} згас учора. Захисту немає.`
        : `Оберіг ${title} згас ${daysWord(over)} тому. Захисту немає.`;
    const priority = 300 + Math.min(over, 99);
    if (over === 1) return { stage: 'ward:over:1', priority, body };
    if (over >= 7) return { stage: `ward:over:${Math.floor(over / 7) * 7}`, priority, body };
    return { stage: 'ward:over:1', priority, body };
  }
  if (left === 0) return { stage: 'ward:day0', priority: 290, body: `Оберіг ${title} гасне сьогодні.` };
  if (left <= 3) return { stage: 'ward:pre3', priority: 200 + (10 - left), body: `Оберіг ${title} згасне через ${daysWord(left)}.` };
  if (left <= 7) return { stage: 'ward:pre7', priority: 200 + (10 - left), body: `Оберіг ${title} згасне через ${daysWord(left)}.` };
  return undefined;
}

function dutyStage(q: QuestView, now: Millis): HeraldStage | undefined {
  if (q.dueAt === undefined) return undefined;
  const title = quoted(q.routine.title);
  const until = diffDays(now, q.dueAt);
  if (until > 0) {
    const body = `Термін обряду ${title} настане через ${daysWord(until)}.`;
    // Попередження мусить бути коротшим за пів періоду, інакше щомісячний обовʼязок
    // піднімає герольда «через 30 днів» у мить, коли його щойно звершили.
    const periodDays = (q.routine.everyMonths ?? 0) * 30;
    const lead = (d: number) => periodDays === 0 || d < periodDays / 2;
    if (until <= 3 && lead(3)) return { stage: 'duty:pre3', priority: 150 + (31 - until), body };
    if (until <= 14 && lead(14)) return { stage: 'duty:pre14', priority: 150 + (31 - until), body };
    if (until <= 30 && lead(30)) return { stage: 'duty:pre30', priority: 150 + (31 - until), body };
    return undefined;
  }
  const over = -until;
  const body = over === 0 ? `Термін обряду ${title} настав.` : `Обряд ${title} прострочено ${daysWord(over)}.`;
  const priority = 300 + Math.min(over, 99);
  if (over < 14) return { stage: 'duty:day0', priority, body };
  return { stage: `duty:over:${Math.floor(over / 14) * 14}`, priority, body };
}

function quotaStage(q: QuestView, now: Millis): HeraldStage | undefined {
  if (q.periodEndsAt === undefined) return undefined;
  if ((q.periodDone ?? 0) > 0) return undefined;
  const lastDay = addDays(q.periodEndsAt, -1);
  const toEnd = diffDays(now, lastDay);
  if (toEnd < 0 || toEnd > 4) return undefined; // рівно 5 днів разом із сьогоднішнім — спека §9
  return {
    stage: `quota:end5:${dayKey(q.periodEndsAt)}`,
    priority: 100,
    body: `У реєстрі ${quoted(q.routine.title)} за цей період: 0 з ${q.periodTarget ?? 1}. Період добігає кінця.`,
  };
}

export function stageFor(q: QuestView, now: Millis): HeraldStage | undefined {
  if (q.status === 'unknown') return unknownStage(q);
  switch (q.routine.kind) {
    case 'ward':
      return wardStage(q, now);
    case 'duty':
      return dutyStage(q, now);
    case 'quota':
      return quotaStage(q, now);
    default:
      return undefined; // слотовий і породжений живуть на дошці квестів, герольда не піднімають
  }
}

function actionsFor(q: QuestView): HeraldAction[] {
  if (q.status === 'unknown') {
    // Сенс стадії — запросити дописати минулим числом, а не записатись на новий прийом.
    return [
      { kind: 'markDone', label: 'Вже звершено — записати датою' },
      { kind: 'snooze3d', label: 'Нагадай за три дні' },
      { kind: 'dismiss', label: 'Не пригадаю' },
    ];
  }
  if (q.routine.kind === 'quota') {
    return [
      { kind: 'markDone', label: 'Звершено — записати датою' },
      { kind: 'snooze3d', label: 'Нагадай за три дні' },
      { kind: 'dismiss', label: 'Не цього разу' },
    ];
  }
  const third: HeraldAction = q.routine.calendarBackup
    ? { kind: 'calendar', label: 'Записатись до Цілителя' }
    : { kind: 'dismiss', label: 'Прийняв до відома' };
  return [
    { kind: 'markDone', label: 'Вже звершено — записати датою' },
    { kind: 'snooze3d', label: 'Нагадай за три дні' },
    third,
  ];
}

export interface HeraldInput {
  now: Millis;
  quests: QuestView[];
}

/** Черга за пріоритетом: прострочене → скоро згасне → квота. Показати можна лише перший. */
export function heraldQueue(input: HeraldInput, shown: HeraldShown[]): HeraldItem[] {
  const { now, quests } = input;
  // Вигорілий снуз перестає бути «вже показано», інакше «нагадай за три дні» глушило б стадію назавжди.
  const seen = new Set(
    shown
      .filter((s) => s.snoozedUntil === undefined || s.snoozedUntil > now)
      .map((s) => `${s.routineId}|${s.stage}`),
  );
  const snoozed = new Set(
    shown.filter((s) => s.snoozedUntil !== undefined && s.snoozedUntil > now).map((s) => s.routineId),
  );

  const items: HeraldItem[] = [];
  for (const q of quests) {
    if (!q.routine.enabled) continue;
    if (snoozed.has(q.routine.id)) continue;
    const st = stageFor(q, now);
    if (!st) continue;
    if (seen.has(`${q.routine.id}|${st.stage}`)) continue;
    items.push({
      routineId: q.routine.id,
      stage: st.stage,
      title: q.routine.title,
      body: st.body,
      priority: st.priority,
      actions: actionsFor(q),
    });
  }
  return items.sort((a, b) => b.priority - a.priority || (a.routineId < b.routineId ? -1 : 1));
}

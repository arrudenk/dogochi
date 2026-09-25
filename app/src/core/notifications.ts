// Детектор тишини. Щоденних пушів немає взагалі — пуш це сигнал, що герольд не спрацював. Спека §10.

import type { Millis, NotificationRequest, QuestView } from './types';
import { addDays, diffDays } from './time';
import { daysWord } from './herald';

export const SILENCE_DAYS = 3;
export const WARD_HORIZON_DAYS = 7;
export const DUTY_HORIZON_DAYS = 14;
/** Розклад виття при тиші, у днях від «зараз». Спека §10. */
export const SILENCE_OFFSET_DAYS: readonly number[] = [3, 6, 10];
/** iOS тримає 64 запланованих; детектор тишини займає рівно стільки слотів, скільки має зсувів (≤4). */
export const MAX_SILENCE_NOTIFICATIONS = SILENCE_OFFSET_DAYS.length;

export const HOWL_TITLE = 'АУУУУУУ';

interface Pending {
  quest: QuestView;
  urgency: number;
  subject: string;
}

function pendingFor(q: QuestView, now: Millis): Pending | undefined {
  const title = `«${q.routine.title}»`;
  if (q.status === 'unknown') return undefined; // невідоме не є боргом — вити нема про що
  if (q.routine.kind === 'ward') {
    if (q.wardExpiresAt === undefined) return undefined;
    const left = diffDays(now, q.wardExpiresAt);
    if (left < 0) return { quest: q, urgency: 500 + Math.min(-left, 99), subject: `Оберіг ${title} згас` };
    if (left <= WARD_HORIZON_DAYS) {
      return { quest: q, urgency: 400 - left, subject: `Оберіг ${title} згасне через ${daysWord(left)}` };
    }
    return undefined;
  }
  if (q.routine.kind === 'duty') {
    if (q.dueAt === undefined) return undefined;
    const until = diffDays(now, q.dueAt);
    if (until <= 0) {
      const over = -until;
      return {
        quest: q,
        urgency: 500 + Math.min(over, 99),
        subject: over === 0 ? `Термін обряду ${title} настав` : `Обряд ${title} прострочено ${daysWord(over)}`,
      };
    }
    if (until <= DUTY_HORIZON_DAYS) {
      return { quest: q, urgency: 300 - until, subject: `Термін обряду ${title} настане через ${daysWord(until)}` };
    }
    return undefined;
  }
  return undefined;
}

export interface NotificationInput {
  now: Millis;
  quests: QuestView[];
  /** Коли апку востаннє відкривали. Відкриття скасовує чергу. */
  lastOpenedAt: Millis;
}

export function desiredNotifications(input: NotificationInput): NotificationRequest[] {
  const { now, quests, lastOpenedAt } = input;
  if (diffDays(lastOpenedAt, now) < SILENCE_DAYS) return [];

  const pending: Pending[] = [];
  for (const q of quests) {
    if (!q.routine.enabled) continue;
    const p = pendingFor(q, now);
    if (p) pending.push(p);
  }
  if (pending.length === 0) return [];
  pending.sort((a, b) => b.urgency - a.urgency || (a.quest.routine.id < b.quest.routine.id ? -1 : 1));

  const driver = pending[0];
  const rest = pending.length - 1;
  const tail = rest > 0 ? ` І ще ${rest} у реєстрі.` : '';
  const body = `${driver.subject}. Я тебе гукаю.${tail}`;

  return SILENCE_OFFSET_DAYS.map((d) => ({
    id: `howl-${d}d`,
    title: HOWL_TITLE,
    body,
    fireAt: addDays(now, d),
    routineId: driver.quest.routine.id,
  }));
}

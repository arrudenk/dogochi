import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

/**
 * Страховка для рідкісних обрядів: справжня подія в системному календарі переживає
 * перевстановлення апки й потрапляє в те, як власник реально планує тиждень.
 */

/**
 * Календар — бонус, не носій правди (§13). Якщо модуля немає взагалі (Expo Go,
 * інша платформа), це має виглядати як «дозволу немає», а не як помилка апки.
 */
export async function requestCalendarPermission(): Promise<boolean> {
  try {
    const res = await Calendar.requestCalendarPermissions(true);
    return res.granted;
  } catch {
    return false;
  }
}

export async function hasCalendarPermission(): Promise<boolean> {
  try {
    return (await Calendar.getCalendarPermissions(true)).granted;
  } catch {
    return false;
  }
}

async function writableCalendar(): Promise<Calendar.ExpoCalendar | null> {
  if (Platform.OS === 'ios') {
    try {
      return Calendar.getDefaultCalendarSync();
    } catch {
      // iOS 17 write-only access не завжди віддає дефолтний — падаємо в загальний пошук.
    }
  }
  const all = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  return (
    all.find((c) => c.allowsModifications && c.isPrimary) ??
    all.find((c) => c.allowsModifications) ??
    null
  );
}

export interface CalendarBackupInput {
  title: string;
  dueAt: number;
  notes: string;
  /** ідентифікатор попередньої події — оновлюємо, а не дублюємо */
  existingEventId?: string;
}

/** Повертає id події або null, якщо дозволу немає — тоді страховка тихо вимикається. */
export async function upsertCalendarBackup(input: CalendarBackupInput): Promise<string | null> {
  if (!(await hasCalendarPermission())) return null;

  const start = new Date(input.dueAt);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const details = {
    title: input.title,
    startDate: start,
    endDate: end,
    allDay: true,
    notes: input.notes,
    alarms: [{ relativeOffset: -7 * 24 * 60 }],
  };

  try {
    if (input.existingEventId) {
      try {
        const existing = await Calendar.ExpoCalendarEvent.get(input.existingEventId);
        await existing.update(details);
        return input.existingEventId;
      } catch {
        // подію видалили в календарі — створюємо заново
      }
    }

    const cal = await writableCalendar();
    if (!cal) return null;
    const created = await cal.createEvent(details);
    return created.id;
  } catch {
    return null; // календар недоступний — страховка тихо вимикається
  }
}

export async function removeCalendarBackup(eventId: string): Promise<void> {
  try {
    const existing = await Calendar.ExpoCalendarEvent.get(eventId);
    await existing.delete();
  } catch {
    // вже немає — нічого робити
  }
}

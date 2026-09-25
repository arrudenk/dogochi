import type { CareRoutine, ComputedState } from '@/core/types';
import * as store from '@/store';
import { hasCalendarPermission, upsertCalendarBackup } from './calendarAdapter';

/**
 * Страховка тільки для рідкісних обрядів (огляд, вакцинація). Без дозволу — тиха бездія,
 * бо календар це бонус, а не носій правди.
 */
export async function syncCalendarBackups(
  state: ComputedState,
  routines: CareRoutine[],
): Promise<void> {
  if (!(await hasCalendarPermission())) return;

  const backed = routines.filter((r) => r.calendarBackup && r.enabled);
  if (backed.length === 0) return;

  const existing = await store.getRoutineCalendarEventIds();

  for (const routine of backed) {
    const quest = state.quests.find((q) => q.routine.id === routine.id);
    if (!quest?.dueAt) continue;
    const id = await upsertCalendarBackup({
      title: routine.title,
      dueAt: quest.dueAt,
      notes: 'dogochi — страховка на випадок, якщо апку перевстановлять.',
      existingEventId: existing[routine.id],
    });
    if (id && id !== existing[routine.id]) await store.setRoutineCalendarEventId(routine.id, id);
  }
}

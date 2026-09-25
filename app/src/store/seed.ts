// Перший запуск: каталог за замовчуванням і Балу. Далі це звичайні редаговані дані.

import { BALU, DEFAULT_ROUTINES } from '../core/catalog';
import { getDb } from './db';
import { dogToRow } from './mapping';
import { upsertRoutineOn } from './repo';

export interface SeedResult {
  seededDog: boolean;
  seededRoutines: number;
}

/** Ідемпотентно: сідить лише порожні таблиці, тому видалений користувачем розклад не воскресає. */
export async function seedIfNeeded(): Promise<SeedResult> {
  const db = await getDb();

  const dogCount = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM dog');
  const routineCount = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM care_routine');

  const needDog = (dogCount?.n ?? 0) === 0;
  const needRoutines = (routineCount?.n ?? 0) === 0;
  if (!needDog && !needRoutines) return { seededDog: false, seededRoutines: 0 };

  await db.withTransactionAsync(async () => {
    if (needDog) {
      const r = dogToRow(BALU);
      await db.runAsync(
        `INSERT OR IGNORE INTO dog (id, name, bornAt, breedNote, targetWeightMin, targetWeightMax, sprites, palette)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.name, r.bornAt, r.breedNote, r.targetWeightMin, r.targetWeightMax, r.sprites, r.palette],
      );
    }
    if (needRoutines) {
      for (const routine of DEFAULT_ROUTINES) await upsertRoutineOn(db, routine);
    }
  });

  return { seededDog: needDog, seededRoutines: needRoutines ? DEFAULT_ROUTINES.length : 0 };
}

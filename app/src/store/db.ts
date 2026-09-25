// Єдина точка відкриття бази. Усе async — головний потік нічим не блокуємо.

import * as SQLite from 'expo-sqlite';

import { runMigrations } from './schema';

export const DB_NAME = 'dogochi.db';

let handle: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // WAL: запис події не блокує читання для перерахунку стану.
  await db.execAsync('PRAGMA journal_mode = WAL');
  await runMigrations(db);
  return db;
}

/** Ліниве відкриття з кешем промісу: паралельні виклики отримують одне зʼєднання, а не гонку міграцій. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!handle) handle = open();
  return handle;
}

export async function closeDb(): Promise<void> {
  if (!handle) return;
  const db = await handle;
  handle = null;
  await db.closeAsync();
}

export type Db = SQLite.SQLiteDatabase;

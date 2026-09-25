// Календарна арифметика в локальному часі. Жодного звернення до поточного часу — `now` завжди аргумент.

import type { Millis } from './types';

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function startOfDay(t: Millis): Millis {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(t: Millis): Millis {
  const d = new Date(t);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function addDays(t: Millis, n: number): Millis {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function addHours(t: Millis, n: number): Millis {
  return t + n * HOUR_MS;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function addMonths(t: Millis, n: number): Millis {
  const d = new Date(t);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
  return d.getTime();
}

export function addYears(t: Millis, n: number): Millis {
  return addMonths(t, n * 12);
}

export function dayKey(t: Millis): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Тиждень починається з понеділка. */
export function weekStart(t: Millis): Millis {
  const d = new Date(startOfDay(t));
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d.getTime();
}

export function monthStart(t: Millis): Millis {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

export function nextWeekStart(t: Millis): Millis {
  return addDays(weekStart(t), 7);
}

export function nextMonthStart(t: Millis): Millis {
  return addMonths(monthStart(t), 1);
}

/** Цілі календарні дні від `a` до `b`; додатне — `b` пізніше. Round гасить зсув переходу на літній час. */
export function diffDays(a: Millis, b: Millis): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}

export function sameDay(a: Millis, b: Millis): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** Повні місяці й залишок днів між двома моментами. */
export function monthsBetween(from: Millis, to: Millis): number {
  const a = new Date(from);
  const b = new Date(to);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return Math.max(0, months);
}

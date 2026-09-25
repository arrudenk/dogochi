import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  compute,
  heraldQueue,
  desiredNotifications,
  canLogEvent,
  SILENCE_DAYS,
  DAY_MS,
} from '@/core';
import type {
  CareEvent,
  CareRoutine,
  ComputedState,
  Dog,
  HeraldItem,
  HeraldShown,
  Place,
  SpritePose,
  UnlockedAchievement,
} from '@/core/types';
import * as store from '@/store';
import {
  prepareNotificationChannel,
  syncNotifications,
  cancelAllOurNotifications,
  routineIdFromResponse,
} from './notificationAdapter';
import { syncCalendarBackups } from './calendarSync';
import { requestCalendarPermission, upsertCalendarBackup } from './calendarAdapter';

interface Snapshot {
  dog: Dog;
  routines: CareRoutine[];
  events: CareEvent[];
  places: Place[];
  unlocked: UnlockedAchievement[];
  heraldShown: HeraldShown[];
}

export interface RiteSpectacle {
  routineId: string;
  title: string;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  wardExpiresAt?: number;
  statsBefore: ComputedState['stats'];
  statsAfter: ComputedState['stats'];
}

interface AppStoreValue {
  ready: boolean;
  onboardingDone: boolean;
  state: ComputedState | null;
  dog: Dog | null;
  routines: CareRoutine[];
  events: CareEvent[];
  places: Place[];
  herald: HeraldItem | null;
  spectacle: RiteSpectacle | null;
  /** фатальна помилка старту — апка не має мовчки крутити спінер */
  fatal: string | null;
  /** одноразове механічне повідомлення: відмова, ліміт слотів */
  notice: string | null;
  clearNotice: () => void;
  /** «Записатись до Цілителя» — реальний запис у системний календар */
  bookCalendar: (routineId: string) => Promise<boolean>;
  rerunRitual: () => void;
  complete: (routineId: string, occurredAt?: number, extra?: Partial<CareEvent>) => Promise<void>;
  undoLast: (routineId: string) => Promise<void>;
  addPlace: (name: string) => Promise<void>;
  saveRoutine: (routine: CareRoutine) => Promise<void>;
  dismissHerald: (action: 'dismiss' | 'snooze3d') => Promise<void>;
  dismissSpectacle: () => void;
  finishOnboarding: (sprites?: Partial<Record<SpritePose, string>>, palette?: string[]) => Promise<void>;
}

const Ctx = createContext<AppStoreValue | null>(null);

export function useAppStore(): AppStoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppStore поза AppProvider');
  return v;
}

/**
 * Спектакль — тільки для рідкісного й дорогого. Зважування й кігті теж duty,
 * але вони щомісячні: магія, яку роздають 24 рази на рік, перестає вражати.
 */
const SPECTACLE_ROUTINES = new Set(['fleas', 'worms', 'healer', 'vaccine', 'forest']);

/** Нижче цього порогу повернення в апку — це системний діалог, а не новий вхід. */
const RETURN_THRESHOLD_MS = 2 * 60 * 1000;

const STARTUP_TIMEOUT_MS = 10_000;

function withWatchdog<T>(p: Promise<T>, message: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), STARTUP_TIMEOUT_MS)),
  ]);
}

/** Відмова має бути видимою й механічною — мовчазний тап читається як поломка. */
const REJECTION_TEXT: Record<string, string> = {
  slotFull: 'Слоти на сьогодні закриті.',
  future: 'Подій з майбутнього не буває.',
  disabled: 'Квест вимкнено.',
  unknownRoutine: 'Такого квесту немає.',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [state, setState] = useState<ComputedState | null>(null);
  const [herald, setHerald] = useState<HeraldItem | null>(null);
  const [spectacle, setSpectacle] = useState<RiteSpectacle | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const lastOpenedRef = useRef<number>(0);
  const backgroundedAtRef = useRef<number>(0);
  const lastHeraldAtRef = useRef<number>(0);
  const inFlightRef = useRef<Set<string>>(new Set());

  // Перерахунок — тут, а не в тілі View. Кешується до наступного запису або фону.
  const recompute = useCallback((s: Snapshot, now: number): ComputedState => {
    const next = compute({
      dog: s.dog,
      routines: s.routines,
      events: s.events,
      places: s.places,
      unlocked: s.unlocked,
      now,
    });
    setState(next);
    return next;
  }, []);

  const persistNewTrophies = useCallback(async (computed: ComputedState, now: number) => {
    if (computed.newlyUnlocked.length === 0) return;
    await store.unlockAchievements(computed.newlyUnlocked, now);
  }, []);

  const reload = useCallback(
    async (now: number): Promise<{ snap: Snapshot; computed: ComputedState } | null> => {
      const loaded = await store.loadAll();
      if (!loaded.dog) return null;
      const s: Snapshot = { ...loaded, dog: loaded.dog };
      setSnap(s);
      const computed = recompute(s, now);
      await persistNewTrophies(computed, now);
      return { snap: s, computed };
    },
    [recompute, persistNewTrophies],
  );

  const raiseHerald = useCallback(
    async (computed: ComputedState, s: Snapshot, now: number) => {
      const queue = heraldQueue({ now, quests: computed.quests }, s.heraldShown);
      const top = queue[0];
      if (!top) return;
      lastHeraldAtRef.current = now;
      setHerald(top); // максимум один на відкриття; решта чекає
      await store.recordShown(top.routineId, top.stage, now);
      setSnap((prev) =>
        prev
          ? { ...prev, heraldShown: [...prev.heraldShown, { routineId: top.routineId, stage: top.stage, shownAt: now }] }
          : prev,
      );
    },
    [],
  );

  // ─── старт ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const now = Date.now();
        // Зависла міграція чи побита база дали б вічний спінер — try/catch ловить
        // тільки відмову, не зупинку. Сторож перетворює зависання на видиму помилку.
        await withWatchdog(store.initStore(), 'Сховище не відповідає.');
        await prepareNotificationChannel();
        const done = await store.isOnboardingComplete();
        lastOpenedRef.current = (await store.getLastOpenedAt()) ?? now;
        const loaded = await reload(now);
        if (!alive) return;
        setOnboardingDone(done);
        setReady(true);
        await cancelAllOurNotifications(); // відкриття апки гасить виття
        await store.setLastOpenedAt(now);
        if (loaded && done) await raiseHerald(loaded.computed, loaded.snap, now);
      } catch (e) {
        if (alive) {
          setFatal(e instanceof Error ? e.message : String(e));
          setReady(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── фон / повернення ─────────────────────────────────────────────────────
  const stateRef = useRef<ComputedState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const now = Date.now();
      if (next === 'background') {
        backgroundedAtRef.current = now;
        void (async () => {
          const current = stateRef.current;
          if (!current) return;
          await store.setLastOpenedAt(now);
          // Плануємо ставку на тишину: перевірка «3+ дні без апки» стосується моменту
          // спрацювання, а не моменту планування — інакше жодне виття не поставиться ніколи.
          await syncNotifications(
            desiredNotifications({
              now,
              quests: current.quests,
              lastOpenedAt: now - SILENCE_DAYS * DAY_MS,
            }),
            now,
          );
        })();
      } else if (next === 'active') {
        const away = now - backgroundedAtRef.current;
        void (async () => {
          await cancelAllOurNotifications();
          const loaded = await reload(now);
          // Системні діалоги теж смикають AppState — герольд не має вискакувати після них.
          const realReturn = away > RETURN_THRESHOLD_MS && now - lastHeraldAtRef.current > RETURN_THRESHOLD_MS;
          if (loaded && onboardingDone && realReturn) {
            await raiseHerald(loaded.computed, loaded.snap, now);
          }
        })();
      }
    });
    return () => sub.remove();
  }, [reload, raiseHerald, onboardingDone]);

  // Кнопка «Звершено» з локскріна пише подію без відкриття апки.
  const completeRef = useRef<AppStoreValue['complete'] | null>(null);
  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse) => {
      const routineId = routineIdFromResponse(response);
      if (routineId) void completeRef.current?.(routineId);
    };
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    // Відповідь могла прийти до того, як JS піднявся — емітер її не переграє.
    Notifications.getLastNotificationResponseAsync()
      .then((last) => {
        if (last) handle(last);
      })
      .catch(() => {
        // платформа не вміє — нотифікація не носій правди, апка цього не помічає
      });
    return () => sub.remove();
  }, []);

  // ─── дії ──────────────────────────────────────────────────────────────────
  const complete = useCallback(
    async (routineId: string, occurredAt?: number, extra?: Partial<CareEvent>) => {
      const now = Date.now();
      // Модалка дати ставить полудень; до полудня це «майбутнє» і подія тихо зникала.
      const at = Math.min(occurredAt ?? now, now);
      const current = snap;
      if (!current) return;
      if (inFlightRef.current.has(routineId)) return; // подвійний тап у вікні запису в базу

      const check = canLogEvent(current.routines, current.events, routineId, at, now);
      if (!check.ok) {
        setNotice(REJECTION_TEXT[check.reason] ?? 'Записати не вийшло.');
        return;
      }

      const before = state;
      inFlightRef.current.add(routineId);
      try {
        await store.addEvent(
          {
            routineId,
            occurredAt: at,
            source: 'manual',
            weightKg: extra?.weightKg,
            note: extra?.note,
            placeId: extra?.placeId,
          },
          now,
        );
        const loaded = await reload(now);
        if (!loaded) return;

        const routine = current.routines.find((r) => r.id === routineId);
        if (routine && before && SPECTACLE_ROUTINES.has(routine.id)) {
          const ward = loaded.computed.wards.find((w) => w.routineId === routineId);
          setSpectacle({
            routineId,
            title: routine.title,
            xpGained: routine.xp,
            levelBefore: before.level,
            levelAfter: loaded.computed.level,
            wardExpiresAt: ward?.expiresAt,
            statsBefore: before.stats,
            statsAfter: loaded.computed.stats,
          });
        }
        if (herald?.routineId === routineId) setHerald(null);
        void syncCalendarBackups(loaded.computed, loaded.snap.routines);
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Записати не вийшло.');
      } finally {
        inFlightRef.current.delete(routineId);
      }
    },
    [snap, state, herald, reload],
  );

  const undoLast = useCallback(
    async (routineId: string) => {
      const current = snap;
      if (!current) return;
      const last = [...current.events]
        .filter((e) => e.routineId === routineId)
        .sort((a, b) => b.recordedAt - a.recordedAt)[0];
      if (!last) return;
      await store.deleteEvent(last.id);
      await reload(Date.now());
    },
    [snap, reload],
  );

  const addPlace = useCallback(
    async (name: string) => {
      const now = Date.now();
      await store.upsertPlace({ id: store.newId('pl'), name, firstVisitedAt: now });
      await reload(now);
    },
    [reload],
  );

  const saveRoutine = useCallback(
    async (routine: CareRoutine) => {
      await store.upsertRoutine(routine);
      await reload(Date.now());
    },
    [reload],
  );

  const dismissHerald = useCallback(
    async (action: 'dismiss' | 'snooze3d') => {
      const item = herald;
      setHerald(null);
      if (item && action === 'snooze3d') {
        const until = Date.now() + 3 * 24 * 60 * 60 * 1000;
        await store.snooze(item.routineId, until);
        await reload(Date.now());
      }
    },
    [herald, reload],
  );

  const bookCalendar = useCallback(
    async (routineId: string): Promise<boolean> => {
      const routine = snap?.routines.find((r) => r.id === routineId);
      const quest = state?.quests.find((q) => q.routine.id === routineId);
      if (!routine) return false;
      if (!(await requestCalendarPermission())) {
        setNotice('Без доступу до календаря страховка не ставиться.');
        return false;
      }
      const existing = await store.getRoutineCalendarEventIds();
      const id = await upsertCalendarBackup({
        title: routine.title,
        dueAt: quest?.dueAt ?? Date.now(),
        notes: 'dogochi — страховка на випадок, якщо апку перевстановлять.',
        existingEventId: existing[routineId],
      });
      if (!id) {
        setNotice('Календар не приймає запис.');
        return false;
      }
      await store.setRoutineCalendarEventId(routineId, id);
      setNotice('Занесено в календар.');
      return true;
    },
    [snap, state],
  );

  const rerunRitual = useCallback(() => setOnboardingDone(false), []);

  const finishOnboarding = useCallback(
    async (sprites?: Partial<Record<SpritePose, string>>, palette?: string[]) => {
      const current = snap;
      if (current && sprites) {
        for (const [pose, path] of Object.entries(sprites)) {
          if (path) await store.setSprite(current.dog.id, pose as SpritePose, path);
        }
      }
      if (current && palette?.length) await store.setPalette(current.dog.id, palette);
      await store.setOnboardingComplete(true);
      setOnboardingDone(true);
      const loaded = await reload(Date.now());
      if (loaded) await raiseHerald(loaded.computed, loaded.snap, Date.now());
    },
    [snap, reload, raiseHerald],
  );

  const value = useMemo<AppStoreValue>(
    () => ({
      ready,
      onboardingDone,
      state,
      dog: snap?.dog ?? null,
      routines: snap?.routines ?? [],
      events: snap?.events ?? [],
      places: snap?.places ?? [],
      herald,
      spectacle,
      fatal,
      notice,
      clearNotice: () => setNotice(null),
      bookCalendar,
      rerunRitual,
      complete,
      undoLast,
      addPlace,
      saveRoutine,
      dismissHerald,
      dismissSpectacle: () => setSpectacle(null),
      finishOnboarding,
    }),
    [
      ready,
      onboardingDone,
      state,
      snap,
      herald,
      spectacle,
      fatal,
      notice,
      bookCalendar,
      rerunRitual,
      complete,
      undoLast,
      addPlace,
      saveRoutine,
      dismissHerald,
      finishOnboarding,
    ],
  );

  completeRef.current = complete;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

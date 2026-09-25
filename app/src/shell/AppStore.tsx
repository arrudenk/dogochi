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

import { compute, heraldQueue, desiredNotifications, canLogEvent } from '@/core';
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

/** Обряди, які варто показати спектаклем — рідке й дороге. */
const SPECTACLE_KINDS = new Set(['ward', 'duty']);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [state, setState] = useState<ComputedState | null>(null);
  const [herald, setHerald] = useState<HeraldItem | null>(null);
  const [spectacle, setSpectacle] = useState<RiteSpectacle | null>(null);
  const lastOpenedRef = useRef<number>(0);

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

  // ─── старт ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      const now = Date.now();
      await store.initStore();
      await prepareNotificationChannel();
      const done = await store.isOnboardingComplete();
      const prevOpen = (await store.getLastOpenedAt()) ?? now;
      lastOpenedRef.current = prevOpen;
      const loaded = await reload(now);
      if (!alive) return;
      setOnboardingDone(done);
      setReady(true);
      await cancelAllOurNotifications(); // відкриття апки гасить виття
      await store.setLastOpenedAt(now);
      if (loaded && done) await raiseHerald(loaded.computed, loaded.snap, now);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const raiseHerald = useCallback(
    async (computed: ComputedState, s: Snapshot, now: number) => {
      const queue = heraldQueue({ now, quests: computed.quests }, s.heraldShown);
      const top = queue[0];
      if (!top) return;
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

  // ─── фон / повернення ─────────────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const now = Date.now();
      if (next === 'background' || next === 'inactive') {
        void (async () => {
          const current = state;
          if (!current) return;
          await store.setLastOpenedAt(now);
          await syncNotifications(
            desiredNotifications({ now, quests: current.quests, lastOpenedAt: now }),
            now,
          );
        })();
      } else if (next === 'active') {
        void (async () => {
          await cancelAllOurNotifications();
          const loaded = await reload(now);
          if (loaded && onboardingDone) await raiseHerald(loaded.computed, loaded.snap, now);
        })();
      }
    });
    return () => sub.remove();
  }, [state, reload, raiseHerald, onboardingDone]);

  // Кнопка «Звершено» з локскріна пише подію без відкриття апки.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const routineId = routineIdFromResponse(response);
      if (routineId) void complete(routineId);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap]);

  // ─── дії ──────────────────────────────────────────────────────────────────
  const complete = useCallback(
    async (routineId: string, occurredAt?: number, extra?: Partial<CareEvent>) => {
      const now = Date.now();
      const at = occurredAt ?? now;
      const current = snap;
      if (!current) return;

      const check = canLogEvent(current.routines, current.events, routineId, at, now);
      if (!check.ok) return;

      const before = state;
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
      if (routine && before && SPECTACLE_KINDS.has(routine.kind)) {
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
      complete,
      undoLast,
      addPlace,
      saveRoutine,
      dismissHerald,
      finishOnboarding,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

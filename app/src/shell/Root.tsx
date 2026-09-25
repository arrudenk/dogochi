import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/ui/theme';
import {
  PixelText,
  TabBar,
  formatWeight,
  refusalText,
  type ChronicleEntry,
  type SpriteMap,
  type TabKey,
} from '@/ui/components';
import {
  CharacterSheetScreen,
  ChronicleScreen,
  DenScreen,
  HeraldModal,
  LogPastModal,
  PlacesScreen,
  RiteCompleteScreen,
  RoutineSettingsScreen,
  TrophiesScreen,
  WeightModal,
} from '@/ui/screens';
import type { HeraldAction, HeraldItem, SpritePose } from '@/core/types';
import { DAY_MS, startOfDay } from '@/core';
import { AppProvider, useAppStore } from './AppStore';
import { SPRITES } from '@/pixel/spriteAssets';
import RitualFlow from '@/pixel/ritual/RitualFlow';
import { requestNotificationPermission } from './notificationAdapter';

/** Голос Балу — дефіцитний ресурс. Один рядок на обряд, без емоцій (§9). */
const BALU_LINES: Record<string, string> = {
  fleas: 'Щит змикається.',
  worms: 'Чисто всередині.',
  healer: 'Цілитель дивився. Я стояв.',
  vaccine: 'Крига в крові. Терпимо.',
  forest: 'Ліс пахне довго.',
};

/** Квести, що несуть число. Тап без числа знищив би те, заради чого квест існує. */
const WEIGHT_ROUTINES = new Set(['weigh']);

function Shell() {
  const app = useAppStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('den');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [routinesOpen, setRoutinesOpen] = useState(false);
  const [logPastFor, setLogPastFor] = useState<string | null>(null);
  const [weighFor, setWeighFor] = useState<string | null>(null);

  const chronicle = useMemo<ChronicleEntry[]>(() => {
    const byId = new Map(app.routines.map((r) => [r.id, r]));
    return app.events
      .map((e) => {
        const routine = byId.get(e.routineId);
        return {
          id: e.id,
          routineId: e.routineId,
          title: routine?.title ?? e.routineId,
          detail: e.weightKg != null ? formatWeight(e.weightKg) : e.note,
          occurredAt: e.occurredAt,
          xp: routine?.xp,
          backdated: e.recordedAt - e.occurredAt > DAY_MS,
          kind: 'event' as const,
        };
      })
      .sort((a, b) => b.occurredAt - a.occurredAt);
  }, [app.events, app.routines]);

  const chronicleLine = useMemo(() => {
    const worst = app.state?.quests.find((q) => q.status === 'overdue' || q.status === 'expired');
    if (!worst) return undefined;
    if (worst.status === 'expired') return `Оберіг «${worst.routine.title}» згас.`;
    return `${worst.routine.title} — прострочено ${worst.overdueDays ?? 1} дн.`;
  }, [app.state]);

  /** «РІК I · ДЕНЬ 47» — відлік від першої записаної події, а не від календарного січня. */
  const yearDayLabel = useMemo(() => {
    if (app.events.length === 0 || !app.state) return undefined;
    const first = Math.min(...app.events.map((e) => e.occurredAt));
    const days = Math.floor((startOfDay(app.state.now) - startOfDay(first)) / DAY_MS);
    const year = Math.floor(days / 365) + 1;
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][year - 1] ?? `${year}`;
    return `РІК ${roman} · ДЕНЬ ${(days % 365) + 1}`;
  }, [app.events, app.state]);

  const yearXp = useMemo(() => {
    if (!app.state) return undefined;
    const from = new Date(app.state.now).getFullYear();
    const byId = new Map(app.routines.map((r) => [r.id, r]));
    return app.events
      .filter((e) => new Date(e.occurredAt).getFullYear() === from)
      .reduce((sum, e) => sum + (byId.get(e.routineId)?.xp ?? 0), 0);
  }, [app.events, app.routines, app.state]);

  const heraldMeta = useMemo(() => {
    const item = app.herald;
    if (!item || !app.state) return undefined;
    const quest = app.state.quests.find((q) => q.routine.id === item.routineId);
    if (!quest?.lastDoneAt) return undefined;
    const when = new Date(quest.lastDoneAt).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
    });
    return `ОСТАННІЙ РАЗ — ${when.toUpperCase()} · +${quest.xp} XP`;
  }, [app.herald, app.state]);

  const onHeraldAction = useCallback(
    async (item: HeraldItem, action: HeraldAction) => {
      switch (action.kind) {
        case 'markDone':
          await app.dismissHerald('dismiss');
          setLogPastFor(item.routineId);
          break;
        case 'snooze3d':
          await app.dismissHerald('snooze3d');
          break;
        case 'calendar':
          await app.bookCalendar(item.routineId);
          await app.dismissHerald('dismiss');
          break;
        default:
          await app.dismissHerald('dismiss');
      }
    },
    [app],
  );

  // Спрайти, викувані в ритуалі, а не архетип — інакше вся робота власника невидима.
  const sprites = useMemo<SpriteMap>(() => {
    const own = app.dog?.sprites ?? {};
    const map: SpriteMap = { ...SPRITES };
    for (const [pose, uri] of Object.entries(own)) {
      if (uri) map[pose as SpritePose] = { uri };
    }
    return map;
  }, [app.dog]);

  // Головна користь спектаклю — до якої дати тримає оберіг, а не ігрове число.
  const spectacleDetail = useMemo(() => {
    const s = app.spectacle;
    if (!s) return undefined;
    const vit = `VITALITY ${Math.round(s.statsBefore.vitality)} → ${Math.round(s.statsAfter.vitality)}`;
    if (!s.wardExpiresAt) return vit;
    const until = new Date(s.wardExpiresAt).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
    });
    return `ЧИННИЙ ДО ${until.toUpperCase()} · ${vit}`;
  }, [app.spectacle]);

  const onComplete = useCallback(
    (routineId: string) => {
      if (WEIGHT_ROUTINES.has(routineId)) setWeighFor(routineId);
      else void app.complete(routineId);
    },
    [app],
  );

  if (app.fatal) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <PixelText variant="title">СХОВИЩЕ НЕ ВІДКРИЛОСЬ</PixelText>
        <PixelText variant="label">{app.fatal}</PixelText>
      </View>
    );
  }

  if (!app.ready || !app.state || !app.dog) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.gold} />
      </View>
    );
  }

  if (!app.onboardingDone) {
    return (
      <RitualFlow
        dogName={app.dog.name}
        onFinish={async (forged, palette) => {
          await app.finishOnboarding(forged, palette);
          await requestNotificationPermission(); // дозвіл просимо після ритуалу, не на старті
        }}
      />
    );
  }

  const state = app.state;
  const dog = app.dog;
  const hasOverdue = state.quests.some((q) => q.status === 'overdue' || q.status === 'expired');
  const logPastRoutine = app.routines.find((r) => r.id === logPastFor);
  const weighRoutine = app.routines.find((r) => r.id === weighFor);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {tab === 'den' && (
        <DenScreen
          state={state}
          sprites={sprites}
          yearDayLabel={yearDayLabel}
          chronicleLine={chronicleLine}
          notice={app.notice ?? undefined}
          onDismissNotice={app.clearNotice}
          onComplete={onComplete}
          onUndo={(id) => void app.undoLast(id)}
          onOpenSheet={() => setSheetOpen(true)}
          onLogPast={setLogPastFor}
        />
      )}
      {tab === 'places' && (
        <PlacesScreen places={app.places} onAdd={(name) => void app.addPlace(name)} />
      )}
      {tab === 'chronicle' && (
        <ChronicleScreen entries={chronicle} now={state.now} onLogPast={() => setTab('den')} />
      )}
      {tab === 'trophies' && <TrophiesScreen achievements={state.achievements} />}

      <TabBar
        activeTab={tab}
        onTabChange={setTab}
        denAlert={hasOverdue && tab !== 'den'}
        bottomInset={insets.bottom}
      />

      {sheetOpen && (
        <CharacterSheetScreen
          state={state}
          dog={dog}
          sprites={sprites}
          yearXp={yearXp}
          onOpenRoutines={() => setRoutinesOpen(true)}
          onLogWeight={() => setWeighFor('weigh')}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {routinesOpen && (
        <RoutineSettingsScreen
          routines={app.routines}
          onSave={(routine) => void app.saveRoutine(routine)}
          onRerunRitual={() => {
            setRoutinesOpen(false);
            setSheetOpen(false);
            app.rerunRitual();
          }}
          onClose={() => setRoutinesOpen(false)}
        />
      )}

      <HeraldModal
        visible={!!app.herald}
        item={app.herald}
        meta={heraldMeta}
        onAction={(item, action) => void onHeraldAction(item, action)}
      />

      <RiteCompleteScreen
        visible={!!app.spectacle}
        xp={app.spectacle?.xpGained ?? 0}
        levelFrom={app.spectacle?.levelBefore ?? 0}
        levelTo={app.spectacle?.levelAfter ?? 0}
        baluLine={BALU_LINES[app.spectacle?.routineId ?? ''] ?? 'Зроблено.'}
        wardTitle={app.spectacle ? `${app.spectacle.title.toUpperCase()} — ЗВЕРШЕНО` : undefined}
        wardDetail={spectacleDetail}
        onDismiss={app.dismissSpectacle}
      />

      <WeightModal
        visible={!!weighRoutine}
        routineTitle={weighRoutine?.title ?? ''}
        targetWeightMin={dog.targetWeightMin}
        targetWeightMax={dog.targetWeightMax}
        initialKg={state.lastWeightKg}
        onCancel={() => setWeighFor(null)}
        onConfirm={(kg) => {
          const id = weighFor;
          setWeighFor(null);
          if (id) void app.complete(id, undefined, { weightKg: kg });
        }}
      />

      <LogPastModal
        visible={!!logPastRoutine}
        routineTitle={logPastRoutine?.title ?? ''}
        now={state.now}
        needsWeight={!!logPastFor && WEIGHT_ROUTINES.has(logPastFor)}
        targetWeightMin={dog.targetWeightMin}
        targetWeightMax={dog.targetWeightMax}
        initialWeightKg={state.lastWeightKg}
        onCancel={() => setLogPastFor(null)}
        onConfirm={(occurredAt, weightKg) => {
          const id = logPastFor;
          setLogPastFor(null);
          if (id) void app.complete(id, occurredAt, weightKg != null ? { weightKg } : undefined);
        }}
      />
    </View>
  );
}

export default function Root() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

export { refusalText };

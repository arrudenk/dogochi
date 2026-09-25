import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/ui/theme';
import { TabBar, type ChronicleEntry, type TabKey } from '@/ui/components';
import {
  CharacterSheetScreen,
  ChronicleScreen,
  DenScreen,
  HeraldModal,
  LogPastModal,
  PlacesScreen,
  RiteCompleteScreen,
  TrophiesScreen,
} from '@/ui/screens';
import type { HeraldAction, HeraldItem } from '@/core/types';
import { ageLabel, DAY_MS } from '@/core';
import { AppProvider, useAppStore } from './AppStore';
import { SPRITES } from '@/pixel/spriteAssets';
import RitualFlow from '@/pixel/ritual/RitualFlow';
import { requestNotificationPermission } from './notificationAdapter';
import { requestCalendarPermission } from './calendarAdapter';

/** Голос Балу — дефіцитний ресурс. Один рядок на обряд, без емоцій (§9). */
const BALU_LINES: Record<string, string> = {
  fleas: 'Щит змикається.',
  worms: 'Чисто всередині.',
  healer: 'Цілитель дивився. Я стояв.',
  vaccine: 'Крига в крові. Терпимо.',
};

function Shell() {
  const app = useAppStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('den');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [logPastFor, setLogPastFor] = useState<string | null>(null);

  const chronicle = useMemo<ChronicleEntry[]>(() => {
    const byId = new Map(app.routines.map((r) => [r.id, r]));
    return app.events
      .map((e) => {
        const routine = byId.get(e.routineId);
        return {
          id: e.id,
          routineId: e.routineId,
          title: routine?.title ?? e.routineId,
          detail: e.weightKg ? `${e.weightKg} кг` : e.note,
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
    return `${worst.routine.title} — прострочено ${worst.overdueDays ?? 0} дн.`;
  }, [app.state]);

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
          await requestCalendarPermission();
          await app.dismissHerald('dismiss');
          break;
        default:
          await app.dismissHerald('dismiss');
      }
    },
    [app],
  );

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
        onFinish={async (sprites, palette) => {
          await app.finishOnboarding(sprites, palette);
          await requestNotificationPermission(); // дозвіл просимо після ритуалу, не на старті
        }}
      />
    );
  }

  const state = app.state;
  const hasOverdue = state.quests.some((q) => q.status === 'overdue' || q.status === 'expired');
  const logPastRoutine = app.routines.find((r) => r.id === logPastFor);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {tab === 'den' && (
        <DenScreen
          state={state}
          sprites={SPRITES}
          chronicleLine={chronicleLine}
          onComplete={(id) => void app.complete(id)}
          onOpenSheet={() => setSheetOpen(true)}
          onLogPast={setLogPastFor}
        />
      )}
      {tab === 'places' && (
        <PlacesScreen places={app.places} onAdd={(name) => void app.addPlace(name)} />
      )}
      {tab === 'chronicle' && <ChronicleScreen entries={chronicle} now={state.now} />}
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
          dog={app.dog}
          sprites={SPRITES}
          onClose={() => setSheetOpen(false)}
        />
      )}

      <HeraldModal
        visible={!!app.herald}
        item={app.herald}
        onAction={(item, action) => void onHeraldAction(item, action)}
      />

      <RiteCompleteScreen
        visible={!!app.spectacle}
        xp={app.spectacle?.xpGained ?? 0}
        levelFrom={app.spectacle?.levelBefore ?? 0}
        levelTo={app.spectacle?.levelAfter ?? 0}
        baluLine={BALU_LINES[app.spectacle?.routineId ?? ''] ?? 'Зроблено.'}
        wardTitle={app.spectacle ? `${app.spectacle.title.toUpperCase()} — ЗВЕРШЕНО` : undefined}
        wardDetail={
          app.spectacle
            ? `VITALITY ${Math.round(app.spectacle.statsBefore.vitality)} → ${Math.round(
                app.spectacle.statsAfter.vitality,
              )}`
            : undefined
        }
        onDismiss={app.dismissSpectacle}
      />

      <LogPastModal
        visible={!!logPastRoutine}
        routineTitle={logPastRoutine?.title ?? ''}
        now={state.now}
        onCancel={() => setLogPastFor(null)}
        onConfirm={(occurredAt) => {
          const id = logPastFor;
          setLogPastFor(null);
          if (id) void app.complete(id, occurredAt);
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

export { ageLabel };

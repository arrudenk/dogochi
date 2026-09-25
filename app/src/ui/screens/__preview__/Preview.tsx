import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HeraldAction, HeraldItem } from '@/core/types';
import TabBar from '@/ui/components/TabBar';
import type { TabKey } from '@/ui/components/types';
import CharacterSheetScreen from '../CharacterSheetScreen';
import ChronicleScreen from '../ChronicleScreen';
import DenScreen from '../DenScreen';
import HeraldModal from '../HeraldModal';
import LogPastModal from '../LogPastModal';
import PlacesScreen from '../PlacesScreen';
import RiteCompleteScreen from '../RiteCompleteScreen';
import TrophiesScreen from '../TrophiesScreen';
import {
  MOCK_CHRONICLE,
  MOCK_CHRONICLE_LINE,
  MOCK_DOG,
  MOCK_HERALD,
  MOCK_NOW,
  MOCK_PLACES,
  MOCK_STATE,
  MOCK_YEAR_DAY,
} from './mockState';
import { C } from '@/ui/theme';

/** Рендер усіх екранів на фікстурі — для ока й для перевірки, що все збирається. */
function PreviewInner() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('den');
  const [sheet, setSheet] = useState(false);
  const [herald, setHerald] = useState<HeraldItem | null>(MOCK_HERALD);
  const [rite, setRite] = useState(false);
  const [logPast, setLogPast] = useState<string | null>(null);

  const complete = useCallback((routineId: string) => {
    if (routineId === 'healer') setRite(true);
  }, []);

  const heraldAction = useCallback((_item: HeraldItem, action: HeraldAction) => {
    setHerald(null);
    if (action.kind === 'markDone') setLogPast('healer');
  }, []);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.root} edges={['top']}>
        {tab === 'den' ? (
          <DenScreen
            state={MOCK_STATE}
            yearDayLabel={MOCK_YEAR_DAY}
            chronicleLine={MOCK_CHRONICLE_LINE}
            onComplete={complete}
            onOpenSheet={() => setSheet(true)}
            onLogPast={setLogPast}
          />
        ) : tab === 'places' ? (
          <PlacesScreen places={MOCK_PLACES} onAdd={() => undefined} />
        ) : tab === 'chronicle' ? (
          <ChronicleScreen
            entries={MOCK_CHRONICLE}
            now={MOCK_NOW}
            onLogPast={() => setLogPast('feed')}
          />
        ) : (
          <TrophiesScreen achievements={MOCK_STATE.achievements} />
        )}
      </SafeAreaView>

      <TabBar activeTab={tab} onTabChange={setTab} denAlert bottomInset={insets.bottom} />

      {sheet ? (
        <View style={s.overlay}>
          <SafeAreaView style={s.root} edges={['top']}>
            <CharacterSheetScreen
              state={MOCK_STATE}
              dog={MOCK_DOG}
              yearXp={19293}
              onClose={() => setSheet(false)}
            />
          </SafeAreaView>
        </View>
      ) : null}

      <HeraldModal
        visible={herald != null}
        item={herald}
        meta="ОСТАННІЙ ОГЛЯД — 12 БЕРЕЗНЯ · +4000 XP"
        onAction={heraldAction}
        onDismiss={() => setHerald(null)}
      />

      <RiteCompleteScreen
        visible={rite}
        xp={4000}
        levelFrom={128}
        levelTo={154}
        baluLine="Щит змикається."
        wardTitle="ОБЕРІГ ЦІЛИТЕЛЯ ВІДНОВЛЕНО"
        wardDetail="ЧИННИЙ 6 МІСЯЦІВ · VITALITY 68 → 94"
        wardIcon="healer"
        onDismiss={() => setRite(false)}
      />

      <LogPastModal
        visible={logPast != null}
        routineTitle="Огляд Цілителя"
        now={MOCK_NOW}
        onCancel={() => setLogPast(null)}
        onConfirm={() => setLogPast(null)}
      />
    </View>
  );
}

export default function Preview() {
  return (
    <SafeAreaProvider>
      <PreviewInner />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bg,
  },
});

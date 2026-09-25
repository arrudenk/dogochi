import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CareRoutine, HeraldAction, HeraldItem } from '@/core/types';
import PixelText from '@/ui/components/PixelText';
import TabBar from '@/ui/components/TabBar';
import { refusalText } from '@/ui/components/format';
import type { TabKey } from '@/ui/components/types';
import CharacterSheetScreen from '../CharacterSheetScreen';
import ChronicleScreen from '../ChronicleScreen';
import DenScreen from '../DenScreen';
import HeraldModal from '../HeraldModal';
import LogPastModal from '../LogPastModal';
import PlacesScreen from '../PlacesScreen';
import RiteCompleteScreen from '../RiteCompleteScreen';
import RoutineSettingsScreen from '../RoutineSettingsScreen';
import TrophiesScreen from '../TrophiesScreen';
import WeightModal from '../WeightModal';
import {
  FRESH_STATE,
  MOCK_CHRONICLE,
  MOCK_CHRONICLE_LINE,
  MOCK_DOG,
  MOCK_HERALD,
  MOCK_HERALD_META,
  MOCK_NOW,
  MOCK_PLACES,
  MOCK_ROUTINES,
  MOCK_STATE,
  MOCK_YEAR_DAY,
  MOCK_YEAR_XP,
} from './mockState';
import { C, SPACING } from '@/ui/theme';

/** Розклади, що несуть вагу. У продакшні це знає контейнер, тут — фікстура. */
const WEIGHT_ROUTINES = new Set(['weigh']);

type Fixture = 'live' | 'fresh';

/** Рендер усіх екранів на фікстурі — для ока й для перевірки, що все збирається. */
function PreviewInner() {
  const insets = useSafeAreaInsets();
  const [fixture, setFixture] = useState<Fixture>('live');
  const [tab, setTab] = useState<TabKey>('den');
  const [sheet, setSheet] = useState(false);
  const [settings, setSettings] = useState(false);
  const [herald, setHerald] = useState<HeraldItem | null>(MOCK_HERALD);
  const [rite, setRite] = useState(false);
  const [logPast, setLogPast] = useState<string | null>(null);
  const [weighing, setWeighing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [routines, setRoutines] = useState<CareRoutine[]>(MOCK_ROUTINES);

  const state = fixture === 'fresh' ? FRESH_STATE : MOCK_STATE;

  const complete = useCallback((routineId: string) => {
    setNotice(undefined);
    if (WEIGHT_ROUTINES.has(routineId)) {
      setWeighing(routineId);
      return;
    }
    // слот, вибраний утретє — показуємо правило, а не мовчазний хаптик
    if (routineId === 'run') setNotice(refusalText('slotFull'));
    if (routineId === 'healer') setRite(true);
  }, []);

  const heraldAction = useCallback((_item: HeraldItem, action: HeraldAction) => {
    setHerald(null);
    if (action.kind === 'markDone') setLogPast('healer');
  }, []);

  const saveRoutine = useCallback((next: CareRoutine) => {
    setRoutines((prev) => prev.map((r) => (r.id === next.id ? next : r)));
  }, []);

  const logPastTitle = useMemo(
    () => routines.find((r) => r.id === logPast)?.title ?? 'Огляд Цілителя',
    [logPast, routines],
  );
  const weighTitle = useMemo(
    () => routines.find((r) => r.id === weighing)?.title ?? 'Зважування',
    [routines, weighing],
  );

  return (
    <View style={s.root}>
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.switcher}>
          {(['live', 'fresh'] as const).map((f) => (
            <Pressable key={f} onPress={() => setFixture(f)} style={s.switchBtn}>
              <PixelText variant="tiny" color={f === fixture ? C.gold : C.labelDim}>
                {f === 'live' ? 'ФІКСТУРА: ЖИВА' : 'ФІКСТУРА: ДЕНЬ ПЕРШИЙ'}
              </PixelText>
            </Pressable>
          ))}
        </View>

        {tab === 'den' ? (
          <DenScreen
            state={state}
            yearDayLabel={fixture === 'live' ? MOCK_YEAR_DAY : undefined}
            chronicleLine={fixture === 'live' ? MOCK_CHRONICLE_LINE : undefined}
            notice={notice}
            onDismissNotice={() => setNotice(undefined)}
            onComplete={complete}
            onOpenSheet={() => setSheet(true)}
            onLogPast={setLogPast}
            onUndo={(id) => setNotice(`Запис знято: ${id}`)}
          />
        ) : tab === 'places' ? (
          <PlacesScreen
            places={fixture === 'live' ? MOCK_PLACES : []}
            onAdd={() => undefined}
          />
        ) : tab === 'chronicle' ? (
          <ChronicleScreen
            entries={fixture === 'live' ? MOCK_CHRONICLE : []}
            now={MOCK_NOW}
            onLogPast={() => setLogPast('feed')}
          />
        ) : (
          <TrophiesScreen achievements={state.achievements} />
        )}
      </SafeAreaView>

      <TabBar activeTab={tab} onTabChange={setTab} denAlert bottomInset={insets.bottom} />

      {sheet ? (
        <View style={s.overlay}>
          <SafeAreaView style={s.root} edges={['top']}>
            <CharacterSheetScreen
              state={state}
              dog={MOCK_DOG}
              yearXp={fixture === 'live' ? MOCK_YEAR_XP : undefined}
              onClose={() => setSheet(false)}
              onOpenRoutines={() => setSettings(true)}
              onLogWeight={() => setWeighing('weigh')}
            />
          </SafeAreaView>
        </View>
      ) : null}

      {settings ? (
        <View style={s.overlay}>
          <SafeAreaView style={s.root} edges={['top']}>
            <RoutineSettingsScreen
              routines={routines}
              onSave={saveRoutine}
              onClose={() => setSettings(false)}
              onRerunRitual={() => setSettings(false)}
            />
          </SafeAreaView>
        </View>
      ) : null}

      <HeraldModal
        visible={herald != null}
        item={herald}
        meta={MOCK_HERALD_META}
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
        routineTitle={logPastTitle}
        now={MOCK_NOW}
        needsWeight={logPast != null && WEIGHT_ROUTINES.has(logPast)}
        targetWeightMin={MOCK_DOG.targetWeightMin}
        targetWeightMax={MOCK_DOG.targetWeightMax}
        initialWeightKg={state.lastWeightKg}
        onCancel={() => setLogPast(null)}
        onConfirm={() => setLogPast(null)}
      />

      <WeightModal
        visible={weighing != null}
        routineTitle={weighTitle}
        targetWeightMin={MOCK_DOG.targetWeightMin}
        targetWeightMax={MOCK_DOG.targetWeightMax}
        initialKg={state.lastWeightKg}
        dateLabel="сьогодні"
        onCancel={() => setWeighing(null)}
        onConfirm={() => setWeighing(null)}
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
  switcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  switchBtn: { paddingHorizontal: SPACING.sm },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bg,
  },
});

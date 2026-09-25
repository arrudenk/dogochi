import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ComputedState, QuestView, RoutineGroup } from '@/core/types';
import ChronicleFrame from '@/ui/components/ChronicleFrame';
import DenScene from '@/ui/components/DenScene';
import Panel from '@/ui/components/Panel';
import PixelText from '@/ui/components/PixelText';
import QuestRow from '@/ui/components/QuestRow';
import ScreenHeader from '@/ui/components/ScreenHeader';
import type { SpriteMap } from '@/ui/components/types';
import { C, GROUP_TITLES, SPACING } from '@/ui/theme';

export interface DenScreenProps {
  state: ComputedState;
  /** «РІК I · ДЕНЬ 47» — рахує двигун, екран тільки виводить */
  yearDayLabel?: string;
  /** рядок хроніки; якщо немає новин — рамки немає */
  chronicleLine?: string;
  sprites?: SpriteMap;
  onComplete: (routineId: string) => void;
  onOpenSheet: () => void;
  /** довгий тап по квесту — дописування минулим числом */
  onLogPast?: (routineId: string) => void;
}

interface Group {
  key: RoutineGroup;
  title: string;
  right?: string;
  rightTone?: 'muted' | 'danger';
  quests: QuestView[];
}

const ORDER: RoutineGroup[] = ['daily', 'rite', 'journey'];

function buildGroups(state: ComputedState): Group[] {
  const byGroup: Record<RoutineGroup, QuestView[]> = { daily: [], rite: [], journey: [] };
  for (const q of state.quests) {
    if (!q.routine.enabled) continue;
    byGroup[q.routine.group].push(q);
  }
  // породжені квести живуть поруч з походом, який їх породив
  for (const q of state.spawned) byGroup[q.routine.group].unshift(q);

  return ORDER.map((key) => {
    const quests = byGroup[key];
    let right: string | undefined;
    let rightTone: 'muted' | 'danger' | undefined;
    if (key === 'daily') {
      let done = 0;
      let total = 0;
      for (const q of quests) {
        if (q.routine.kind === 'slotted') {
          done += q.doneToday ?? 0;
          total += q.routine.perDay ?? 1;
        } else {
          done += Math.min(q.periodDone ?? 0, q.periodTarget ?? 1);
          total += q.periodTarget ?? q.routine.quotaCount ?? 1;
        }
      }
      right = `${done} / ${total}`;
    } else {
      const late = quests.filter((q) => q.status === 'overdue' || q.status === 'expired').length;
      if (late > 0) {
        right = `${late} ПРОСТРОЧЕНО`;
        rightTone = 'danger';
      }
    }
    return { key, title: GROUP_TITLES[key], right, rightTone, quests };
  }).filter((g) => g.quests.length > 0);
}

function DenScreen({
  state,
  yearDayLabel,
  chronicleLine,
  sprites,
  onComplete,
  onOpenSheet,
  onLogPast,
}: DenScreenProps) {
  const groups = useMemo(() => buildGroups(state), [state]);

  return (
    <View style={s.root}>
      <ScreenHeader title="ЛІГВО" right={yearDayLabel} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <DenScene
          level={state.level}
          xpIntoLevel={state.xpIntoLevel}
          xpPerLevel={state.xpPerLevel}
          sprites={sprites}
          onPressDog={onOpenSheet}
        />
        <PixelText variant="tiny" align="center" style={s.hint}>
          ↑ ТАП ПО БАЛУ — ЛИСТ ПЕРСОНАЖА
        </PixelText>

        {chronicleLine != null && chronicleLine.length > 0 ? (
          <View style={s.block}>
            <ChronicleFrame line={chronicleLine} />
          </View>
        ) : null}

        {groups.map((g) => (
          <Panel key={g.key} title={g.title} right={g.right} rightTone={g.rightTone} style={s.block}>
            {g.quests.map((q, i) => (
              <QuestRow
                key={q.routine.id}
                quest={q}
                now={state.now}
                last={i === g.quests.length - 1}
                onComplete={onComplete}
                onLogPast={onLogPast}
              />
            ))}
          </Panel>
        ))}

        <PixelText variant="tiny" align="center" style={s.footHint}>
          ДОВГИЙ ТАП ПО КВЕСТУ — ЗАПИСАТИ МИНУЛИМ ЧИСЛОМ
        </PixelText>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: SPACING.sm, paddingBottom: SPACING.xl },
  hint: { marginTop: SPACING.xs, marginBottom: SPACING.sm },
  block: { marginBottom: SPACING.sm },
  footHint: { marginTop: SPACING.sm },
});

export default DenScreen;

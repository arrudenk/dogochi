import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import type { AchievementView } from '@/core/types';
import Panel from '@/ui/components/Panel';
import PixelText from '@/ui/components/PixelText';
import ScreenHeader from '@/ui/components/ScreenHeader';
import StatBar from '@/ui/components/StatBar';
import WardIcon from '@/ui/components/WardIcon';
import { formatDate } from '@/ui/components/format';
import { C, SPACING } from '@/ui/theme';

export interface TrophiesScreenProps {
  achievements: AchievementView[];
}

const Trophy = React.memo(function Trophy({ a }: { a: AchievementView }) {
  return (
    <Panel style={s.card}>
      <View style={s.row}>
        <View style={[s.icon, a.unlocked ? null : s.locked]}>
          <WardIcon name="trophy" px={3} dead={!a.unlocked} />
        </View>
        <View style={s.text}>
          <PixelText variant={a.unlocked ? 'value' : 'soft'} color={a.unlocked ? C.gold : C.muted}>
            {a.title}
          </PixelText>
          <PixelText variant="tiny" color={a.unlocked ? C.label : C.labelDim} style={s.desc}>
            {a.description}
          </PixelText>
        </View>
      </View>
      <StatBar
        value={Math.max(0, Math.min(1, a.progress)) * 100}
        color={a.unlocked ? C.gold : C.frameInner}
        height={4}
        style={s.bar}
      />
      <View style={s.foot}>
        <PixelText variant="tiny" color={C.labelDim}>
          {a.progressLabel}
        </PixelText>
        {a.unlocked && a.unlockedAt != null ? (
          <PixelText variant="tiny" color={C.label}>
            {formatDate(a.unlockedAt).toUpperCase()}
          </PixelText>
        ) : null}
      </View>
    </Panel>
  );
});

function TrophiesScreen({ achievements }: TrophiesScreenProps) {
  // відкриті зверху, далі — за близькістю до відкриття
  const ordered = useMemo(
    () =>
      [...achievements].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return b.progress - a.progress;
      }),
    [achievements],
  );

  const unlocked = useMemo(() => ordered.filter((a) => a.unlocked).length, [ordered]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AchievementView>) => <Trophy a={item} />,
    [],
  );

  return (
    <View style={s.root}>
      <ScreenHeader title="ТРОФЕЇ" right={`${unlocked} / ${achievements.length}`} />
      <FlatList
        data={ordered}
        keyExtractor={keyOf}
        renderItem={renderItem}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const keyOf = (a: AchievementView): string => a.id;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.sm, paddingBottom: SPACING.xl },
  card: { marginBottom: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  icon: { width: 26, alignItems: 'center' },
  locked: { opacity: 0.5 },
  text: { flex: 1 },
  desc: { marginTop: 2 },
  bar: { marginTop: SPACING.sm },
  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
});

export default TrophiesScreen;

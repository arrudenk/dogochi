import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Millis, QuestView } from '@/core/types';
import PixelText from './PixelText';
import WardIcon from './WardIcon';
import { formatXp, questSubtitle } from './format';
import { C, SPACING } from '@/ui/theme';

export interface QuestRowProps {
  quest: QuestView;
  now: Millis;
  last?: boolean;
  onComplete: (routineId: string) => void;
  /** довгий тап — «записати датою», дописування минулим числом (§2) */
  onLogPast?: (routineId: string) => void;
}

const BIG_XP = 500;

function QuestRowBase({ quest, now, last = false, onComplete, onLogPast }: QuestRowProps) {
  const { routine, status } = quest;
  const late = status === 'overdue' || status === 'expired';
  const done = status === 'done';

  const subtitle = useMemo(() => questSubtitle(quest, now), [quest, now]);

  const press = useCallback(() => {
    void Haptics.impactAsync(
      quest.xp >= BIG_XP ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
    );
    onComplete(routine.id);
  }, [onComplete, routine.id, quest.xp]);

  const longPress = useCallback(() => {
    if (onLogPast == null) return;
    void Haptics.selectionAsync();
    onLogPast(routine.id);
  }, [onLogPast, routine.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${routine.title}. ${subtitle}`}
      onPress={press}
      onLongPress={longPress}
      style={({ pressed }) => [s.row, last ? null : s.divider, pressed ? s.pressed : null]}
    >
      <View style={[s.box, done ? s.boxOn : null, late ? s.boxLate : null]}>
        {done ? <View style={s.tick} /> : null}
      </View>
      <View style={s.icon}>
        <WardIcon name={routine.icon} px={2} dead={late} />
      </View>
      <View style={s.text}>
        <PixelText variant={late ? 'danger' : 'soft'}>{routine.title}</PixelText>
        <PixelText variant="tiny" color={late ? C.danger : C.muted} style={s.sub}>
          {subtitle}
        </PixelText>
      </View>
      <PixelText variant="tiny" color={quest.xp >= BIG_XP ? C.gold : C.label}>
        {`+${formatXp(quest.xp)}`}
      </PixelText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  pressed: { opacity: 0.6 },
  box: { width: 16, height: 16, borderWidth: 1, borderColor: C.frameOuter, backgroundColor: C.track },
  boxOn: { backgroundColor: C.gold, borderColor: C.gold },
  boxLate: { borderColor: C.dangerBox },
  tick: { flex: 1, margin: 3, backgroundColor: C.dialog },
  icon: { width: 16, alignItems: 'center' },
  text: { flex: 1 },
  sub: { marginTop: 1 },
});

/** Рядків на дошці десяток і вони статичні — memo тримає повторний рендер на нулі. */
export default React.memo(QuestRowBase);

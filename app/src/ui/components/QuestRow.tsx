import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Millis, QuestView } from '@/core/types';
import PixelText from './PixelText';
import WardIcon from './WardIcon';
import { formatXp, isUnknownStatus, questSubtitle } from './format';
import { C, SPACING } from '@/ui/theme';

export interface QuestRowProps {
  quest: QuestView;
  now: Millis;
  last?: boolean;
  onComplete: (routineId: string) => void;
  /** довгий тап — «записати датою», дописування минулим числом (§2) */
  onLogPast?: (routineId: string) => void;
  /** скасувати останній запис цього розкладу (§13) */
  onUndo?: (routineId: string) => void;
}

const BIG_XP = 500;

/** Явна кнопка праворуч — жест ховати не можна, інакше механіка недосяжна. */
const RowAction = React.memo(function RowAction({
  label,
  hint,
  onPress,
}: {
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      onPress={onPress}
      hitSlop={SPACING.sm}
      style={({ pressed }) => [s.action, pressed ? s.pressed : null]}
    >
      <PixelText variant="tiny" color={C.label}>
        {label}
      </PixelText>
    </Pressable>
  );
});

function QuestRowBase({ quest, now, last = false, onComplete, onLogPast, onUndo }: QuestRowProps) {
  const { routine, status } = quest;
  const unknown = isUnknownStatus(status);
  // «не записано» ніколи не червоне: це відсутність факту, а не прострочення (§2)
  const late = !unknown && (status === 'overdue' || status === 'expired');
  const done = !unknown && status === 'done';

  const subtitle = useMemo(() => questSubtitle(quest, now), [quest, now]);

  const press = useCallback(() => {
    void Haptics.impactAsync(
      quest.xp >= BIG_XP ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
    );
    onComplete(routine.id);
  }, [onComplete, routine.id, quest.xp]);

  const logPast = useCallback(() => {
    if (onLogPast == null) return;
    void Haptics.selectionAsync();
    onLogPast(routine.id);
  }, [onLogPast, routine.id]);

  const undo = useCallback(() => {
    if (onUndo == null) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUndo(routine.id);
  }, [onUndo, routine.id]);

  const titleColor = unknown ? C.muted : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${routine.title}. ${subtitle}`}
      onPress={press}
      onLongPress={logPast}
      style={({ pressed }) => [s.row, last ? null : s.divider, pressed ? s.pressed : null]}
    >
      <View
        style={[
          s.box,
          done ? s.boxOn : null,
          late ? s.boxLate : null,
          unknown ? s.boxUnknown : null,
        ]}
      >
        {done ? <View style={s.tick} /> : null}
      </View>
      <View style={s.icon}>
        <WardIcon name={routine.icon} px={2} dead={late || unknown} />
      </View>
      <View style={s.text}>
        <PixelText variant={late ? 'danger' : 'soft'} color={titleColor}>
          {routine.title}
        </PixelText>
        <PixelText variant="tiny" color={late ? C.danger : C.muted} style={s.sub}>
          {subtitle}
        </PixelText>
      </View>
      {done && onUndo != null ? (
        <RowAction label="↶ СКАСУВАТИ" hint={`Скасувати останній запис: ${routine.title}`} onPress={undo} />
      ) : unknown && onLogPast != null ? (
        <RowAction label="ЗАПИСАТИ ДАТУ" hint={`Записати минулим числом: ${routine.title}`} onPress={logPast} />
      ) : null}
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
  boxUnknown: { borderColor: C.frameInner },
  tick: { flex: 1, margin: 3, backgroundColor: C.dialog },
  icon: { width: 16, alignItems: 'center' },
  text: { flex: 1 },
  sub: { marginTop: 1 },
  action: {
    borderWidth: 1,
    borderColor: C.frameInner,
    backgroundColor: C.track,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
});

/** Рядків на дошці десяток і вони статичні — memo тримає повторний рендер на нулі. */
export default React.memo(QuestRowBase);

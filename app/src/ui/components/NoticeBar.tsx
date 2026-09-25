import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import PixelText from './PixelText';
import { C, SPACING } from '@/ui/theme';

export interface NoticeBarProps {
  /** порожньо або відсутнє — смужки немає */
  text?: string;
  /** правило світу (за замовчуванням) чи збій; докору не буває в жодному (§2) */
  tone?: 'rule' | 'fault';
  onDismiss?: () => void;
}

/**
 * Відмова мусить бути видимою: самого хаптика мало, власник не розуміє, що сталось (§13).
 * Реєстр механічний — констатуємо правило, не вибачаємось.
 */
function NoticeBarBase({ text, tone = 'rule', onDismiss }: NoticeBarProps) {
  if (text == null || text.length === 0) return null;
  const fault = tone === 'fault';
  return (
    <View style={[s.bar, fault ? s.fault : null]}>
      <PixelText variant="tiny" color={fault ? C.danger : C.label} style={s.text}>
        {text.toUpperCase()}
      </PixelText>
      {onDismiss != null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Сховати повідомлення"
          onPress={onDismiss}
          hitSlop={SPACING.md}
        >
          <PixelText variant="tiny" color={C.labelDim}>
            ✕
          </PixelText>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: C.trackEdge,
    backgroundColor: C.track,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
  },
  fault: { borderColor: C.dangerEdge },
  text: { flex: 1 },
});

export default React.memo(NoticeBarBase);

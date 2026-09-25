import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import PixelText from './PixelText';
import { C, SPACING } from '@/ui/theme';

export interface StepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** підпис значення; за замовчуванням — саме число */
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

const Btn = React.memo(function Btn({
  sign,
  disabled,
  onPress,
}: {
  sign: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sign === '−' ? 'Менше' : 'Більше'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={SPACING.xs}
      style={({ pressed }) => [s.btn, pressed ? s.pressed : null, disabled ? s.off : null]}
    >
      <PixelText variant="value" align="center">
        {sign}
      </PixelText>
    </Pressable>
  );
});

/** Ввід числа без клавіатури — періодичність це коротке ціле, а не текст. */
function StepperBase({ label, value, min = 1, max = 99, step = 1, format, onChange }: StepperProps) {
  const bump = useCallback(
    (delta: number) => {
      const next = Math.min(max, Math.max(min, value + delta));
      if (next === value) return;
      void Haptics.selectionAsync();
      onChange(next);
    },
    [max, min, onChange, value],
  );

  return (
    <View style={s.row}>
      <PixelText variant="tiny" color={C.label} style={s.label}>
        {label}
      </PixelText>
      <Btn sign="−" disabled={value <= min} onPress={() => bump(-step)} />
      <PixelText variant="value" align="center" style={s.value}>
        {format != null ? format(value) : String(value)}
      </PixelText>
      <Btn sign="+" disabled={value >= max} onPress={() => bump(step)} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingVertical: 5 },
  label: { flex: 1 },
  value: { minWidth: 74 },
  btn: {
    width: 28,
    height: 24,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.frameInner,
    backgroundColor: C.track,
  },
  pressed: { opacity: 0.6 },
  off: { opacity: 0.3 },
});

export default React.memo(StepperBase);

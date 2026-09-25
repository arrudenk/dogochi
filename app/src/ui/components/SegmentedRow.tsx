import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import PixelText from './PixelText';
import { C, SPACING } from '@/ui/theme';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedRowProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (value: T) => void;
}

/** Вибір з двох-трьох варіантів. Перемикач замість списку — жодних модалок заради одного поля. */
function SegmentedRow<T extends string>({ label, value, options, onChange }: SegmentedRowProps<T>) {
  const pick = useCallback(
    (next: T) => {
      if (next === value) return;
      void Haptics.selectionAsync();
      onChange(next);
    },
    [onChange, value],
  );

  return (
    <View style={s.row}>
      <PixelText variant="tiny" color={C.label} style={s.label}>
        {label}
      </PixelText>
      <View style={s.group}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => pick(o.value)}
              style={({ pressed }) => [s.seg, on ? s.segOn : null, pressed ? s.pressed : null]}
            >
              <PixelText variant="tiny" align="center" color={on ? C.dialog : C.textSoft}>
                {o.label}
              </PixelText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 5 },
  label: { flex: 1 },
  group: { flexDirection: 'row', gap: 2 },
  seg: {
    minWidth: 62,
    borderWidth: 1,
    borderColor: C.frameInner,
    backgroundColor: C.track,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  segOn: { backgroundColor: C.gold, borderColor: C.gold },
  pressed: { opacity: 0.6 },
});

export default React.memo(SegmentedRow) as typeof SegmentedRow;

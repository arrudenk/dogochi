import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import PixelText from './PixelText';
import { C, SPACING } from '@/ui/theme';

export type PixelButtonVariant = 'prime' | 'normal' | 'ghost' | 'danger';

export interface PixelButtonProps {
  label: string;
  /** сіра приписка праворуч у рядку — «→ календар» */
  hint?: string;
  variant?: PixelButtonVariant;
  align?: 'left' | 'center';
  disabled?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
}

function PixelButtonBase({
  label,
  hint,
  variant = 'normal',
  align = 'left',
  disabled = false,
  haptic = true,
  style,
  onPress,
}: PixelButtonProps) {
  const handle = useCallback(() => {
    if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [haptic, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handle}
      style={({ pressed }) => [
        s.base,
        s[variant],
        align === 'center' ? s.center : null,
        pressed ? s.pressed : null,
        disabled ? s.disabled : null,
        style,
      ]}
    >
      <View style={align === 'center' ? s.rowCenter : s.row}>
        <PixelText variant={variant === 'prime' ? 'bright' : 'soft'} style={s.label}>
          {label}
        </PixelText>
        {hint != null ? (
          <PixelText variant="tiny" style={s.hint}>
            {hint}
          </PixelText>
        ) : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { borderWidth: 1, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  rowCenter: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  center: { alignItems: 'center' },
  label: { flexShrink: 1, fontSize: 12 },
  hint: { marginLeft: SPACING.sm },
  normal: { backgroundColor: '#191610', borderColor: '#4a3f2a' },
  prime: { backgroundColor: '#1e1a10', borderColor: '#8a7440' },
  ghost: { backgroundColor: 'transparent', borderColor: C.frameInner },
  danger: { backgroundColor: '#1a1210', borderColor: C.dangerEdge },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.35 },
});

export default React.memo(PixelButtonBase);

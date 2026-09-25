import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import PixelText from './PixelText';
import { C, SPACING } from '@/ui/theme';

export interface ScreenHeaderProps {
  title: string;
  right?: string;
  /** якщо задано — праворуч кнопка «назад/закрити» замість підпису */
  onClose?: () => void;
  closeLabel?: string;
}

function ScreenHeaderBase({ title, right, onClose, closeLabel = 'ЗАКРИТИ' }: ScreenHeaderProps) {
  return (
    <View style={s.head}>
      <PixelText variant="title">{title}</PixelText>
      {onClose != null ? (
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          hitSlop={SPACING.md}
          style={({ pressed }) => (pressed ? s.pressed : null)}
        >
          <PixelText variant="tiny" color={C.label}>
            {closeLabel}
          </PixelText>
        </Pressable>
      ) : right != null ? (
        <PixelText variant="tiny" color={C.label}>
          {right}
        </PixelText>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
    backgroundColor: C.headTop,
    borderBottomWidth: 1,
    borderBottomColor: C.frameOuter,
  },
  pressed: { opacity: 0.6 },
});

export default React.memo(ScreenHeaderBase);

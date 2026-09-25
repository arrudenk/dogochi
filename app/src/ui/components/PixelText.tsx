import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { C, FONT } from '@/ui/theme';

export type PixelTextVariant =
  | 'title' // назва екрана в шапці
  | 'body' // основний рядок
  | 'soft' // рядок квесту
  | 'bright' // текст хроніки в діалозі
  | 'label' // підпис панелі, розріджений капс
  | 'tiny' // дрібний службовий капс
  | 'value' // золоте число
  | 'danger';

export interface PixelTextProps {
  variant?: PixelTextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

function PixelTextBase({
  variant = 'body',
  color,
  align,
  numberOfLines,
  style,
  children,
}: PixelTextProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      allowFontScaling={false}
      style={[s[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
    >
      {children}
    </Text>
  );
}

const base: TextStyle = { fontFamily: FONT.body, color: C.text };

const s = StyleSheet.create({
  title: { ...base, color: C.gold, fontSize: FONT.sizeLg, fontWeight: '700', letterSpacing: 1 },
  body: { ...base, fontSize: FONT.sizeSm },
  soft: { ...base, color: C.textSoft, fontSize: FONT.sizeSm },
  bright: { ...base, color: C.textBright, fontSize: FONT.size, lineHeight: 20 },
  label: {
    ...base,
    color: C.label,
    fontSize: FONT.sizeTiny,
    letterSpacing: FONT.letterWide,
  },
  tiny: { ...base, color: C.labelDim, fontSize: FONT.sizeTiny, letterSpacing: FONT.letter },
  value: { ...base, color: C.gold, fontSize: FONT.sizeSm, letterSpacing: FONT.letter },
  danger: { ...base, color: C.danger, fontSize: FONT.sizeSm },
});

/** allowFontScaling вимкнено свідомо: піксельний чром не тягнеться за системним кеглем. */
export default React.memo(PixelTextBase);

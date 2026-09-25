import React from 'react';
import { StyleSheet, View } from 'react-native';
import PixelText from './PixelText';
import { C, SPACING } from '@/ui/theme';

export interface ChronicleFrameProps {
  /** голос світу, реєстр бестіарію (§9) */
  line: string;
  /** «ХРОНІКА» за замовчуванням; «БАЛУ» — лише на емоційних піках */
  who?: string;
  tone?: 'chronicle' | 'balu';
}

/** Рамка новин під сценою. Показується тільки коли є що сказати. */
function ChronicleFrameBase({ line, who, tone = 'chronicle' }: ChronicleFrameProps) {
  const balu = tone === 'balu';
  return (
    <View style={s.box}>
      <PixelText variant="label" style={s.who}>
        {who ?? (balu ? 'БАЛУ' : 'ХРОНІКА')}
      </PixelText>
      <PixelText variant="bright" color={balu ? C.baluVoice : C.textBright}>
        {line}
      </PixelText>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    backgroundColor: '#14120c',
    borderWidth: 1,
    borderColor: C.frameOuter,
    paddingVertical: 7,
    paddingHorizontal: SPACING.sm,
  },
  who: { marginBottom: 3 },
});

export default React.memo(ChronicleFrameBase);

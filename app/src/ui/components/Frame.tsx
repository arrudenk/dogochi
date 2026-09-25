import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { C } from '@/ui/theme';

export interface FrameProps {
  /** зовнішня рамка світліша за внутрішню — канон мокапу */
  tone?: 'default' | 'danger' | 'ok';
  background?: string;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const OUTER = { default: C.frameOuter, danger: C.dangerEdge, ok: C.wardOkEdge } as const;

function FrameBase({ tone = 'default', background, style, innerStyle, children }: FrameProps) {
  return (
    <View style={[s.outer, { borderColor: OUTER[tone] }, style]}>
      <View style={[s.inner, background ? { backgroundColor: background } : null, innerStyle]}>
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { borderWidth: 1, borderColor: C.frameOuter, backgroundColor: C.bg },
  inner: { borderWidth: 1, borderColor: C.frameInner },
});

export default React.memo(FrameBase);

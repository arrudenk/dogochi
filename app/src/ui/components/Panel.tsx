import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import SectionHeader, { type SectionHeaderProps } from './SectionHeader';
import { C, SPACING } from '@/ui/theme';

export interface PanelProps extends Partial<SectionHeaderProps> {
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

function PanelBase({ title, right, rightTone, padded = true, style, children }: PanelProps) {
  return (
    <View style={[s.outer, style]}>
      <View style={[s.inner, padded ? s.pad : null]}>
        {title != null ? (
          <SectionHeader title={title} right={right} rightTone={rightTone} />
        ) : null}
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // два вкладені канти = inset-тінь з мокапу, без жодного shadow-фільтра
  outer: { borderWidth: 1, borderColor: C.frameInner, backgroundColor: C.panel },
  inner: { borderWidth: 1, borderColor: C.panelInset },
  pad: { padding: SPACING.sm },
});

export default React.memo(PanelBase);

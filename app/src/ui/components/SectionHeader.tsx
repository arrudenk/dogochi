import React from 'react';
import { StyleSheet, View } from 'react-native';
import PixelText from './PixelText';
import { C, SPACING } from '@/ui/theme';

export interface SectionHeaderProps {
  title: string;
  /** лічильник праворуч — «3 / 6» */
  right?: string;
  rightTone?: 'muted' | 'danger' | 'gold';
}

function SectionHeaderBase({ title, right, rightTone = 'muted' }: SectionHeaderProps) {
  return (
    <View style={s.row}>
      <PixelText variant="label">{title.toUpperCase()}</PixelText>
      {right != null ? (
        <PixelText
          variant="tiny"
          color={rightTone === 'danger' ? C.danger : rightTone === 'gold' ? C.gold : C.labelDim}
        >
          {right}
        </PixelText>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.trackEdge,
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.sm,
  },
});

export default React.memo(SectionHeaderBase);

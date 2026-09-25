import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import PixelText from './PixelText';
import { C, METRICS, SPACING } from '@/ui/theme';

export interface StatBarProps {
  label?: string;
  /** 0..100 */
  value: number;
  color: string;
  /** підпис значення праворуч; за замовчуванням — саме число */
  valueLabel?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

function StatBarBase({ label, value, color, valueLabel, height, style }: StatBarProps) {
  const pct = `${Math.max(0, Math.min(100, value))}%` as const;
  return (
    <View style={style}>
      {label != null ? (
        <View style={s.row}>
          <PixelText variant="tiny" color="#a89873">
            {label}
          </PixelText>
          <PixelText variant="tiny" color="#a89873">
            {valueLabel ?? String(Math.round(value))}
          </PixelText>
        </View>
      ) : null}
      <View style={[s.track, height != null ? { height } : null]}>
        <View style={[s.fill, { width: pct, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  track: {
    height: METRICS.barHeight,
    backgroundColor: C.track,
    borderWidth: 1,
    borderColor: C.trackEdge,
  },
  fill: { height: '100%' },
});

export const STAT_BAR_GAP = SPACING.xs;

export default React.memo(StatBarBase);

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import PixelText from './PixelText';
import { formatXp } from './format';
import { C, METRICS, SPACING } from '@/ui/theme';

export interface XpBarProps {
  level: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  /** додаткова приписка після «93 / 150 XP» */
  note?: string;
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/** Табличка рівня з XP-смужкою — висить над головою Балу і в лігві, і на листі. */
function XpBarBase({ level, xpIntoLevel, xpPerLevel, note, width = 130, style }: XpBarProps) {
  const pct = xpPerLevel > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpPerLevel)) * 100 : 0;
  return (
    <View style={[s.wrap, { width }, style]}>
      <View style={s.plate}>
        <PixelText variant="value" style={s.level}>
          {`УР. ${level}`}
        </PixelText>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${pct}%` }]} />
      </View>
      <PixelText variant="tiny" align="center" style={s.note}>
        {`${formatXp(xpIntoLevel)} / ${formatXp(xpPerLevel)} XP${note != null ? ` · ${note}` : ''}`}
      </PixelText>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },
  plate: {
    backgroundColor: C.dialog,
    borderWidth: 1,
    borderColor: C.frameOuter,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
  },
  level: { fontSize: 12, fontWeight: '700' },
  track: {
    alignSelf: 'stretch',
    height: METRICS.xpBarHeight,
    marginTop: 3,
    backgroundColor: C.track,
    borderWidth: 1,
    borderColor: C.trackEdge,
  },
  // без градієнта: суцільне золото читається так само, а шар менший
  fill: { height: '100%', backgroundColor: C.gold },
  note: { marginTop: 2 },
});

export default React.memo(XpBarBase);

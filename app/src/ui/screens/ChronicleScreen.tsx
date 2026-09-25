import React, { useCallback, useMemo } from 'react';
import { SectionList, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import type { Millis } from '@/core/types';
import PixelButton from '@/ui/components/PixelButton';
import PixelText from '@/ui/components/PixelText';
import ScreenHeader from '@/ui/components/ScreenHeader';
import WardIcon from '@/ui/components/WardIcon';
import { formatDayHeading, formatTime, formatXp, startOfDay } from '@/ui/components/format';
import type { ChronicleEntry } from '@/ui/components/types';
import { C, SPACING } from '@/ui/theme';

export interface ChronicleScreenProps {
  /** зворотно-хронологічний список, уже вибраний двигуном */
  entries: ChronicleEntry[];
  now: Millis;
  /** «записати минулим числом» */
  onLogPast?: () => void;
}

interface DaySection {
  key: string;
  title: string;
  total: number;
  data: ChronicleEntry[];
}

const KIND_ICON: Record<ChronicleEntry['kind'], string> = {
  event: 'scroll',
  ward: 'shield',
  unlock: 'trophy',
  summary: 'calendar',
};

const Row = React.memo(function Row({ entry }: { entry: ChronicleEntry }) {
  return (
    <View style={s.row}>
      <View style={s.icon}>
        <WardIcon name={KIND_ICON[entry.kind]} px={2} />
      </View>
      <View style={s.text}>
        <PixelText variant="soft">{entry.title}</PixelText>
        <PixelText variant="tiny" color={C.muted} style={s.detail}>
          {`${formatTime(entry.occurredAt)}${entry.detail != null ? ` · ${entry.detail}` : ''}${
            entry.backdated === true ? ' · ЗАПИСАНО ПІЗНІШЕ' : ''
          }`}
        </PixelText>
      </View>
      {entry.xp != null ? (
        <PixelText variant="tiny" color={C.label}>
          {`+${formatXp(entry.xp)}`}
        </PixelText>
      ) : null}
    </View>
  );
});

function ChronicleScreen({ entries, now, onLogPast }: ChronicleScreenProps) {
  const sections = useMemo<DaySection[]>(() => {
    const out: DaySection[] = [];
    let current: DaySection | null = null;
    for (const e of entries) {
      const day = startOfDay(e.occurredAt);
      const key = String(day);
      if (current == null || current.key !== key) {
        current = { key, title: formatDayHeading(day, now), total: 0, data: [] };
        out.push(current);
      }
      current.data.push(e);
      current.total += e.xp ?? 0;
    }
    return out;
  }, [entries, now]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChronicleEntry>) => <Row entry={item} />,
    [],
  );

  const renderHeader = useCallback(
    ({ section }: { section: DaySection }) => (
      <View style={s.dayHead}>
        <PixelText variant="label">{section.title}</PixelText>
        {section.total > 0 ? (
          <PixelText variant="tiny" color={C.labelDim}>
            {`+${formatXp(section.total)} XP`}
          </PixelText>
        ) : null}
      </View>
    ),
    [],
  );

  return (
    <View style={s.root}>
      <ScreenHeader title="ХРОНІКА" right={`${entries.length} ЗАПИСІВ`} />
      {onLogPast != null ? (
        <View style={s.logPast}>
          <PixelButton label="Записати минулим числом" align="center" onPress={onLogPast} />
        </View>
      ) : null}
      <SectionList
        sections={sections}
        keyExtractor={keyOf}
        renderItem={renderItem}
        renderSectionHeader={renderHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <PixelText variant="tiny" align="center" color={C.muted} style={s.empty}>
            ЖУРНАЛ ПОРОЖНІЙ
          </PixelText>
        }
      />
    </View>
  );
}

const keyOf = (e: ChronicleEntry): string => e.id;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  logPast: { padding: SPACING.sm, paddingBottom: 0 },
  content: { padding: SPACING.sm, paddingBottom: SPACING.xl },
  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.trackEdge,
    paddingBottom: 3,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.dividerSoft,
  },
  icon: { width: 16, alignItems: 'center' },
  text: { flex: 1 },
  detail: { marginTop: 1 },
  empty: { marginTop: SPACING.xl },
});

export default ChronicleScreen;

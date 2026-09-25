import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import PixelText from './PixelText';
import type { TabKey } from './types';
import { C, SPACING } from '@/ui/theme';

export interface TabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  /** позначка «є прострочене» на вкладці лігва */
  denAlert?: boolean;
  bottomInset?: number;
}

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'den', label: 'ЛІГВО' },
  { key: 'places', label: 'МІСЦЯ' },
  { key: 'chronicle', label: 'ХРОНІКА' },
  { key: 'trophies', label: 'ТРОФЕЇ' },
];

const Tab = React.memo(function Tab({
  tabKey,
  label,
  active,
  alert,
  onPress,
}: {
  tabKey: TabKey;
  label: string;
  active: boolean;
  alert: boolean;
  onPress: (key: TabKey) => void;
}) {
  const press = useCallback(() => {
    void Haptics.selectionAsync();
    onPress(tabKey);
  }, [onPress, tabKey]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={press}
      style={({ pressed }) => [s.tab, pressed ? s.pressed : null]}
    >
      {active ? <View style={s.marker} /> : null}
      <PixelText variant="tiny" color={active ? C.gold : C.muted} align="center">
        {label}
      </PixelText>
      {alert ? <View style={s.dot} /> : null}
    </Pressable>
  );
});

function TabBarBase({ activeTab, onTabChange, denAlert = false, bottomInset = 0 }: TabBarProps) {
  return (
    <View style={[s.bar, { paddingBottom: bottomInset }]} accessibilityRole="tablist">
      {TABS.map((t) => (
        <Tab
          key={t.key}
          tabKey={t.key}
          label={t.label}
          active={t.key === activeTab}
          alert={t.key === 'den' && denAlert && t.key !== activeTab}
          onPress={onTabChange}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.frameOuter, backgroundColor: C.dialog },
  tab: { flex: 1, paddingVertical: SPACING.sm, justifyContent: 'center' },
  marker: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: C.gold },
  pressed: { opacity: 0.6 },
  dot: {
    position: 'absolute',
    top: 6,
    right: 18,
    width: 4,
    height: 4,
    backgroundColor: C.danger,
  },
});

export default React.memo(TabBarBase);

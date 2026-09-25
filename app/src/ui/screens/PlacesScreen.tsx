import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View, type ListRenderItemInfo } from 'react-native';
import type { Place } from '@/core/types';
import PixelButton from '@/ui/components/PixelButton';
import PixelText from '@/ui/components/PixelText';
import ScreenHeader from '@/ui/components/ScreenHeader';
import WardIcon from '@/ui/components/WardIcon';
import { formatDate } from '@/ui/components/format';
import { C, FONT, SPACING } from '@/ui/theme';

export interface PlacesScreenProps {
  places: Place[];
  onAdd: (name: string) => void;
}

const Row = React.memo(function Row({ place, index }: { place: Place; index: number }) {
  return (
    <View style={s.row}>
      <View style={s.icon}>
        <WardIcon name="pin" px={2} />
      </View>
      <View style={s.text}>
        <PixelText variant="soft">{place.name}</PixelText>
        <PixelText variant="tiny" color={C.muted} style={s.sub}>
          {`ВІДКРИТО ${formatDate(place.firstVisitedAt).toUpperCase()}`}
        </PixelText>
      </View>
      <PixelText variant="tiny" color={C.labelDim}>
        {String(index + 1).padStart(2, '0')}
      </PixelText>
    </View>
  );
});

/** У v1 мапи немає і назвою її не обіцяємо (§12) — це просто список відкритого. */
function PlacesScreen({ places, onAdd }: PlacesScreenProps) {
  const [draft, setDraft] = useState('');

  const add = useCallback(() => {
    const name = draft.trim();
    if (name.length === 0) return;
    onAdd(name);
    setDraft('');
  }, [draft, onAdd]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Place>) => <Row place={item} index={index} />,
    [],
  );

  return (
    <View style={s.root}>
      <ScreenHeader title="МІСЦЯ" right={`ВІДКРИТО ${places.length}`} />
      <View style={s.form}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
          placeholder="Назва місця"
          placeholderTextColor={C.labelDim}
          allowFontScaling={false}
          style={s.input}
        />
        <PixelButton
          label="ДОДАТИ"
          variant="prime"
          align="center"
          disabled={draft.trim().length === 0}
          onPress={add}
        />
      </View>
      <FlatList
        data={places}
        keyExtractor={keyOf}
        renderItem={renderItem}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <PixelText variant="tiny" align="center" color={C.muted} style={s.empty}>
            ЖОДНОГО МІСЦЯ ЩЕ НЕ ВІДКРИТО
          </PixelText>
        }
      />
    </View>
  );
}

const keyOf = (p: Place): string => p.id;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  form: { flexDirection: 'row', alignItems: 'stretch', gap: SPACING.sm, padding: SPACING.sm },
  input: {
    flex: 1,
    backgroundColor: C.track,
    borderWidth: 1,
    borderColor: C.frameInner,
    color: C.text,
    fontFamily: FONT.body,
    fontSize: FONT.sizeSm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  content: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.dividerSoft,
  },
  icon: { width: 18, alignItems: 'center' },
  text: { flex: 1 },
  sub: { marginTop: 1 },
  empty: { marginTop: SPACING.xl },
});

export default PlacesScreen;

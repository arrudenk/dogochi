import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import PixelText from './PixelText';
import { formatWeightRange } from './format';
import { C, SPACING } from '@/ui/theme';

export interface WeightPadProps {
  /** сирий ввід: цифри й щонайбільше одна кома, напр. «11,5» */
  value: string;
  onChange: (next: string) => void;
  /** цільовий діапазон власника — показується завжди, бо від нього залежить Vitality (§8.2) */
  targetMin?: number;
  targetMax?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'] as const;
const MAX_INT = 3;
const MAX_FRAC = 1;

/** `null`, якщо ввід ще не число. Валідація живе тут, щоб обидва виклики поводились однаково. */
export function parseWeight(raw: string): number | null {
  if (raw.length === 0 || raw === ',') return null;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function pushWeightKey(raw: string, key: string): string {
  if (key === '⌫') return raw.slice(0, -1);
  if (key === ',') return raw.includes(',') || raw.length === 0 ? raw : `${raw},`;
  const [int = '', frac] = raw.split(',');
  if (frac != null) return frac.length >= MAX_FRAC ? raw : `${raw}${key}`;
  if (int.length >= MAX_INT) return raw;
  if (int === '0') return key;
  return `${raw}${key}`;
}

const Key = React.memo(function Key({
  label,
  onPress,
}: {
  label: string;
  onPress: (label: string) => void;
}) {
  const press = useCallback(() => {
    void Haptics.selectionAsync();
    onPress(label);
  }, [label, onPress]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={press}
      style={({ pressed }) => [s.key, pressed ? s.pressed : null]}
    >
      <PixelText variant="value" align="center" style={s.keyText}>
        {label}
      </PixelText>
    </Pressable>
  );
});

/**
 * Цифрова панель замість системної клавіатури: піксельний чром лишається цілим,
 * а модалку не з'їдає клавіатура. Нуль анімацій, нуль вимірювань.
 */
function WeightPadBase({ value, onChange, targetMin, targetMax }: WeightPadProps) {
  const kg = parseWeight(value);
  const banded = targetMin != null && targetMax != null;
  const inRange = kg != null && banded && kg >= targetMin && kg <= targetMax;

  const press = useCallback((key: string) => onChange(pushWeightKey(value, key)), [onChange, value]);

  const range = useMemo(
    () => (banded ? formatWeightRange(targetMin, targetMax) : null),
    [banded, targetMin, targetMax],
  );

  return (
    <View>
      <View style={s.display}>
        <PixelText variant="value" align="center" style={s.value}>
          {value.length > 0 ? value : '—'}
        </PixelText>
        <PixelText variant="tiny" color={C.label} style={s.unit}>
          КГ
        </PixelText>
      </View>

      {range != null ? (
        <PixelText variant="tiny" align="center" color={C.labelDim} style={s.range}>
          {`ЦІЛЬОВИЙ ДІАПАЗОН ${range}`}
        </PixelText>
      ) : null}
      {kg != null && banded ? (
        // поза діапазоном — це факт, не діагноз: приглушено, ніколи не червоним (§2, §13)
        <PixelText
          variant="tiny"
          align="center"
          color={inRange ? C.wardOkText : C.label}
          style={s.verdict}
        >
          {inRange ? 'У ДІАПАЗОНІ' : 'ПОЗА ДІАПАЗОНОМ'}
        </PixelText>
      ) : null}

      <View style={s.pad}>
        {KEYS.map((k) => (
          <Key key={k} label={k} onPress={press} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  display: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: C.frameInner,
    backgroundColor: C.track,
    paddingVertical: SPACING.sm,
  },
  value: { fontSize: 28, fontWeight: '700' },
  unit: {},
  range: { marginTop: SPACING.sm },
  verdict: { marginTop: 2 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm },
  // 3 колонки рівно, без вимірювань
  key: {
    width: `${100 / 3}%`,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: C.divider,
  },
  keyText: { fontSize: 15 },
  pressed: { opacity: 0.6 },
});

export default React.memo(WeightPadBase);

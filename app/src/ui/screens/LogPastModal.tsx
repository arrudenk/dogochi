import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Millis } from '@/core/types';
import PixelButton from '@/ui/components/PixelButton';
import PixelText from '@/ui/components/PixelText';
import WeightPad, { parseWeight } from '@/ui/components/WeightPad';
import {
  MONTHS_NOM,
  WEEKDAYS_SHORT,
  daysBetween,
  formatDate,
  formatKg,
  startOfDay,
} from '@/ui/components/format';
import { C, SPACING } from '@/ui/theme';

export interface LogPastModalProps {
  visible: boolean;
  /** назва квесту, який дописуємо */
  routineTitle: string;
  /** «зараз» — верхня межа; подія в майбутньому відхиляється (§5) */
  now: Millis;
  /** початково вибрана дата; за замовчуванням — сьогодні */
  initialDate?: Millis;
  /** розклад несе вагу — після дати питаємо число, інакше запис безглуздий */
  needsWeight?: boolean;
  targetWeightMin?: number;
  targetWeightMax?: number;
  initialWeightKg?: number;
  onCancel: () => void;
  onConfirm: (occurredAt: Millis, weightKg?: number) => void;
}

interface Cell {
  key: string;
  day: number | null;
  ms: Millis;
  disabled: boolean;
}

function buildMonth(anchor: Millis, max: Millis): Cell[] {
  const d = new Date(anchor);
  const year = d.getFullYear();
  const month = d.getMonth();
  const first = new Date(year, month, 1);
  // тиждень починається з понеділка
  const lead = (first.getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells: Cell[] = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ key: `pad-${i}`, day: null, ms: 0, disabled: true });
  }
  for (let day = 1; day <= total; day++) {
    const ms = new Date(year, month, day).getTime();
    cells.push({ key: `d-${day}`, day, ms, disabled: ms > max });
  }
  return cells;
}

/**
 * Дописування минулим числом — несуча фіча, а не дрібниця (§2).
 * Календар свій, піксельний: жодної сторонньої бібліотеки.
 */
interface PickerProps {
  routineTitle: string;
  now: Millis;
  initialDate?: Millis;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (occurredAt: Millis) => void;
}

function Picker({ routineTitle, now, initialDate, confirmLabel, onCancel, onConfirm }: PickerProps) {
  const today = useMemo(() => startOfDay(now), [now]);
  const [selected, setSelected] = useState<Millis>(() => startOfDay(initialDate ?? now));
  const [anchor, setAnchor] = useState<Millis>(() => startOfDay(initialDate ?? now));

  const cells = useMemo(() => buildMonth(anchor, today), [anchor, today]);
  const heading = useMemo(() => {
    const d = new Date(anchor);
    return `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`;
  }, [anchor]);

  const shiftMonth = useCallback((delta: number) => {
    setAnchor((prev) => {
      const d = new Date(prev);
      d.setDate(1);
      d.setMonth(d.getMonth() + delta);
      return d.getTime();
    });
  }, []);

  const pick = useCallback((ms: Millis) => {
    void Haptics.selectionAsync();
    setSelected(ms);
  }, []);

  const quick = useCallback(
    (daysBack: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysBack);
      const ms = d.getTime();
      setSelected(ms);
      setAnchor(ms);
    },
    [today],
  );

  const diff = daysBetween(selected, today);
  const selectedLabel =
    diff === 0
      ? 'СЬОГОДНІ'
      : diff === 1
        ? 'УЧОРА'
        : `${diff} ДН. ТОМУ`;

  const confirm = useCallback(() => {
    // час доби беремо полуденний, щоб подія не впала в сусідню добу через зсув поясу
    onConfirm(selected + 12 * 3_600_000);
  }, [onConfirm, selected]);

  const nextDisabled = useMemo(() => {
    const d = new Date(anchor);
    return d.getFullYear() === new Date(today).getFullYear() && d.getMonth() === new Date(today).getMonth();
  }, [anchor, today]);

  return (
    <View style={s.card}>
      <PixelText variant="label" style={s.head}>
        ЗАПИСАТИ ДАТОЮ
      </PixelText>
      <PixelText variant="bright" style={s.title}>
        {routineTitle}
      </PixelText>

      <View style={s.nav}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={SPACING.md} accessibilityRole="button">
          <PixelText variant="value">‹</PixelText>
        </Pressable>
        <PixelText variant="label">{heading}</PixelText>
        <Pressable
          onPress={() => shiftMonth(1)}
          disabled={nextDisabled}
          hitSlop={SPACING.md}
          accessibilityRole="button"
        >
          <PixelText variant="value" color={nextDisabled ? C.frameInner : C.gold}>
            ›
          </PixelText>
        </Pressable>
      </View>

      <View style={s.week}>
        {WEEKDAYS_SHORT.map((w) => (
          <PixelText key={w} variant="tiny" align="center" style={s.cell}>
            {w}
          </PixelText>
        ))}
      </View>

      <View style={s.grid}>
        {cells.map((c) =>
          c.day == null ? (
            <View key={c.key} style={s.cell} />
          ) : (
            <Pressable
              key={c.key}
              disabled={c.disabled}
              onPress={() => pick(c.ms)}
              style={[
                s.cell,
                s.day,
                c.ms === selected ? s.daySelected : null,
                c.disabled ? s.dayDisabled : null,
              ]}
            >
              <PixelText
                variant="tiny"
                align="center"
                color={c.ms === selected ? C.dialog : c.disabled ? C.frameInner : C.textSoft}
              >
                {String(c.day)}
              </PixelText>
            </Pressable>
          ),
        )}
      </View>

      <View style={s.quick}>
        <PixelButton label="Сьогодні" style={s.quickBtn} onPress={() => quick(0)} />
        <PixelButton label="Учора" style={s.quickBtn} onPress={() => quick(1)} />
        <PixelButton label="Позавчора" style={s.quickBtn} onPress={() => quick(2)} />
      </View>

      <PixelText variant="tiny" align="center" color={C.label} style={s.selected}>
        {selectedLabel}
      </PixelText>

      <PixelButton label={confirmLabel} variant="prime" align="center" onPress={confirm} />
      <PixelButton label="Скасувати" variant="ghost" align="center" style={s.cancel} onPress={onCancel} />
    </View>
  );
}

/** Другий крок тієї самої модалки: минуле зважування без числа нічого не варте. */
function WeightStep({
  routineTitle,
  dateLabel,
  targetWeightMin,
  targetWeightMax,
  initialWeightKg,
  onBack,
  onConfirm,
}: {
  routineTitle: string;
  dateLabel: string;
  targetWeightMin?: number;
  targetWeightMax?: number;
  initialWeightKg?: number;
  onBack: () => void;
  onConfirm: (kg: number) => void;
}) {
  const [raw, setRaw] = useState(() => (initialWeightKg != null ? formatKg(initialWeightKg) : ''));
  const kg = parseWeight(raw);

  return (
    <View style={s.card}>
      <PixelText variant="label" style={s.head}>
        ЗАПИСАТИ ВАГУ
      </PixelText>
      <PixelText variant="bright" style={s.title}>
        {routineTitle}
      </PixelText>
      <PixelText variant="tiny" color={C.labelDim} style={s.stepDate}>
        {dateLabel}
      </PixelText>

      <WeightPad
        value={raw}
        onChange={setRaw}
        targetMin={targetWeightMin}
        targetMax={targetWeightMax}
      />

      <PixelButton
        label="Записати"
        variant="prime"
        align="center"
        disabled={kg == null}
        style={s.stepConfirm}
        onPress={() => {
          if (kg != null) onConfirm(kg);
        }}
      />
      <PixelButton
        label="Назад до дати"
        variant="ghost"
        align="center"
        style={s.cancel}
        onPress={onBack}
      />
    </View>
  );
}

function Flow({
  routineTitle,
  now,
  initialDate,
  needsWeight = false,
  targetWeightMin,
  targetWeightMax,
  initialWeightKg,
  onCancel,
  onConfirm,
}: Omit<LogPastModalProps, 'visible'>) {
  const [picked, setPicked] = useState<Millis | null>(null);

  const afterDate = useCallback(
    (occurredAt: Millis) => {
      if (needsWeight) setPicked(occurredAt);
      else onConfirm(occurredAt);
    },
    [needsWeight, onConfirm],
  );

  if (needsWeight && picked != null) {
    return (
      <WeightStep
        routineTitle={routineTitle}
        dateLabel={formatDate(picked).toUpperCase()}
        targetWeightMin={targetWeightMin}
        targetWeightMax={targetWeightMax}
        initialWeightKg={initialWeightKg}
        onBack={() => setPicked(null)}
        onConfirm={(kg) => onConfirm(picked, kg)}
      />
    );
  }

  return (
    <Picker
      routineTitle={routineTitle}
      now={now}
      initialDate={initialDate}
      confirmLabel={needsWeight ? 'Далі — вага' : 'Записати'}
      onCancel={onCancel}
      onConfirm={afterDate}
    />
  );
}

function LogPastModal(props: LogPastModalProps) {
  const { visible, ...rest } = props;
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={rest.onCancel}>
      <View style={s.dim}>
        <Flow {...rest} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: 'rgba(4,5,8,0.82)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  card: {
    backgroundColor: C.dialog,
    borderWidth: 1,
    borderColor: C.frameOuter,
    padding: SPACING.md,
  },
  head: { borderBottomWidth: 1, borderBottomColor: C.trackEdge, paddingBottom: 4 },
  title: { marginTop: 6, marginBottom: SPACING.sm },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  week: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // 7 колонок рівно, без вимірювань — сітка лишається піксельною
  cell: { width: `${100 / 7}%`, paddingVertical: 5 },
  day: { justifyContent: 'center' },
  daySelected: { backgroundColor: C.gold },
  dayDisabled: { opacity: 0.45 },
  quick: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm },
  quickBtn: { flex: 1, paddingHorizontal: 2 },
  selected: { marginVertical: SPACING.sm },
  cancel: { marginTop: SPACING.xs },
  stepDate: { marginTop: 2, marginBottom: SPACING.sm },
  stepConfirm: { marginTop: SPACING.md },
});

export default LogPastModal;

import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import PixelButton from '@/ui/components/PixelButton';
import PixelText from '@/ui/components/PixelText';
import WeightPad, { parseWeight } from '@/ui/components/WeightPad';
import { formatKg } from '@/ui/components/format';
import { C, SPACING } from '@/ui/theme';

export interface WeightModalProps {
  visible: boolean;
  /** назва розкладу, який несе вагу — зазвичай «Зважування» */
  routineTitle: string;
  targetWeightMin?: number;
  targetWeightMax?: number;
  /** попереднє зважування — стартове значення, щоб не набирати з нуля */
  initialKg?: number;
  /** підпис під заголовком, напр. дата, якою запис піде в журнал */
  dateLabel?: string;
  onCancel: () => void;
  onConfirm: (weightKg: number) => void;
}

function Card({
  routineTitle,
  targetWeightMin,
  targetWeightMax,
  initialKg,
  dateLabel,
  onCancel,
  onConfirm,
}: Omit<WeightModalProps, 'visible'>) {
  const [raw, setRaw] = useState(() => (initialKg != null ? formatKg(initialKg) : ''));
  const kg = parseWeight(raw);

  const confirm = useCallback(() => {
    if (kg != null) onConfirm(kg);
  }, [kg, onConfirm]);

  return (
    <View style={s.card}>
      <PixelText variant="label" style={s.head}>
        ЗАПИСАТИ ВАГУ
      </PixelText>
      <PixelText variant="bright" style={s.title}>
        {routineTitle}
      </PixelText>
      {dateLabel != null ? (
        <PixelText variant="tiny" color={C.labelDim} style={s.date}>
          {dateLabel.toUpperCase()}
        </PixelText>
      ) : null}

      <View style={s.body}>
        <WeightPad
          value={raw}
          onChange={setRaw}
          targetMin={targetWeightMin}
          targetMax={targetWeightMax}
        />
      </View>

      <PixelButton
        label="Записати"
        variant="prime"
        align="center"
        disabled={kg == null}
        style={s.confirm}
        onPress={confirm}
      />
      <PixelButton
        label="Скасувати"
        variant="ghost"
        align="center"
        style={s.cancel}
        onPress={onCancel}
      />
    </View>
  );
}

/**
 * Зважування без числа — марний обряд: саме цей запис живить 20 очок Vitality
 * і трофей «Стабільний» (§8.2, §8.4).
 */
function WeightModal(props: WeightModalProps) {
  const { visible, ...rest } = props;
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={rest.onCancel}>
      <View style={s.dim}>
        <Card {...rest} />
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
  title: { marginTop: 6 },
  date: { marginTop: 2 },
  body: { marginTop: SPACING.sm },
  confirm: { marginTop: SPACING.md },
  cancel: { marginTop: SPACING.xs },
});

export default WeightModal;

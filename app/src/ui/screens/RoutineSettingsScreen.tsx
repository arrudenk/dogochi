import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { CareRoutine, QuotaPeriod, RoutineGroup } from '@/core/types';
import Panel from '@/ui/components/Panel';
import PixelButton from '@/ui/components/PixelButton';
import PixelText from '@/ui/components/PixelText';
import ScreenHeader from '@/ui/components/ScreenHeader';
import SegmentedRow from '@/ui/components/SegmentedRow';
import Stepper from '@/ui/components/Stepper';
import WardIcon from '@/ui/components/WardIcon';
import { days, times } from '@/ui/components/format';
import { C, FONT, GROUP_TITLES, SPACING } from '@/ui/theme';

export interface RoutineSettingsScreenProps {
  routines: CareRoutine[];
  /** редагований запис повертається цілим — екран нічого не зберігає сам */
  onSave: (routine: CareRoutine) => void;
  onClose: () => void;
  /** «Ритуал можна звершити будь-коли» — обіцянка з ритуалу, яку треба чимось тримати (§11) */
  onRerunRitual?: () => void;
}

const ORDER: RoutineGroup[] = ['daily', 'rite', 'journey'];

const MONTH_FORMS = ['місяць', 'місяці', 'місяців'] as const;
const PERIOD_OPTIONS = [
  { value: 'week' as QuotaPeriod, label: 'ТИЖДЕНЬ' },
  { value: 'month' as QuotaPeriod, label: 'МІСЯЦЬ' },
];
const ENABLED_OPTIONS = [
  { value: 'on' as const, label: 'УВІМК.' },
  { value: 'off' as const, label: 'ВИМК.' },
];

/** Один рядок під назвою квесту — та сама механічна мова, що й на дошці. */
function periodicityLabel(r: CareRoutine): string {
  switch (r.kind) {
    case 'slotted':
      return `${r.perDay ?? 1} × НА ДЕНЬ`;
    case 'ward': {
      const n = r.wardDays ?? 0;
      return `ОБЕРІГ НА ${n} ${days(n).toUpperCase()}`;
    }
    case 'duty': {
      const n = r.everyMonths ?? 1;
      return `РАЗ НА ${n} ${MONTH_FORMS[n === 1 ? 0 : n < 5 ? 1 : 2].toUpperCase()}`;
    }
    case 'quota': {
      const n = r.quotaCount ?? 1;
      const per = r.quotaPeriod === 'month' ? 'МІСЯЦЬ' : 'ТИЖДЕНЬ';
      return `${n} ${times(n).toUpperCase()} НА ${per}`;
    }
    case 'spawned':
      return `ПОРОДЖЕНИЙ · ${r.spawnWindowHours ?? 24} ГОД`;
    default:
      return '';
  }
}

const RoutineRow = React.memo(function RoutineRow({
  routine,
  last,
  onPress,
}: {
  routine: CareRoutine;
  last: boolean;
  onPress: (routine: CareRoutine) => void;
}) {
  const off = !routine.enabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Редагувати: ${routine.title}`}
      onPress={() => onPress(routine)}
      style={({ pressed }) => [s.row, last ? null : s.divider, pressed ? s.pressed : null]}
    >
      <View style={s.icon}>
        <WardIcon name={routine.icon} px={2} dead={off} />
      </View>
      <View style={s.text}>
        <PixelText variant="soft" color={off ? C.muted : undefined}>
          {routine.title}
        </PixelText>
        <PixelText variant="tiny" color={C.muted} style={s.sub}>
          {off ? 'ВИМКНЕНО' : periodicityLabel(routine)}
        </PixelText>
      </View>
      <PixelText variant="tiny" color={C.label}>
        {`+${routine.xp}`}
      </PixelText>
      <PixelText variant="tiny" color={C.labelDim}>
        ›
      </PixelText>
    </Pressable>
  );
});

/** Редактор одного розкладу. Поля рівно ті, що має сенс крутити для його типу. */
function Editor({
  routine,
  onCancel,
  onSave,
}: {
  routine: CareRoutine;
  onCancel: () => void;
  onSave: (routine: CareRoutine) => void;
}) {
  const [draft, setDraft] = useState<CareRoutine>(routine);
  const patch = useCallback(
    (next: Partial<CareRoutine>) => setDraft((prev) => ({ ...prev, ...next })),
    [],
  );

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(routine),
    [draft, routine],
  );
  const valid = draft.title.trim().length > 0;

  return (
    <View style={s.root}>
      <ScreenHeader title="РОЗКЛАД" onClose={onCancel} closeLabel="НАЗАД" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Panel title="Назва" style={s.block}>
          <TextInput
            value={draft.title}
            onChangeText={(title) => patch({ title })}
            allowFontScaling={false}
            placeholder="Назва квесту"
            placeholderTextColor={C.labelDim}
            style={s.input}
          />
          {routine.hint != null ? (
            <PixelText variant="tiny" color={C.labelDim} style={s.hint}>
              {routine.hint}
            </PixelText>
          ) : null}
        </Panel>

        <Panel title="Періодичність" style={s.block}>
          {draft.kind === 'slotted' ? (
            <Stepper
              label="РАЗІВ НА ДЕНЬ"
              value={draft.perDay ?? 1}
              min={1}
              max={12}
              onChange={(perDay) => patch({ perDay })}
            />
          ) : null}

          {draft.kind === 'ward' ? (
            <Stepper
              label="ТРИВАЛІСТЬ ОБЕРЕГА"
              value={draft.wardDays ?? 30}
              min={1}
              max={365}
              format={(n) => `${n} ${days(n)}`}
              onChange={(wardDays) => patch({ wardDays })}
            />
          ) : null}

          {draft.kind === 'duty' ? (
            <Stepper
              label="РАЗ НА"
              value={draft.everyMonths ?? 1}
              min={1}
              max={36}
              format={(n) => `${n} ${MONTH_FORMS[n === 1 ? 0 : n < 5 ? 1 : 2]}`}
              onChange={(everyMonths) => patch({ everyMonths })}
            />
          ) : null}

          {draft.kind === 'quota' ? (
            <>
              <Stepper
                label="РАЗІВ ЗА ПЕРІОД"
                value={draft.quotaCount ?? 1}
                min={1}
                max={30}
                onChange={(quotaCount) => patch({ quotaCount })}
              />
              <SegmentedRow
                label="ПЕРІОД"
                value={draft.quotaPeriod ?? 'week'}
                options={PERIOD_OPTIONS}
                onChange={(quotaPeriod) => patch({ quotaPeriod })}
              />
            </>
          ) : null}

          {draft.kind === 'spawned' ? (
            <Stepper
              label="ВІКНО ПІСЛЯ ПОДІЇ"
              value={draft.spawnWindowHours ?? 24}
              min={1}
              max={168}
              format={(n) => `${n} год`}
              onChange={(spawnWindowHours) => patch({ spawnWindowHours })}
            />
          ) : null}
        </Panel>

        <Panel title="Вага в прогресії" style={s.block}>
          <Stepper
            label="XP ЗА ВИКОНАННЯ"
            value={draft.xp}
            min={10}
            max={10_000}
            step={draft.xp >= 1000 ? 100 : draft.xp >= 200 ? 50 : 10}
            onChange={(xp) => patch({ xp })}
          />
          <PixelText variant="tiny" color={C.labelDim} style={s.hint}>
            ВАГА ОБЕРНЕНО ПРОПОРЦІЙНА ЧАСТОТІ — ПРОГРЕСІЯ ТЯГНЕ ТУДИ, ДЕ ЛЕГКО ЗАБУТИ
          </PixelText>
        </Panel>

        <Panel title="Стан" style={s.block}>
          <SegmentedRow
            label="РОЗКЛАД"
            value={draft.enabled ? 'on' : 'off'}
            options={ENABLED_OPTIONS}
            onChange={(v) => patch({ enabled: v === 'on' })}
          />
          {draft.kind === 'duty' ? (
            <SegmentedRow
              label="СТРАХОВКА В КАЛЕНДАРІ"
              value={draft.calendarBackup === true ? 'on' : 'off'}
              options={ENABLED_OPTIONS}
              onChange={(v) => patch({ calendarBackup: v === 'on' })}
            />
          ) : null}
        </Panel>

        <PixelButton
          label="Зберегти"
          variant="prime"
          align="center"
          disabled={!dirty || !valid}
          onPress={() => onSave({ ...draft, title: draft.title.trim() })}
        />
      </ScrollView>
    </View>
  );
}

/**
 * Спека §15 п.2: каталог догляду редагований. «Обробка раз на 3 тижні замість 4» —
 * це редагування запису, а не правка коду, тому екран мусить існувати.
 */
function RoutineSettingsScreen({
  routines,
  onSave,
  onClose,
  onRerunRitual,
}: RoutineSettingsScreenProps) {
  const [editing, setEditing] = useState<CareRoutine | null>(null);

  const groups = useMemo(
    () =>
      ORDER.map((key) => ({
        key,
        title: GROUP_TITLES[key],
        items: routines.filter((r) => r.group === key),
      })).filter((g) => g.items.length > 0),
    [routines],
  );

  const save = useCallback(
    (routine: CareRoutine) => {
      onSave(routine);
      setEditing(null);
    },
    [onSave],
  );

  if (editing != null) {
    return <Editor routine={editing} onCancel={() => setEditing(null)} onSave={save} />;
  }

  return (
    <View style={s.root}>
      <ScreenHeader title="ДОГЛЯД" onClose={onClose} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {groups.map((g) => (
          <Panel key={g.key} title={g.title} right={`${g.items.length}`} style={s.block}>
            {g.items.map((r, i) => (
              <RoutineRow
                key={r.id}
                routine={r}
                last={i === g.items.length - 1}
                onPress={setEditing}
              />
            ))}
          </Panel>
        ))}

        {onRerunRitual != null ? (
          <Panel title="Ритуал виклику" style={s.block}>
            <PixelText variant="tiny" color={C.labelDim} style={s.hint}>
              РИТУАЛ МОЖНА ЗВЕРШИТИ БУДЬ-КОЛИ — П'ЯТЬ КАДРІВ ПЕРЕКУЮТЬ СПРАЙТИ НАНОВО
            </PixelText>
            <PixelButton
              label="Звершити ритуал знову"
              align="center"
              style={s.ritual}
              onPress={onRerunRitual}
            />
          </Panel>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.sm, paddingBottom: SPACING.xl },
  block: { marginBottom: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 7,
    paddingHorizontal: 2,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  pressed: { opacity: 0.6 },
  icon: { width: 16, alignItems: 'center' },
  text: { flex: 1 },
  sub: { marginTop: 1 },
  input: {
    backgroundColor: C.track,
    borderWidth: 1,
    borderColor: C.frameInner,
    color: C.text,
    fontFamily: FONT.body,
    fontSize: FONT.sizeSm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  hint: { marginTop: SPACING.xs, lineHeight: 14 },
  ritual: { marginTop: SPACING.sm },
});

export default RoutineSettingsScreen;

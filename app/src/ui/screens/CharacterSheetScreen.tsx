import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ComputedState, Dog, Ward } from '@/core/types';
import DogSprite from '@/ui/components/DogSprite';
import Panel from '@/ui/components/Panel';
import PixelText from '@/ui/components/PixelText';
import ScreenHeader from '@/ui/components/ScreenHeader';
import StatBar from '@/ui/components/StatBar';
import WardIcon from '@/ui/components/WardIcon';
import XpBar from '@/ui/components/XpBar';
import PixelButton from '@/ui/components/PixelButton';
import { formatWeight, formatWeightRange, formatXp, wardStatusLabel } from '@/ui/components/format';
import type { SpriteMap } from '@/ui/components/types';
import { C, METRICS, SPACING, STAT_COLORS, STAT_LABELS } from '@/ui/theme';

export interface CharacterSheetScreenProps {
  state: ComputedState;
  dog: Dog;
  /** клас персонажа; за замовчуванням «НІЧНИЙ ГОНЕЦЬ» (§3) */
  className?: string;
  /** XP за поточний рік — підпис під смужкою, якщо двигун його дає */
  yearXp?: number;
  sprites?: SpriteMap;
  onClose: () => void;
  /** вхід у редактор каталогу догляду (§15 п.2) */
  onOpenRoutines?: () => void;
  /** зважування прямо з листа — саме тут видно, що ваги немає */
  onLogWeight?: () => void;
}

/** Ваговий діапазон упаковки протипаразитарного засобу — константа реальності, не пса (§3). */
const POTION_BAND = '10–20 кг';

/** табличка рівня зверху + підпис класу знизу — простір, що спрайту не належить */
const PORTRAIT_CHROME = 26;

interface WardRow {
  ward: Ward;
  /** 0..100, скільки оберега лишилось */
  remaining: number;
  label: string;
}

const STAT_KEYS = ['vitality', 'stamina', 'coat', 'bond'] as const;

const WardTile = React.memo(function WardTile({ row }: { row: WardRow }) {
  const dead = !row.ward.active;
  return (
    <View style={[s.buff, dead ? s.buffDead : null]}>
      <WardIcon name={row.ward.icon} px={METRICS.iconPx} dead={dead} />
      <PixelText variant="tiny" align="center" color={C.muted} style={s.buffName} numberOfLines={1}>
        {row.ward.title.toUpperCase()}
      </PixelText>
      <PixelText variant="tiny" align="center" color={dead ? C.danger : C.wardOkText}>
        {row.label}
      </PixelText>
      <StatBar
        value={row.remaining}
        color={dead ? C.danger : C.wardOkText}
        height={3}
        style={s.buffBar}
      />
    </View>
  );
});

function CharacterSheetScreen({
  state,
  dog,
  className = 'НІЧНИЙ ГОНЕЦЬ',
  yearXp,
  sprites,
  onClose,
  onOpenRoutines,
  onLogWeight,
}: CharacterSheetScreenProps) {
  const wards = useMemo<WardRow[]>(
    () =>
      state.wards.map((w) => {
        const span = w.expiresAt - w.startedAt;
        const left = w.expiresAt - state.now;
        return {
          ward: w,
          remaining: span > 0 ? Math.max(0, Math.min(100, (left / span) * 100)) : 0,
          label: wardStatusLabel(w.daysLeft, w.active),
        };
      }),
    [state.wards, state.now],
  );

  const weightLine = useMemo(() => {
    if (state.lastWeightKg == null) return 'НЕ ЗВАЖУВАВСЯ';
    const status = state.weightInRange === false ? 'поза діапазоном' : 'у нормі';
    return `${formatWeight(state.lastWeightKg)} · ${status}`;
  }, [state.lastWeightKg, state.weightInRange]);

  const targetLine = formatWeightRange(dog.targetWeightMin, dog.targetWeightMax);

  return (
    <View style={s.root}>
      <ScreenHeader title={dog.name.toUpperCase()} onClose={onClose} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.portrait}>
          <View style={s.plate}>
            <XpBar
              level={state.level}
              xpIntoLevel={state.xpIntoLevel}
              xpPerLevel={state.xpPerLevel}
              note={yearXp != null ? `${formatXp(yearXp)} ЗА РІК` : undefined}
              width={170}
            />
          </View>
          <View style={s.portraitDog}>
            <DogSprite
              pose="portrait"
              sprites={sprites}
              px={6}
              maxSide={METRICS.portraitHeight - PORTRAIT_CHROME}
            />
          </View>
          <PixelText variant="tiny" align="center" style={s.className}>
            {className}
          </PixelText>
        </View>

        <Panel title="Стан" style={s.block}>
          {STAT_KEYS.map((k, i) => (
            <StatBar
              key={k}
              label={STAT_LABELS[k]}
              value={state.stats[k]}
              color={STAT_COLORS[k]}
              style={i === STAT_KEYS.length - 1 ? undefined : s.stat}
            />
          ))}
        </Panel>

        <Panel title="Оберіги" style={s.block}>
          {wards.length > 0 ? (
            <View style={s.buffs}>
              {wards.map((row) => (
                <WardTile key={row.ward.routineId} row={row} />
              ))}
            </View>
          ) : (
            <PixelText variant="tiny" color={C.muted}>
              ЖОДНОГО ОБЕРЕГА НЕ ВИДАНО
            </PixelText>
          )}
        </Panel>

        <Panel title="Звір">
          <Kv k="ВІК" v={state.ageLabel} />
          <Kv k="ВАГА" v={weightLine} danger={state.weightInRange === false} />
          <Kv k="ЦІЛЬОВА ВАГА" v={targetLine} />
          <Kv k="ПОРОДА" v={dog.breedNote} />
          <Kv k="ДІАПАЗОН ЗІЛЛЯ" v={POTION_BAND} />
          <Kv k="МІСЦЬ ВІДКРИТО" v={String(state.placesCount)} />
          <Kv k="ПОХОДІВ У ЛІС" v={String(state.journeysCount)} />
          <Kv k="ВСЬОГО XP" v={formatXp(state.totalXp)} last />
        </Panel>

        {onLogWeight != null ? (
          <PixelButton
            label={state.lastWeightKg == null ? 'Записати вагу' : 'Зважити наново'}
            align="center"
            style={s.cta}
            onPress={onLogWeight}
          />
        ) : null}
        {onOpenRoutines != null ? (
          <PixelButton
            label="Налаштування догляду"
            hint="→ періодичність"
            align="center"
            style={s.cta}
            onPress={onOpenRoutines}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const Kv = React.memo(function Kv({
  k,
  v,
  danger = false,
  last = false,
}: {
  k: string;
  v: string;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[s.kv, last ? null : s.kvDivider]}>
      <PixelText variant="tiny" color={C.label}>
        {k}
      </PixelText>
      <PixelText variant="tiny" color={danger ? C.danger : C.textSoft} style={s.kvValue}>
        {v}
      </PixelText>
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.sm, paddingBottom: SPACING.xl },
  portrait: {
    height: METRICS.portraitHeight + 20,
    borderWidth: 1,
    borderColor: C.frameInner,
    backgroundColor: C.panelDeep,
    marginBottom: SPACING.sm,
    justifyContent: 'flex-end',
  },
  plate: { position: 'absolute', top: SPACING.sm, left: 0, right: 0, alignItems: 'center' },
  portraitDog: { alignItems: 'center', marginBottom: SPACING.sm },
  className: { marginBottom: SPACING.xs },
  block: { marginBottom: SPACING.sm },
  cta: { marginTop: SPACING.sm },
  stat: { marginBottom: SPACING.xs + 1 },
  buffs: { flexDirection: 'row', gap: SPACING.xs + 2 },
  buff: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#12141b',
    borderWidth: 1,
    borderColor: C.frameInner,
    paddingVertical: SPACING.xs,
    paddingHorizontal: 2,
  },
  buffDead: { borderColor: C.dangerEdge },
  buffName: { marginTop: 3 },
  buffBar: { alignSelf: 'stretch', marginTop: 3 },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: SPACING.sm,
  },
  kvDivider: { borderBottomWidth: 1, borderBottomColor: C.dividerSoft },
  kvValue: { flexShrink: 1, textAlign: 'right' },
});

export default CharacterSheetScreen;

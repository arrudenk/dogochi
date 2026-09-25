import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';
import PixelText from '@/ui/components/PixelText';
import WardIcon from '@/ui/components/WardIcon';
import { formatXp } from '@/ui/components/format';
import { C, SPACING } from '@/ui/theme';

export interface RiteCompleteScreenProps {
  visible: boolean;
  /** скільки XP дав обряд */
  xp: number;
  levelFrom: number;
  levelTo: number;
  /** один рядок голосом Балу — дефіцитний ресурс (§9) */
  baluLine: string;
  /** «ОБЕРІГ ЦІЛИТЕЛЯ ВІДНОВЛЕНО» */
  wardTitle?: string;
  /** «ЧИННИЙ 6 МІСЯЦІВ · VITALITY 68 → 94» */
  wardDetail?: string;
  wardIcon?: string;
  onDismiss: () => void;
}

const SPARKS = [
  { x: 0.18, y: 0.42 },
  { x: 0.34, y: 0.62 },
  { x: 0.5, y: 0.78 },
  { x: 0.66, y: 0.5 },
  { x: 0.82, y: 0.66 },
  { x: 0.28, y: 0.3 },
] as const;

const COUNTER_STEPS = 24;
const COUNTER_MS = 900;

const Spark = React.memo(function Spark({
  x,
  y,
  progress,
}: {
  x: number;
  y: number;
  progress: Animated.Value;
}) {
  const rise = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const opacity = progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.spark,
        { left: `${x * 100}%`, bottom: `${y * 100}%`, opacity, transform: [{ translateY: rise }] },
      ]}
    />
  );
});

/**
 * Єдине місце в апці з анімацією. Трапляється кілька разів на рік, тому може дозволити
 * собі бути дорогим — але повністю знімається разом з модалкою: компонент монтується
 * тільки коли visible, і всі Animated.Value вмирають з ним.
 */
function Spectacle({
  xp,
  levelFrom,
  levelTo,
  baluLine,
  wardTitle,
  wardDetail,
  wardIcon = 'shield',
  onDismiss,
}: Omit<RiteCompleteScreenProps, 'visible'>) {
  const ring = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const sparks = useRef(SPARKS.map(() => new Animated.Value(0))).current;
  const wardIn = useRef(new Animated.Value(0)).current;
  const [level, setLevel] = useState(levelFrom);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const seq = Animated.parallel([
      Animated.timing(ring, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(260),
        Animated.spring(burst, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      Animated.stagger(
        90,
        sparks.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: 1100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ),
      ),
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(wardIn, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
    ]);
    seq.start();

    // лічильник рівня йде окремо: число — це стан, його не можна віддати нативному драйверу
    let step = 0;
    const id = setInterval(() => {
      step++;
      if (step >= COUNTER_STEPS) {
        setLevel(levelTo);
        clearInterval(id);
        return;
      }
      setLevel(Math.round(levelFrom + ((levelTo - levelFrom) * step) / COUNTER_STEPS));
    }, COUNTER_MS / COUNTER_STEPS);

    return () => {
      seq.stop();
      clearInterval(id);
    };
  }, [burst, glow, levelFrom, levelTo, ring, sparks, wardIn]);

  const ringStyle = useMemo(
    () => ({
      opacity: ring,
      transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
    }),
    [ring],
  );
  const burstStyle = useMemo(
    () => ({
      opacity: burst,
      transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
    }),
    [burst],
  );

  return (
    <Pressable style={s.root} onPress={onDismiss} accessibilityRole="button">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="rite" cx="50%" cy="72%" r="62%">
              <Stop offset="0" stopColor={C.gold} stopOpacity={0.3} />
              <Stop offset="1" stopColor={C.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#rite)" />
        </Svg>
      </Animated.View>

      <Animated.View style={[s.rings, ringStyle]} pointerEvents="none">
        <Svg width={240} height={92} viewBox="0 0 240 92">
          <Ellipse
            cx={120}
            cy={62}
            rx={98}
            ry={28}
            stroke={C.gold}
            strokeOpacity={0.22}
            strokeWidth={1}
            fill="none"
          />
          <Ellipse
            cx={120}
            cy={70}
            rx={75}
            ry={22}
            stroke={C.gold}
            strokeOpacity={0.55}
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      </Animated.View>

      {SPARKS.map((p, i) => (
        <Spark key={i} x={p.x} y={p.y} progress={sparks[i] as Animated.Value} />
      ))}

      <Animated.View style={[s.burst, burstStyle]} pointerEvents="none">
        <PixelText variant="value" align="center" color={C.spark} style={s.xp}>
          {`+${formatXp(xp)} XP`}
        </PixelText>
        <PixelText variant="tiny" align="center" color={C.gold} style={s.lvup}>
          {`УР. ${levelFrom} → ${level}`}
        </PixelText>
        <PixelText variant="body" align="center" color={C.baluVoice} style={s.say}>
          {`«${baluLine}»`}
        </PixelText>
        <PixelText variant="tiny" align="center" style={s.sayWho}>
          БАЛУ
        </PixelText>
      </Animated.View>

      {wardTitle != null ? (
        <Animated.View style={[s.wardRow, { opacity: wardIn }]} pointerEvents="none">
          <WardIcon name={wardIcon} px={3} />
          <View style={s.wardText}>
            <PixelText variant="tiny" color={C.wardOkText}>
              {wardTitle}
            </PixelText>
            {wardDetail != null ? (
              <PixelText variant="tiny" color={C.wardOkDim} style={s.wardDetail}>
                {wardDetail}
              </PixelText>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      <PixelText variant="tiny" align="center" style={s.tapOut}>
        ТАП — ПРОДОВЖИТИ
      </PixelText>
    </Pressable>
  );
}

function RiteCompleteScreen(props: RiteCompleteScreenProps) {
  const { visible, onDismiss, ...rest } = props;
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={s.dim}>
        <Spectacle {...rest} onDismiss={onDismiss} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(6,7,10,0.94)' },
  root: { flex: 1, justifyContent: 'center' },
  rings: { position: 'absolute', left: 0, right: 0, bottom: 120, alignItems: 'center' },
  spark: { position: 'absolute', width: 2, height: 2, backgroundColor: C.spark },
  burst: { alignItems: 'center', paddingHorizontal: SPACING.xl },
  xp: { fontSize: 26, fontWeight: '700' },
  lvup: { marginTop: 6 },
  say: { marginTop: SPACING.md },
  sayWho: { marginTop: 6 },
  wardRow: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    bottom: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#12141b',
    borderWidth: 1,
    borderColor: C.wardOkEdge,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
  },
  wardText: { flex: 1 },
  wardDetail: { marginTop: 2 },
  tapOut: { position: 'absolute', left: 0, right: 0, bottom: SPACING.sm },
});

export default RiteCompleteScreen;

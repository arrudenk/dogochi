/** One frame of the summoning: silhouette hint, three tips, take / pick / skip. */

import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, FONT, SPACING } from '../../ui/theme';
import { SPRITES, SPRITE_SIZE } from '../spriteAssets';
import { RITUAL_TIPS, type RitualStepSpec } from './poses';

export interface RitualStepProps {
  spec: RitualStepSpec;
  index: number;
  total: number;
  busy?: boolean;
  error?: string | null;
  /** Result of this step, if it already succeeded. */
  previewUri?: string | null;
  onCamera: () => void;
  onLibrary: () => void;
  onSkip: () => void;
}

export function RitualStep({
  spec,
  index,
  total,
  busy,
  error,
  previewUri,
  onCamera,
  onLibrary,
  onSkip,
}: RitualStepProps) {
  const hintSize = SPRITE_SIZE[spec.pose];
  const scale = Math.floor(160 / hintSize.h);

  return (
    <View style={s.wrap}>
      <Text style={s.step}>
        КРОК {index + 1} З {total}
      </Text>
      <Text style={s.title}>{spec.title}</Text>

      <View style={s.stage}>
        {busy ? (
          <ActivityIndicator color={C.gold} />
        ) : (
          <Image
            source={previewUri ? { uri: previewUri } : SPRITES[spec.pose]}
            style={{
              width: hintSize.w * scale,
              height: hintSize.h * scale,
              opacity: previewUri ? 1 : 0.35,
            }}
            resizeMode="contain"
            fadeDuration={0}
          />
        )}
      </View>

      <Text style={s.hint}>{spec.hint}</Text>

      <View style={s.tips}>
        {RITUAL_TIPS.map((t) => (
          <Text key={t} style={s.tip}>
            · {t}
          </Text>
        ))}
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.actions}>
        <Btn label="ЗНЯТИ" gold onPress={onCamera} disabled={busy} />
        <Btn label="З ГАЛЕРЕЇ" onPress={onLibrary} disabled={busy} />
        <Btn label="ПРОПУСТИТИ" onPress={onSkip} disabled={busy} />
      </View>
    </View>
  );
}

function Btn({
  label,
  onPress,
  gold,
  disabled,
}: {
  label: string;
  onPress: () => void;
  gold?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.btn, gold && s.btnGold, disabled && s.btnOff]}
    >
      <Text style={[s.btnText, gold && { color: C.gold }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', padding: SPACING.lg },
  step: { color: C.muted, fontSize: FONT.sizeSm, letterSpacing: FONT.letter },
  title: {
    color: C.gold,
    fontSize: FONT.sizeXl,
    letterSpacing: FONT.letter * 2,
    marginTop: SPACING.xs,
  },
  stage: {
    height: 176,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: C.frameInner,
    backgroundColor: C.panelDeep,
  },
  hint: { color: C.text, fontSize: FONT.size, marginTop: SPACING.md, textAlign: 'center' },
  tips: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  tip: { color: C.muted, fontSize: FONT.sizeSm, letterSpacing: FONT.letter },
  error: { color: C.danger, fontSize: FONT.sizeSm, marginTop: SPACING.md, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  btn: {
    borderWidth: 1,
    borderColor: C.frameInner,
    backgroundColor: C.panel,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  btnGold: { borderColor: C.frameOuter },
  btnOff: { opacity: 0.4 },
  btnText: { color: C.text, fontSize: FONT.sizeSm, letterSpacing: FONT.letter },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import type { HeraldAction, HeraldItem } from '@/core/types';
import Frame from '@/ui/components/Frame';
import PixelButton, { type PixelButtonVariant } from '@/ui/components/PixelButton';
import PixelText from '@/ui/components/PixelText';
import { C, SPACING } from '@/ui/theme';

export interface HeraldModalProps {
  visible: boolean;
  item: HeraldItem | null;
  /** сірий рядок під текстом — «ОСТАННІЙ ОГЛЯД — 12 ТРАВНЯ · +4000 XP» */
  meta?: string;
  onAction: (item: HeraldItem, action: HeraldAction) => void;
  /** тап поза діалогом; якщо не задано — діалог не закривається без рішення */
  onDismiss?: () => void;
}

const CHARS_PER_TICK = 2;
const TICK_MS = 22;

function variantFor(kind: HeraldAction['kind'], first: boolean): PixelButtonVariant {
  if (kind === 'dismiss') return 'ghost';
  return first ? 'prime' : 'normal';
}

function hintFor(kind: HeraldAction['kind']): string | undefined {
  return kind === 'calendar' ? '→ календар' : undefined;
}

/**
 * Герольд. Кнопки з'являються після того, як текст доїхав, — і це весь механізм:
 * ніяких форсованих таймерів і зворотних відліків (§9).
 */
function HeraldDialog({ item, meta, onAction }: { item: HeraldItem; meta?: string; onAction: HeraldModalProps['onAction'] }) {
  const body = item.body;
  const [shown, setShown] = useState(0);
  const done = shown >= body.length;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setShown(0);
    fade.setValue(0);
    const id = setInterval(() => {
      setShown((n) => {
        const next = n + CHARS_PER_TICK;
        if (next >= body.length) clearInterval(id);
        return Math.min(next, body.length);
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [body, fade]);

  useEffect(() => {
    if (!done) return;
    const anim = Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [done, fade]);

  const skip = useCallback(() => setShown(body.length), [body.length]);
  const text = useMemo(() => body.slice(0, shown), [body, shown]);

  return (
    <Frame background={C.dialog} innerStyle={s.dlg}>
      <PixelText variant="label" style={s.who}>
        ХРОНІКА
      </PixelText>
      <Pressable onPress={skip} accessibilityRole="text" accessibilityLabel={body}>
        <PixelText variant="bright" style={s.line}>
          {text}
        </PixelText>
      </Pressable>
      {meta != null ? (
        <PixelText variant="tiny" style={s.meta}>
          {meta}
        </PixelText>
      ) : null}

      {done ? (
        <Animated.View style={{ opacity: fade }}>
          {item.actions.map((a, i) => (
            <PixelButton
              key={`${a.kind}-${i}`}
              label={a.label}
              hint={hintFor(a.kind)}
              variant={variantFor(a.kind, i === 0)}
              style={s.action}
              onPress={() => onAction(item, a)}
            />
          ))}
        </Animated.View>
      ) : null}
    </Frame>
  );
}

function HeraldModal({ visible, item, meta, onAction, onDismiss }: HeraldModalProps) {
  if (!visible || item == null) return null;
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={s.dim} onPress={onDismiss} disabled={onDismiss == null} />
      <View style={s.anchor} pointerEvents="box-none">
        <HeraldDialog item={item} meta={meta} onAction={onAction} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4,5,8,0.78)',
  },
  anchor: { flex: 1, justifyContent: 'flex-end', padding: SPACING.md },
  dlg: { padding: SPACING.md },
  who: { borderBottomWidth: 1, borderBottomColor: C.trackEdge, paddingBottom: 4, marginBottom: 6 },
  line: { minHeight: 40, marginBottom: 6 },
  meta: { marginTop: 4, marginBottom: 9 },
  action: { marginTop: 5 },
});

export default HeraldModal;

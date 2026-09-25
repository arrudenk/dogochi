/**
 * Ритуал виклику — the five-step flow (spec §11), and the §13 fallbacks around it.
 *
 * Nothing here can block the app: any step may be skipped, any failure falls through to
 * the archetype sprite, and a denied Photos permission still leaves the camera. The
 * caller gets whatever succeeded plus the accent palette.
 */

import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SpritePose } from '../../core/types';
import { C, FONT, SPACING } from '../../ui/theme';
import { decodeToRGBA, writeSpritePng } from '../imageIO';
import { pixelize } from '../pipeline';
import { PixelEditor, toDoc, fromDoc, type PixelDoc } from '../editor/PixelEditor';
import { createBuffer } from '../types';
import { RITUAL_STEPS } from './poses';
import { RitualStep } from './RitualStep';

export type SpriteUris = Partial<Record<SpritePose, string>>;

export interface RitualFlowProps {
  /** Shown in the chrome; also the key the sprite files are written under. */
  dogName?: string;
  dogId?: string;
  /** Called once, with whatever succeeded. Skipping everything is a valid outcome. */
  onFinish: (sprites: SpriteUris, palette: string[]) => void | Promise<void>;
}

export function RitualFlow({ dogName, dogId = dogName ?? 'balu', onFinish }: RitualFlowProps) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sprites, setSprites] = useState<SpriteUris>({});
  const [palette, setPalette] = useState<string[]>([]);
  const [editing, setEditing] = useState<PixelDoc | null>(null);

  const spec = RITUAL_STEPS[index];

  const advance = useCallback(
    (next: SpriteUris, pal: string[]) => {
      if (index + 1 >= RITUAL_STEPS.length) void onFinish(next, pal);
      else setIndex(index + 1);
    },
    [index, onFinish]
  );

  const run = useCallback(
    async (uri: string) => {
      setBusy(true);
      setError(null);
      try {
        // One photo in memory at a time; `pixelize` consumes the buffer and the only
        // thing that outlives this scope is the 64×64 sprite.
        const result = pixelize(await decodeToRGBA(uri), { size: spec.size });
        if (!result.maskFound) {
          setError('Фон не відокремився — доопрацюй у редакторі або пропусти');
        }
        setPalette((p) => (p.length ? p : result.palette));
        setEditing(toDoc(result.sprite));
      } catch {
        // §13: the quest is never blocked. Skipping leaves the archetype in place.
        setError('Не вдалось обробити знімок. Можна спробувати ще раз або пропустити.');
      } finally {
        setBusy(false);
      }
    },
    [spec.size]
  );

  const pick = useCallback(
    async (camera: boolean) => {
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(camera ? 'Доступ до камери не дано' : 'Доступ до Фото не дано — лишається камера');
        return;
      }
      const res = camera
        ? await ImagePicker.launchCameraAsync({ quality: 1, exif: false })
        : await ImagePicker.launchImageLibraryAsync({ quality: 1, exif: false });
      if (res.canceled || !res.assets?.length) return;
      await run(res.assets[0].uri);
    },
    [run]
  );

  const commit = useCallback(async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const img = fromDoc(editing, createBuffer(editing.size, editing.size));
      const uri = await writeSpritePng(img, dogId, spec.pose);
      const next = { ...sprites, [spec.pose]: uri };
      setSprites(next);
      setEditing(null);
      advance(next, palette);
    } catch {
      setError('Не вдалось зберегти спрайт');
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }, [advance, dogId, editing, palette, spec.pose, sprites]);

  if (editing) {
    return (
      <ScrollView contentContainerStyle={s.page}>
        <Text style={s.title}>ВИКУЙ</Text>
        <Text style={s.sub}>Автоматика дає близько 80%. Очі й вуха — руками.</Text>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <PixelEditor
          doc={editing}
          onChange={setEditing}
          onDone={commit}
          boardSize={editing.size === 96 ? 288 : 320}
        />
        <Pressable onPress={() => { setEditing(null); }} style={s.link}>
          <Text style={s.linkText}>ВІДМІНИТИ ЦЕЙ КАДР</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page}>
      <RitualStep
        spec={spec}
        index={index}
        total={RITUAL_STEPS.length}
        busy={busy}
        error={error}
        previewUri={sprites[spec.pose] ?? null}
        onCamera={() => void pick(true)}
        onLibrary={() => void pick(false)}
        onSkip={() => { setError(null); advance(sprites, palette); }}
      />
      <Pressable onPress={() => void onFinish(sprites, palette)} style={s.link}>
        <Text style={s.linkText}>ПРОПУСТИТИ ВЕСЬ РИТУАЛ</Text>
      </Pressable>
      <Text style={s.foot}>
        Пропущене не втрачається: Балу зʼявиться в архетипному вигляді, а ритуал можна
        звершити будь-коли.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: SPACING.lg, alignItems: 'center', backgroundColor: C.bg, flexGrow: 1 },
  title: { color: C.gold, fontSize: FONT.sizeXl, letterSpacing: FONT.letter * 2 },
  sub: { color: C.muted, fontSize: FONT.sizeSm, marginBottom: SPACING.lg, textAlign: 'center' },
  error: { color: C.danger, fontSize: FONT.sizeSm, marginBottom: SPACING.md, textAlign: 'center' },
  link: { marginTop: SPACING.xl, padding: SPACING.sm },
  linkText: { color: C.muted, fontSize: FONT.sizeSm, letterSpacing: FONT.letter },
  foot: {
    color: C.muted,
    fontSize: FONT.sizeSm,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
});

export default RitualFlow;

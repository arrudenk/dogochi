/** Палітра й метрики чрому. Спека §12. Чром тримається тут, а не хардкодиться по екранах. */

import { Platform } from 'react-native';

export const C = {
  bg: '#0d0f14',
  panel: '#15171f',
  panelDeep: '#0f1118',
  frameInner: '#3a3223',
  frameOuter: '#6b5c3c',
  gold: '#d9a54a',
  text: '#c9b98f',
  muted: '#6d6349',
  danger: '#c9564a',

  coatBody: '#2b3040',
  coatShadow: '#13151d',
  coatRim: '#6b7a99',
  eye: '#d9a54a',

  vitality: '#6f9c5a',
  stamina: '#8a6fae',
  coat: '#c8a558',
  bond: '#b5634a',

  // ── розширення під мокапи ───────────────────────────────────────────────
  /** тло діалогу герольда й шапки */
  dialog: '#12100c',
  headTop: '#1c1a14',
  /** внутрішній «inset» кант панелі з мокапу */
  panelInset: '#23202a',
  /** жолоб будь-якої смужки */
  track: '#0a0b0f',
  trackEdge: '#2a2519',
  /** підписи панелей */
  label: '#8a7d5c',
  labelDim: '#5f5741',
  /** основний текст рядка квесту */
  textSoft: '#bfae84',
  /** текст хроніки в діалозі */
  textBright: '#d9c9a0',
  divider: '#1e1b14',
  dividerSoft: '#1a1811',
  /** рамка згаслого оберега */
  dangerEdge: '#5a2f2a',
  dangerBox: '#8a3a32',

  // сцена лігва
  skyTop: '#141926',
  skyBottom: '#0e1119',
  floorTop: '#0b0d12',
  floorBottom: '#090a0e',
  floorStripe: '#0e1117',
  floorEdge: '#262d3a',
  windowGlass: '#0f1521',
  windowFrame: '#2d3442',
  moon: '#c9c3a8',

  // обряд звершено
  spark: '#e8c878',
  baluVoice: '#9fb0c9',
  wardOkEdge: '#4a6a4a',
  wardOkText: '#8fae7a',
  wardOkDim: '#5f7350',
} as const;

/** Палітра піксельних іконок: один символ у сітці -> колір. */
export const PIXEL_PALETTE: Record<string, string> = {
  b: C.coatBody,
  d: C.coatShadow,
  o: C.coatRim,
  e: C.gold,
  g: C.muted,
  r: C.danger,
  w: '#c9c3a8',
  a: '#6a9a7a',
  f: '#8a5a3a',
  c: '#3a2f4a',
  s: '#8a94a8',
};

export const STAT_COLORS = {
  vitality: C.vitality,
  stamina: C.stamina,
  coat: C.coat,
  bond: C.bond,
} as const;

export const STAT_LABELS = {
  vitality: 'VITALITY',
  stamina: 'STAMINA',
  coat: 'COAT',
  bond: 'BOND',
} as const;

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 18, xl: 28 } as const;

export const FONT = {
  /** Системний моноширинний — тримає «реєстр бестіарію» без сторонніх шрифтів. */
  body: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as
    | string
    | undefined,
  sizeTiny: 9,
  sizeSm: 11,
  size: 13,
  sizeLg: 16,
  sizeXl: 22,
  letter: 1.2,
  letterWide: 1.8,
};

/** Метрики чрому з мокапів — тримаються тут, щоб не розповзтись по екранах. */
export const METRICS = {
  denHeight: 190,
  portraitHeight: 150,
  barHeight: 6,
  xpBarHeight: 4,
  checkbox: 16,
  /** множник пікселя для іконок та спрайтів — тільки цілі числа, без згладжування */
  iconPx: 3,
  spritePx: 5,
} as const;

export const GROUP_TITLES = {
  daily: 'ЩОДЕННІ',
  rite: 'ОБРЯДИ',
  journey: 'ПОХОДИ',
} as const;

/**
 * Піксельні сітки чрому. Малюються як інлайн-SVG — нуль бітмапів, нуль пам'яті,
 * і будь-який масштаб лишається чітким. Ключі збігаються з `CareRoutine.icon`.
 */

export type PixelGrid = readonly string[];

export const ICONS = {
  // ── квести ────────────────────────────────────────────────────────────────
  bowl: [
    '........',
    '........',
    '.ffffff.',
    'offffffo',
    '.wbbbbw.',
    '..dddd..',
    '........',
    '........',
  ],
  leash: [
    '..eeee..',
    '.e....e.',
    'e......e',
    'e......e',
    '.e....e.',
    '..ee.e..',
    '....e...',
    '...e....',
  ],
  paw: [
    '........',
    '.w..w.w.',
    'ww.ww.ww',
    '........',
    '..wwww..',
    '.wwwwww.',
    '.wwwwww.',
    '..wwww..',
  ],
  fang: [
    '........',
    '.wwwwww.',
    '.wwwwww.',
    '.wwwwww.',
    '.ww..ww.',
    '.w....w.',
    '..w..w..',
    '........',
  ],
  'ward-blood': [
    'oooooooo',
    'obbbbbbo',
    'ob.rr.bo',
    'ob.rr.bo',
    'obbbbbbo',
    '.obbbbo.',
    '..obbo..',
    '...oo...',
  ],
  'ward-worm': [
    '..gggg..',
    '..g..g..',
    '..g..g..',
    '.oaaaao.',
    'oaaaaaao',
    'oaaaaaao',
    '.oaaaao.',
    '..oooo..',
  ],
  healer: [
    '........',
    '...ww...',
    '...ww...',
    '.wwwwww.',
    '.wwwwww.',
    '...ww...',
    '...ww...',
    '........',
  ],
  vial: [
    '........',
    '.ssssss.',
    '.swwwws.',
    '.swwwws.',
    '.ssssss.',
    '...ss...',
    '...s....',
    '..s.....',
  ],
  scale: [
    '...e....',
    'eeeeeee.',
    'e..e..e.',
    'eee.eee.',
    '...e....',
    '..eee...',
    '.eeeee..',
    '........',
  ],
  claw: [
    '.s.s.s..',
    '.s.s.s..',
    '.s.s.s..',
    'ssssss..',
    '.gggg...',
    '.gggg...',
    '..gg....',
    '........',
  ],
  tree: [
    '...a....',
    '..aaa...',
    '.aaaaa..',
    'aaaaaaa.',
    '..aaa...',
    '.aaaaa..',
    '...f....',
    '...f....',
  ],
  eye: [
    '........',
    '..oooo..',
    '.obbbbo.',
    'obbeebbo',
    'obbeebbo',
    '.obbbbo.',
    '..oooo..',
    '........',
  ],

  // ── чром ──────────────────────────────────────────────────────────────────
  shield: ['oooooo', 'obbbbo', 'obwwbo', 'obbbbo', '.obbo.', '..oo..'],
  cross: ['..rr..', '..rr..', 'rrrrrr', 'rrrrrr', '..rr..', '..rr..'],
  trophy: [
    '.wwwwww.',
    'ewwwwwwe',
    'ewwwwwwe',
    '.wwwwww.',
    '..wwww..',
    '...ww...',
    '..wwww..',
    '.wwwwww.',
  ],
  pin: [
    '..ooo...',
    '.obbbo..',
    'obbebbo.',
    'obbbbbo.',
    '.obbbo..',
    '..obo...',
    '...o....',
    '...d....',
  ],
  scroll: [
    'gggggggg',
    'gwwwwwwg',
    'gw.ww.wg',
    'gwwwwwwg',
    'gw.ww.wg',
    'gwwwwwwg',
    'gwwwwwwg',
    'gggggggg',
  ],
  calendar: [
    '.g.gg.g.',
    'gggggggg',
    'gwwwwwwg',
    'gw.w.w.g',
    'gwwwwwwg',
    'gw.w.w.g',
    'gwwwwwwg',
    'gggggggg',
  ],

  // ── декорації лігва ───────────────────────────────────────────────────────
  bed: ['..oooooooo..', '.occcccccco.', 'occcccccccco', '.dccccccccd.', '..dddddddd..'],
  flask: ['..gg..', '..gg..', '.oaao.', 'oaaaao', 'oaaaao', 'oaaaao', '.oaao.', '..oo..'],
} as const satisfies Record<string, PixelGrid>;

export type IconName = keyof typeof ICONS;

export function isIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}

/**
 * Архетипний силует гончака — «план Б» зі спеки §11 і заглушка, поки спрайти
 * власника ще не викувані. 24×16, холодні тони зі світлим обідком.
 */
export const BALU_ARCHETYPE: PixelGrid = [
  '........................',
  '....................ooo.',
  '...................obbbo',
  '..................obbbbb',
  '..........oooo....obbbeb',
  '........oobbbbboobbbbbb.',
  '...o...obbbbbbbbbbbbb...',
  '..oo..obbbbbbbbbbbbb....',
  '..bo.obbbbbbbbbbbbbb....',
  '..bb.bbbbbdddbbbbbbb....',
  '..bb.bbbb...bbbbbbb.....',
  '...b.dbb.....bb.bbb.....',
  '.....bb......bb.bb......',
  '.....bb......bb.bb......',
  '.....bb......bb.bb......',
  '.....dd......dd.dd......',
];

export const BALU_HEAD: PixelGrid = [
  '..oooo..',
  '.obbbbo.',
  'obbbbbbo',
  'obbebbbb',
  'obbbbbbb',
  '.obbbbdd',
  '..obbbd.',
  '...odd..',
];

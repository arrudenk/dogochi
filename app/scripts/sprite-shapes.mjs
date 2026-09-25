// Hand-drawn sighthound archetype (spec §11 "План Б"), stored as horizontal runs.
// Runs, not ASCII: the brisket / waist / leg curves are the whole point, and numbers
// keep them honest across five poses.
//
// `body` is the silhouette. `deep` / `shadow` / `light` / `rim` are overrides layered
// on top of the automatic shading — mainly to push far-side limbs behind the near ones.
// Every run is [y, x0, x1], inclusive. All poses face right.

/** Vertical bar helper — legs are the one thing there are a lot of. */
const bar = (x0, x1, y0, y1) => {
  const out = [];
  for (let y = y0; y <= y1; y++) out.push([y, x0, x1]);
  return out;
};

export const POSES = {
  // ── STAND ─────────────────────────────────────────────────────────────────
  // Brisket down to y43, waist tucked up to y33, four long legs on the ground at y60.
  stand: {
    size: 64,
    body: [
      [8, 45, 48], [9, 44, 49],                              // rose ear
      [10, 44, 55], [11, 44, 57], [12, 45, 58], [13, 45, 58], // skull
      [14, 45, 61], [15, 45, 62], [16, 45, 62], [17, 46, 60], // muzzle
      [18, 44, 55], [19, 42, 50],                             // jaw
      [20, 40, 48], [21, 38, 47], [22, 36, 46], [23, 34, 46], // neck
      [22, 17, 25], [23, 13, 31],                             // loin arch
      [24, 11, 46], [25, 9, 46], [26, 8, 46], [27, 7, 46], [28, 6, 46],
      [29, 5, 46], [30, 6, 46], [31, 6, 45], [32, 6, 45], [33, 6, 45],
      [34, 6, 19], [34, 25, 45],                              // the tuck opens here
      [35, 6, 19], [35, 26, 45],
      [36, 6, 18], [36, 27, 44],
      [37, 7, 18], [37, 28, 44],
      [38, 7, 17], [38, 29, 43],
      [39, 8, 17], [39, 30, 43],
      [40, 8, 16], [40, 31, 42],
      [41, 9, 16], [41, 32, 42],
      [42, 9, 15], [42, 33, 41],
      [43, 10, 16], [43, 33, 41],
      // tail: long, thin, hanging with a forward curl at the tip
      [30, 4, 6], [31, 3, 5], [32, 2, 4], [33, 1, 3], [34, 1, 2], [35, 0, 2],
      [36, 0, 1], [37, 0, 1], [38, 0, 2], [39, 1, 2], [40, 1, 3], [41, 2, 3],
      [42, 3, 4],
      // near rear leg: stifle → hock → vertical metatarsus → paw
      [44, 10, 14], [45, 10, 13], [46, 10, 12], [47, 10, 12],
      ...bar(11, 12, 48, 58), [59, 11, 15], [60, 11, 15],
      // near foreleg
      ...bar(38, 39, 44, 58), [59, 38, 42], [60, 38, 42],
      // far legs
      ...bar(15, 16, 44, 58), [59, 15, 19], [60, 15, 19],
      ...bar(33, 34, 44, 58), [59, 32, 35], [60, 32, 35],
    ],
    deep: [
      ...bar(15, 16, 44, 58), [59, 15, 19], [60, 15, 19],
      ...bar(33, 34, 44, 58), [59, 32, 35], [60, 32, 35],
    ],
    shadow: [
      [10, 46, 47], [11, 46, 48],                             // ear canal
      [16, 61, 62], [17, 58, 60],                             // nose + lip
      [40, 35, 40], [41, 36, 40],                             // under the brisket
      [59, 15, 19], [60, 15, 19], [59, 32, 35], [60, 32, 35], // far paws
    ],
    light: [[36, 8, 16], [24, 34, 43]],                       // haunch, shoulder
    rim: [[15, 62, 62], [23, 14, 30], [44, 10, 13]],          // nose top, back, stifle
    eye: [[53, 14], [54, 14]],
  },

  // ── SIT ───────────────────────────────────────────────────────────────────
  // Rump on the ground at y59, chest vertical, head carried high.
  sit: {
    size: 64,
    body: [
      [4, 46, 49], [5, 45, 50],
      [6, 45, 56], [7, 45, 58], [8, 46, 59], [9, 46, 59],
      [10, 46, 62], [11, 46, 62], [12, 46, 62], [13, 47, 61],
      [14, 45, 56], [15, 43, 51],
      [16, 41, 49], [17, 39, 48], [18, 37, 47], [19, 36, 47],
      [20, 35, 47], [21, 34, 47], [22, 33, 47], [23, 32, 47],
      [24, 28, 47], [25, 24, 47], [26, 21, 47], [27, 19, 47],
      [28, 17, 46], [29, 15, 46], [30, 14, 46], [31, 13, 46],
      [32, 12, 46], [33, 11, 46], [34, 10, 46], [35, 9, 46],
      [36, 8, 46], [37, 8, 46], [38, 7, 46], [39, 7, 46],
      [40, 6, 46], [41, 6, 45], [42, 6, 45],
      [43, 6, 32], [43, 34, 45],                              // flank crease
      [44, 6, 31], [44, 34, 45],
      [45, 6, 30], [45, 34, 45],
      [46, 6, 29], [46, 35, 44],
      [47, 6, 28], [47, 36, 43],
      [48, 6, 28], [49, 6, 28], [50, 6, 29], [51, 6, 30],
      [52, 7, 30], [53, 7, 30], [54, 8, 30], [55, 9, 30],
      [56, 9, 30], [57, 10, 30], [58, 11, 30], [59, 12, 29],
      // tail curled out around the rump
      [51, 2, 4], [52, 1, 3], [53, 0, 2], [54, 0, 1], [55, 0, 1],
      [56, 0, 2], [57, 1, 3], [58, 2, 6],
      // fore legs
      ...bar(40, 41, 48, 58), [59, 40, 44], [60, 40, 44],
      ...bar(36, 37, 48, 58), [59, 35, 38], [60, 35, 38],
    ],
    deep: [...bar(36, 37, 48, 58), [59, 35, 38], [60, 35, 38]],
    shadow: [
      [6, 47, 48], [7, 47, 49],
      [12, 61, 62], [13, 58, 61],
      [46, 24, 29], [47, 23, 28],                             // hollow under the folded stifle
      [59, 35, 38], [60, 35, 38],
    ],
    light: [[24, 29, 40], [40, 6, 10], [34, 11, 16]],
    rim: [[11, 62, 62], [23, 33, 44], [40, 6, 8]],
    eye: [[54, 10], [55, 10]],
  },

  // ── LIE ───────────────────────────────────────────────────────────────────
  // Sphinx. Long and low, forelegs stretched out front, tail trailing left on the floor.
  lie: {
    size: 64,
    body: [
      [14, 46, 49], [15, 45, 50],
      [16, 45, 56], [17, 45, 58], [18, 46, 59], [19, 46, 59],
      [20, 46, 62], [21, 46, 62], [22, 46, 62], [23, 47, 61],
      [24, 45, 56], [25, 43, 51],
      [26, 41, 49], [27, 39, 48], [28, 37, 47], [29, 34, 47],
      [30, 30, 47], [31, 26, 47], [32, 22, 47], [33, 19, 46],
      [34, 16, 46], [35, 13, 46], [36, 11, 46], [37, 10, 46],
      [38, 9, 46], [39, 8, 45], [40, 8, 45], [41, 7, 45],
      [42, 7, 45], [43, 7, 45], [44, 7, 45], [45, 7, 45],
      [46, 8, 45], [47, 9, 45], [48, 10, 45],
      [49, 11, 46], [50, 12, 48], [51, 13, 51], [52, 14, 53],
      // tail on the floor alongside
      [50, 8, 13], [51, 5, 14], [52, 3, 15],
      // forelegs stretched out front
      [49, 42, 53], [50, 42, 56], [51, 42, 58], [52, 42, 58],
    ],
    deep: [
      [50, 46, 56], [51, 48, 58],                             // far foreleg under the near one
      [51, 5, 12], [52, 3, 13],                               // tail must not out-shine the back
    ],
    shadow: [
      [16, 47, 48], [17, 47, 49],
      [22, 61, 62], [23, 58, 61],
      [52, 0, 58],                                            // floor contact
      [40, 24, 33], [41, 26, 32],                             // crease of the folded thigh
      [46, 30, 41],
    ],
    light: [[34, 17, 27], [42, 9, 15], [44, 36, 44], [49, 43, 52]],
    rim: [[33, 20, 36], [21, 62, 62], [43, 7, 9]],
    eye: [[54, 20], [55, 20]],
  },

  // ── RUN ───────────────────────────────────────────────────────────────────
  // Double-suspension gallop, extended phase — the gait only a sighthound has: fore pair
  // thrown forward together, rear pair driving back together, loin crested, tuck wide open.
  // Near limbs are painted `light`, far limbs `deep` — a full tone apart, or the four
  // legs fuse into one blur.
  run: {
    size: 64,
    body: [
      [23, 44, 49], [24, 43, 51],                             // rose ear laid flat by the wind
      [25, 42, 55], [26, 42, 58], [27, 42, 57],               // skull, then the stop
      [28, 43, 62], [29, 43, 63], [30, 44, 62],               // muzzle, thrown forward
      [31, 45, 58], [32, 44, 53],                             // jaw
      [33, 41, 51], [34, 38, 49], [35, 36, 48],               // neck, reaching low
      // topline: loin crest at y32, withers dip at y33, croup and shoulder tied at y34
      [32, 20, 27], [33, 16, 33], [34, 13, 40],
      [35, 12, 46], [36, 11, 46], [37, 10, 46],
      [38, 10, 19], [38, 27, 46],                             // tuck opens — 7px of daylight
      [39, 10, 19], [39, 29, 46],
      [40, 11, 19], [40, 30, 45],
      [41, 11, 19], [41, 31, 44],
      [42, 12, 18], [42, 32, 43],
      [43, 13, 18], [43, 33, 42],
      [44, 14, 18], [44, 34, 41],
      [45, 35, 40], [46, 36, 39],                             // brisket keel
      // tail streaming back and up off the croup
      [33, 9, 13], [32, 6, 11], [31, 4, 8], [30, 2, 6], [29, 0, 4],
      // near rear leg — fully extended behind
      [45, 13, 16], [46, 11, 14], [47, 9, 12], [48, 7, 11], [49, 6, 9],
      [50, 4, 8], [51, 3, 7], [52, 2, 6], [53, 1, 6],
      // far rear leg — one stride behind it, and a tone darker
      [45, 17, 19], [46, 16, 19], [47, 15, 18], [48, 14, 17], [49, 13, 16],
      [50, 12, 15], [51, 11, 14], [52, 10, 13], [53, 8, 13],
      // near foreleg — reaching past the nose line
      [46, 39, 42], [47, 41, 44], [48, 43, 46], [49, 45, 48], [50, 47, 50],
      [51, 49, 52], [52, 51, 54], [53, 53, 57],
      // far foreleg, trailing the near one
      [46, 35, 38], [47, 37, 40], [48, 38, 41], [49, 40, 43], [50, 41, 44],
      [51, 43, 46], [52, 44, 47], [53, 45, 49],
    ],
    deep: [
      [45, 17, 19], [46, 16, 19], [47, 15, 18], [48, 14, 17], [49, 13, 16],
      [50, 12, 15], [51, 11, 14], [52, 10, 13], [53, 8, 13],
      [46, 35, 38], [47, 37, 40], [48, 38, 41], [49, 40, 43], [50, 41, 44],
      [51, 43, 46], [52, 44, 47], [53, 45, 49],
    ],
    shadow: [
      [24, 45, 47], [25, 44, 47],                             // ear canal
      [29, 61, 63], [30, 58, 61],                             // nose + lip
      [44, 34, 39],                                           // under the stretched brisket
      [38, 30, 34], [39, 31, 35],                             // flank behind the ribs
      [53, 8, 13], [53, 45, 49],                              // far paws
    ],
    light: [
      [40, 12, 18], [39, 33, 43],                             // haunch, shoulder
      [45, 13, 16], [46, 11, 14], [47, 9, 12], [48, 7, 11], [49, 6, 9],
      [50, 4, 8], [51, 3, 7], [52, 2, 6], [53, 1, 6],
      [46, 39, 42], [47, 41, 44], [48, 43, 46], [49, 45, 48], [50, 47, 50],
      [51, 49, 52], [52, 51, 54], [53, 53, 57],
    ],
    rim: [
      [29, 63, 63], [32, 6, 11],                              // nose top, tail
      [45, 16, 16], [46, 14, 14], [47, 12, 12], [48, 11, 11], [49, 9, 9],
      [50, 8, 8], [51, 7, 7], [52, 6, 6], [53, 6, 6],
      [46, 39, 39], [47, 41, 41], [48, 43, 43], [49, 45, 45], [50, 47, 47],
      [51, 49, 49], [52, 51, 51], [53, 53, 53],
    ],
    eye: [[50, 28], [51, 28]],
  },
};

// ── PORTRAIT 96×96 ──────────────────────────────────────────────────────────
// Head in profile plus the top of the chest. On a solid-black dog the eye and the
// highlight on the nose leather carry half the recognition, so both are drawn by hand.
export const PORTRAIT = {
  size: 96,
  body: [
    // Head fills the upper 55% of the frame; chest is cropped by the bottom and right
    // edges rather than sitting in the middle as a dome.
    [14, 48, 56],
    [15, 36, 42], [15, 44, 58],                                // 1px notch: crown, then ear tip
    [16, 34, 60], [17, 32, 61],
    // the rose ear bulges the back of the skull out to x22 and pulls back in by y27 —
    // a folded flap, not a lump on top. The fold itself is drawn in light + shadow below.
    [18, 30, 62], [19, 27, 63], [20, 24, 64], [21, 23, 65], [22, 22, 66],
    [23, 22, 67], [24, 23, 68], [25, 25, 68], [26, 28, 68],
    [27, 31, 67],                                              // the stop — a real recess
    // muzzle: 24px from stop to nose against a 40px skull, and kept deep to the chin.
    // A muzzle that tapers to a point is a beak; this one ends blunt on the nose.
    [28, 32, 73], [29, 32, 78], [30, 32, 82], [31, 33, 85], [32, 33, 87],
    [33, 33, 89], [34, 34, 90], [35, 34, 90], [36, 34, 90], [37, 34, 90],
    [38, 34, 89], [39, 34, 88], [40, 34, 87], [41, 34, 86], [42, 34, 85],
    [43, 34, 84], [44, 34, 83], [45, 34, 82], [46, 34, 80],
    // chin, then the jaw angle — a hard step back, not one long diagonal
    [47, 34, 77], [48, 34, 73], [49, 34, 67], [50, 34, 60], [51, 34, 54],
    [52, 33, 50],
    // throat cuts back — without this notch the head fuses into the chest
    [53, 32, 47], [54, 31, 45], [55, 30, 44],
    // chest: the front runs off the RIGHT edge by y69, so it crops instead of doming
    [56, 29, 46], [57, 28, 49], [58, 27, 52], [59, 26, 56], [60, 25, 60],
    [61, 24, 64], [62, 23, 68], [63, 21, 72], [64, 19, 76], [65, 17, 80],
    [66, 15, 84], [67, 13, 88], [68, 11, 92], [69, 9, 95], [70, 7, 95],
    [71, 5, 95], [72, 3, 95], [73, 1, 95],
    ...bar(0, 95, 74, 95),
  ],
  // Every override is a 1px staircase that follows a form. Flat 2-row bands across a
  // mass this dark read as stripes painted on, not as anatomy.
  shadow: [
    [17, 44, 46], [18, 42, 44], [19, 40, 42], [20, 38, 40], [21, 36, 38],
    [22, 34, 36], [23, 32, 34], [24, 31, 33], [25, 30, 32], [26, 30, 32],
    [27, 31, 33],                                              // crease behind the ear fold
    [33, 84, 89], [34, 84, 90], [35, 84, 90], [36, 84, 90],    // nose leather
    [37, 84, 90], [38, 84, 89], [39, 84, 88],
    [42, 78, 84], [43, 72, 78], [44, 66, 72], [45, 58, 66],    // lip line to the mouth corner
    [50, 38, 58], [51, 36, 52],                                // underside of the jaw
    [54, 32, 42], [55, 31, 40], [56, 30, 38],                  // throat falling away
    // the chest turns away from the moon along a diagonal, not along a flat band —
    // a horizontal tone boundary here reads as a plinth the head is sitting on
    [68, 0, 20], [69, 0, 28], [70, 0, 36], [71, 0, 46], [72, 0, 56],
    [73, 0, 66], [74, 0, 76], [75, 0, 86],
    ...bar(0, 95, 76, 95),
  ],
  deep: [
    [58, 27, 34], [59, 26, 33],                                // far side of the neck
    [60, 0, 30], [61, 0, 34], [62, 0, 38], [63, 0, 43], [64, 0, 48],
    [65, 0, 53], [66, 0, 58], [67, 0, 64], [68, 0, 70], [69, 0, 76],
    [70, 0, 82], [71, 0, 88],
    ...bar(0, 95, 72, 95),                                     // chest bulk falls away
  ],
  light: [
    [18, 39, 41], [19, 37, 39], [20, 35, 37], [21, 33, 35],
    [22, 31, 33], [23, 30, 31], [24, 29, 30],                  // the lit fold of the rose ear
    [29, 64, 76], [30, 70, 80],                                // bridge of the muzzle
    [38, 45, 52], [39, 42, 48],                                // cheekbone under the eye
    [47, 58, 72], [48, 50, 62], [49, 42, 54],                  // the jaw bone itself
    [59, 44, 52], [60, 46, 56], [61, 48, 60], [62, 50, 64],    // shoulder front
  ],
  rim: [
    [19, 27, 27], [20, 24, 24], [21, 23, 23], [22, 22, 22],
    [23, 22, 22], [24, 23, 23],                                // moonlit back edge of the ear
    [26, 60, 68], [27, 58, 66],                                // brow ridge over the stop
    [32, 80, 87], [34, 86, 88], [35, 87, 88],                  // moonlight on the nose leather
    [59, 50, 56], [60, 54, 60],                                // moonlit front of the chest
  ],
  // almond eye behind the stop: lid, gold iris, pupil, one catchlight
  lid: [
    [29, 52, 61], [35, 52, 61],
    [30, 50, 52], [31, 50, 51], [32, 50, 51], [33, 51, 52], [34, 52, 53],
    [30, 60, 62], [31, 62, 63], [32, 63, 64], [33, 62, 64], [34, 60, 62],
  ],
  gold: [[30, 53, 60], [31, 52, 62], [32, 51, 63], [33, 52, 62], [34, 53, 60]],
  pupil: [[31, 56, 59], [32, 56, 59]],
  spark: [[31, 53, 54]],
};

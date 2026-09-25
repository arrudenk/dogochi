/* Генератор схем мандал: усі візуали на сторінці малюються за правилом, а не завантажуються. */
(function (root) {
  'use strict';

  var TAU = Math.PI * 2;
  var A0 = -Math.PI / 2;               // нуль на 12 годині
  var Q = function (n) { return Math.round(n * 100) / 100; };
  var px = function (a, r) { return [Q(Math.cos(a) * r), Q(Math.sin(a) * r)]; };

  var P = {
    lapis:     '#2A4B9B',
    cinnabar:  '#BE3A22',
    orpiment:  '#E2A020',
    malachite: '#2C7A5E',
    bone:      '#F4F0E2',
    gold:      '#A98A34',
    ink:       '#0B1524',
    paper:     '#E6E4D8'
  };

  function attrs(o) {
    var s = '';
    for (var k in o) if (o[k] !== undefined && o[k] !== null) s += ' ' + k + '="' + o[k] + '"';
    return s;
  }
  function path(d, o) { return '<path d="' + d + '"' + attrs(o) + '/>'; }
  function stroke(c, w, o) {
    var a = { fill: 'none', stroke: c, 'stroke-width': w };
    for (var k in (o || {})) a[k] = o[k];
    return a;
  }
  function arcD(r, a0, a1) {
    var p0 = px(a0, r), p1 = px(a1, r);
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    return 'M' + p0[0] + ' ' + p0[1] + 'A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p1[0] + ' ' + p1[1];
  }
  function dotsD(n, r, rd, phase) {
    var d = '', i, a, p;
    for (i = 0; i < n; i++) {
      a = A0 + TAU * i / n + (phase || 0);
      p = px(a, r);
      d += 'M' + Q(p[0] - rd) + ' ' + p[1]
         + 'a' + rd + ' ' + rd + ' 0 1 0 ' + Q(rd * 2) + ' 0'
         + 'a' + rd + ' ' + rd + ' 0 1 0 ' + Q(-rd * 2) + ' 0';
    }
    return d;
  }

  /* --- шари ------------------------------------------------------------- */
  var L = {};

  L.disc = function (l) {
    return '<circle r="' + l.r + '" fill="' + l.c + '"' + (l.o ? ' opacity="' + l.o + '"' : '') + '/>';
  };
  L.band = function (l) {                       // кільце заданої товщини = один вузол
    return '<circle r="' + l.r + '"' + attrs(stroke(l.c, l.w)) + (l.o ? ' opacity="' + l.o + '"' : '') + '/>';
  };
  L.ring = L.band;

  L.petals = function (l) {                     // лотосові пелюстки
    var n = l.n, d = '', i, a, w, p0, p1, p2, c1, c2;
    var spread = (l.spread || 0.92);
    for (i = 0; i < n; i++) {
      a = A0 + TAU * i / n + (l.phase || 0);
      w = TAU / n * 0.5 * spread;
      p0 = px(a - w, l.r0); p1 = px(a, l.r1); p2 = px(a + w, l.r0);
      c1 = px(a - w * 0.4, l.r1 * 0.94); c2 = px(a + w * 0.4, l.r1 * 0.94);
      d += 'M' + p0[0] + ' ' + p0[1]
         + 'Q' + c1[0] + ' ' + c1[1] + ' ' + p1[0] + ' ' + p1[1]
         + 'Q' + c2[0] + ' ' + c2[1] + ' ' + p2[0] + ' ' + p2[1]
         + 'A' + l.r0 + ' ' + l.r0 + ' 0 0 0 ' + p0[0] + ' ' + p0[1] + 'Z';
    }
    return path(d, l.fill === false
      ? stroke(l.c, l.w || 1.2)
      : { fill: l.c, stroke: l.s || 'none', 'stroke-width': l.w || 0.8 });
  };

  L.spikes = function (l) {                     // кільце вогню
    var n = l.n, d = '', i, a, w, p0, p1, p2;
    for (i = 0; i < n; i++) {
      a = A0 + TAU * i / n;
      w = TAU / n * 0.5;
      p0 = px(a - w, l.r0); p1 = px(a, l.r1); p2 = px(a + w, l.r0);
      d += 'M' + p0[0] + ' ' + p0[1] + 'Q' + Q(p1[0] * 0.72) + ' ' + Q(p1[1] * 0.72) + ' ' + p1[0] + ' ' + p1[1]
         + 'Q' + Q(p2[0] * 1.02) + ' ' + Q(p2[1] * 1.02) + ' ' + p2[0] + ' ' + p2[1] + 'Z';
    }
    return path(d, { fill: l.c, opacity: l.o || 1 });
  };

  L.rays = function (l) {                       // радіальні лінії
    var n = l.n, d = '', i, a, p0, p1;
    for (i = 0; i < n; i++) {
      a = A0 + TAU * i / n + (l.phase || 0);
      p0 = px(a, l.r0); p1 = px(a, l.r1);
      d += 'M' + p0[0] + ' ' + p0[1] + 'L' + p1[0] + ' ' + p1[1];
    }
    return path(d, stroke(l.c, l.w || 0.6, { opacity: l.o, 'stroke-linecap': 'round' }));
  };

  L.dots = function (l) {
    return path(dotsD(l.n, l.r, l.rd, l.phase), l.fill === false
      ? stroke(l.c, l.w || 1)
      : { fill: l.c });
  };

  L.quads = function (l) {                      // чотири кольори сторін світу в палаці
    var s = l.r, out = '', i, cs = l.cols;
    for (i = 0; i < 4; i++) {
      out += '<g transform="rotate(' + (i * 90) + ')">'
           + path('M0 0L' + (-s) + ' ' + (-s) + 'H' + s + 'Z', { fill: cs[i], opacity: l.o || 1 })
           + '</g>';
    }
    return out;
  };

  L.palace = function (l) {                     // мури + чотири брами
    var s = l.r, g = s * 0.17, o = s * 0.3, out = '';
    out += path('M' + (-s) + ' ' + (-s) + 'H' + s + 'V' + s + 'H' + (-s) + 'Z', stroke(l.c, l.w || 2));
    for (var i = 0; i < 4; i++) {
      out += '<g transform="rotate(' + (i * 90) + ')">'
           + path('M' + Q(-g) + ' ' + (-s) + 'V' + Q(-s - o)
                + 'H' + Q(-g * 1.85) + 'V' + Q(-s - o * 1.5)
                + 'H' + Q(g * 1.85) + 'V' + Q(-s - o)
                + 'H' + Q(g) + 'V' + (-s), stroke(l.c, l.w || 2, { 'stroke-linejoin': 'miter' }))
           + '</g>';
    }
    return out;
  };

  L.sq = function (l) {                         // квадратна рама
    var s = l.r;
    return '<g' + (l.rot ? ' transform="rotate(' + l.rot + ')"' : '') + '>'
         + path('M' + (-s) + ' ' + (-s) + 'H' + s + 'V' + s + 'H' + (-s) + 'Z',
                l.fill ? { fill: l.fill, stroke: l.c, 'stroke-width': l.w || 1.4 } : stroke(l.c, l.w || 1.4))
         + '</g>';
  };

  L.tri = function (l) {                        // взаємопроникні трикутники (шрі-янтра, схема)
    var d = '', i, t;
    for (i = 0; i < l.set.length; i++) {
      t = l.set[i];                             // [базаY, півширина, вершинаY]
      d += 'M' + Q(-t[1]) + ' ' + t[0] + 'H' + Q(t[1]) + 'L0 ' + t[2] + 'Z';
    }
    return path(d, stroke(l.c, l.w || 1.1, { 'stroke-linejoin': 'miter' }));
  };

  L.grid = function (l) {                        // сітка клітин (васту-пуруша)
    var n = l.n, s = l.r, step = (s * 2) / n, d = '', i;
    for (i = 0; i <= n; i++) {
      d += 'M' + Q(-s + i * step) + ' ' + (-s) + 'V' + s;
      d += 'M' + (-s) + ' ' + Q(-s + i * step) + 'H' + s;
    }
    return path(d, stroke(l.c, l.w || 0.5));
  };

  L.perim = function (l) {                       // ранги залів уздовж периметра квадрата
    var n = l.n, s = l.r, step = (s * 2) / n, w = step * 0.62, out = '', i, k = 0, put;
    put = function (cx, cy) {
      out += '<rect x="' + Q(cx - w / 2) + '" y="' + Q(cy - w / 2) + '" width="' + Q(w)
           + '" height="' + Q(w) + '" fill="' + l.cols[(k++) % l.cols.length] + '"/>';
    };
    for (i = 0; i < n; i++) put(Q(-s + step * (i + 0.5)), Q(-s + step * 0.5));
    for (i = 1; i < n; i++) put(Q(s - step * 0.5), Q(-s + step * (i + 0.5)));
    for (i = n - 2; i >= 0; i--) put(Q(-s + step * (i + 0.5)), Q(s - step * 0.5));
    for (i = n - 2; i > 0; i--) put(Q(-s + step * 0.5), Q(-s + step * (i + 0.5)));
    return out;
  };

  L.cells = function (l) {                       // виділені клітини сітки: [кол, ряд, ширина, висота, колір]
    var n = l.n, s = l.r, step = (s * 2) / n, out = '', i, c;
    for (i = 0; i < l.set.length; i++) {
      c = l.set[i];
      out += '<rect x="' + Q(-s + c[0] * step) + '" y="' + Q(-s + c[1] * step)
           + '" width="' + Q(c[2] * step) + '" height="' + Q(c[3] * step)
           + '" fill="' + c[4] + '" opacity="' + (l.o || 1) + '"/>';
    }
    return out;
  };

  L.nine = function (l) {                        // дев'ять зібрань конгокай
    var s = l.r, step = (s * 2) / 3, out = '', i, j, cx, cy;
    for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) {
      cx = Q(-s + step * (i + 0.5)); cy = Q(-s + step * (j + 0.5));
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + Q(step * 0.38) + '"'
           + attrs(stroke(l.c, l.w || 1.3)) + '/>'
           + '<circle cx="' + cx + '" cy="' + cy + '" r="' + Q(step * 0.1) + '" fill="' + (l.dot || l.c) + '"/>';
    }
    return out;
  };

  L.lobes = function (l) {                       // пелюстки-люкарни готичної рози
    var n = l.n, out = '', i, a, p;
    for (i = 0; i < n; i++) {
      a = A0 + TAU * i / n;
      p = px(a, l.rm);
      out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + l.rl + '"' + attrs(stroke(l.c, l.w || 1.2)) + '/>';
    }
    return out;
  };

  L.star = function (l) {                        // зірковий багатокутник {n/step}
    var n = l.n, k = l.step, d = 'M', i, p;
    for (i = 0; i <= n; i++) {
      p = px(A0 + TAU * ((i * k) % n) / n + (l.phase || 0), l.r);
      d += (i ? 'L' : '') + p[0] + ' ' + p[1];
    }
    return path(d + 'Z', stroke(l.c, l.w || 1.1, { 'stroke-linejoin': 'miter' }));
  };

  L.rosettes = function (l) {                    // малі зірки по колу (гірих)
    var out = '', i, a, p, j, d, q;
    for (i = 0; i < l.n; i++) {
      a = A0 + TAU * i / l.n;
      p = px(a, l.r);
      d = 'M';
      for (j = 0; j <= 5; j++) {
        q = px(A0 + TAU * ((j * 2) % 5) / 5 + a, l.rl);
        d += (j ? 'L' : '') + Q(p[0] + q[0]) + ' ' + Q(p[1] + q[1]);
      }
      out += path(d + 'Z', stroke(l.c, l.w || 0.9, { 'stroke-linejoin': 'miter' }));
    }
    return out;
  };

  L.bars = function (l) {                        // видовжені фігури навахо на чотирьох напрямках
    var out = '', i, cs = l.cols;
    for (i = 0; i < 4; i++) {
      out += '<g transform="rotate(' + (i * 90) + ')">'
           + '<rect x="' + Q(-l.w / 2) + '" y="' + Q(-l.r1) + '" width="' + l.w + '" height="' + Q(l.r1 - l.r0)
           + '" fill="' + cs[i] + '" stroke="' + (l.edge || 'none') + '" stroke-width="0.8"/>'
           + '<rect x="' + Q(-l.w * 1.15) + '" y="' + Q(-l.r1 - l.w * 0.5) + '" width="' + Q(l.w * 2.3)
           + '" height="' + Q(l.w * 0.55) + '" fill="' + cs[i] + '" stroke="' + (l.edge || 'none') + '" stroke-width="0.8"/>'
           + '</g>';
    }
    return out;
  };

  L.openBorder = function (l) {                  // веселкова оправа навахо: відкрита зі сходу
    return path(arcD(l.r, A0 + 0.4, A0 + TAU - 0.4), stroke(l.c, l.w || 5, { 'stroke-linecap': 'butt' }));
  };

  L.brush = function (l) {                       // енсо: один мазок із затуханням
    var a0 = A0 + 0.5, a1 = A0 + TAU - 0.28, out = '', i, s0, s1, wf = [1, 0.8, 0.45];
    for (i = 0; i < 3; i++) {
      s0 = a0 + (a1 - a0) * i / 3;
      s1 = a0 + (a1 - a0) * (i + 1) / 3 + 0.03;
      out += path(arcD(l.r, s0, s1), stroke(l.c, Q(l.w * wf[i]), { 'stroke-linecap': 'round' }));
    }
    return out;
  };

  L.cross = function (l) {
    return path('M0 ' + (-l.r) + 'V' + l.r + 'M' + (-l.r) + ' 0H' + l.r, stroke(l.c, l.w || 1.2));
  };

  L.steps = function (l) {                       // ступінчасті тераси (борободур)
    var out = '', i, s;
    for (i = 0; i < l.n; i++) {
      s = l.r - i * l.step;
      out += path('M' + Q(-s) + ' ' + Q(-s) + 'H' + s + 'V' + s + 'H' + Q(-s) + 'Z', stroke(l.c, l.w || 1.1));
    }
    return out;
  };

  /* --- рендер ------------------------------------------------------------ */
  function layerSVG(l) {
    if (!L[l.t]) throw new Error('невідомий шар: ' + l.t);
    return L[l.t](l);
  }

  // радіуси й порядок симетрії, потрібні для креслярської сітки
  function metrics(layers) {
    var radii = [], syms = {}, i, l, r;
    for (i = 0; i < layers.length; i++) {
      l = layers[i];
      r = l.r !== undefined ? l.r : (l.r1 !== undefined ? l.r1 : null);
      if (l.t === 'band' && l.w) { radii.push(Q(l.r + l.w / 2)); radii.push(Q(l.r - l.w / 2)); }
      else if (r) radii.push(Q(r));
      if (l.r0) radii.push(Q(l.r0));
      if (l.rm) radii.push(Q(l.rm));
      if (l.n && l.n <= 32 && l.t !== 'grid' && l.t !== 'cells' && l.t !== 'steps') syms[l.n] = (syms[l.n] || 0) + 1;
    }
    var best = 0, bestC = 0;
    for (var k in syms) if (syms[k] > bestC || (syms[k] === bestC && +k > best)) { best = +k; bestC = syms[k]; }
    radii = radii.filter(function (v, j, a) { return v > 4 && a.indexOf(v) === j; }).sort(function (a, b) { return b - a; });
    return { radii: radii, sym: best || 8 };
  }

  function draw(spec) {
    var out = '', i;
    for (i = 0; i < spec.layers.length; i++) {
      out += '<g class="lay' + (spec.layers[i].part ? ' part part-' + (i + 1) : '') + '" style="--i:' + i + '">'
           + layerSVG(spec.layers[i]) + '</g>';
    }
    return out;
  }

  function draft(spec) {
    var m = metrics(spec.layers), d = '', i, p;
    for (i = 0; i < m.sym; i++) {                            // радіальні промені сітки пропорцій
      p = px(A0 + TAU * i / m.sym, 100);
      d += 'M0 0L' + p[0] + ' ' + p[1];
    }
    var out = path(d, stroke('currentColor', 0.35, { opacity: 0.55 }));
    out += path('M-92 -92H92V92H-92Z M-92 -92L92 92 M92 -92L-92 92',
                stroke('currentColor', 0.35, { opacity: 0.4 }));
    for (i = 0; i < m.radii.length; i++) {
      out += '<circle r="' + m.radii[i] + '"' + attrs(stroke('currentColor', 0.45, { opacity: 0.75 })) + '/>';
    }
    out += '<circle r="1.6" fill="currentColor"/>';
    return out;
  }

  function svg(spec, opts) {
    opts = opts || {};
    return '<svg viewBox="-100 -100 200 200" role="img" aria-label="' + (spec.alt || spec.name) + '"'
         + (opts.cls ? ' class="' + opts.cls + '"' : '') + '>'
         + '<g class="pigment">' + draw(spec) + '</g>'
         + '<g class="construct">' + draft(spec) + '</g>'
         + '</svg>';
  }

  /* --- специфікації ------------------------------------------------------ */
  var specs = [
    {
      id: 'kalachakra', name: 'Калачакра', group: 'buddh', tradition: 'Тибет, ваджраяна',
      meta: '722 божества · 5 поверхів палацу',
      note: 'Найгустіша з відомих мандал: п’ять вкладених палаців, кожен зі своїм населенням божеств. Її будують для посвяти, що триває понад тиждень.',
      layers: [
        { t: 'spikes', n: 72, r0: 84, r1: 99, c: P.cinnabar },
        { t: 'band', r: 80, w: 6, c: P.lapis },
        { t: 'dots', n: 32, r: 80, rd: 1.9, c: P.bone },
        { t: 'petals', n: 16, r0: 46, r1: 74, c: P.malachite, s: P.bone, w: 0.7 },
        { t: 'quads', r: 44, cols: [P.bone, P.lapis, P.cinnabar, P.malachite], o: 0.85 },
        { t: 'palace', r: 44, c: P.gold, w: 1.8 },
        { t: 'petals', n: 8, r0: 12, r1: 32, c: P.orpiment, s: P.ink, w: 0.6 },
        { t: 'disc', r: 9, c: P.gold }
      ]
    },
    {
      id: 'dultson', name: 'Пісочна мандала', group: 'buddh', tradition: 'Тибет, dul-tson-kyil-khor',
      meta: 'мінеральний пісок · знищується',
      note: 'Викладається кольоровим піском із металевих лійок чак-пур: монах стукає по ребру, і пісок сиплеться цівкою. Готову мандалу зметають у центр.',
      layers: [
        { t: 'rays', n: 144, r0: 86, r1: 98, c: P.orpiment, w: 0.5, o: 0.9 },
        { t: 'band', r: 82, w: 5, c: P.cinnabar },
        { t: 'band', r: 76, w: 5, c: P.malachite },
        { t: 'band', r: 70, w: 5, c: P.lapis },
        { t: 'petals', n: 24, r0: 42, r1: 66, c: P.bone, s: P.ink, w: 0.5 },
        { t: 'palace', r: 40, c: P.ink, w: 1.6 },
        { t: 'quads', r: 39, cols: [P.bone, P.lapis, P.cinnabar, P.malachite], o: 0.55 },
        { t: 'disc', r: 8, c: P.cinnabar }
      ]
    },
    {
      id: 'thangka', name: 'Тханка-мандала', group: 'buddh', tradition: 'Гімалаї, живопис',
      meta: 'мінеральні пігменти по ґрунтованому полотні',
      note: 'Та сама схема, але писана пензлем і призначена жити: тханку згортають, возять і розгортають знову. Пігменти — товчений камінь.',
      layers: [
        { t: 'band', r: 92, w: 2, c: P.gold },
        { t: 'petals', n: 12, r0: 48, r1: 86, c: P.cinnabar, s: P.gold, w: 0.9 },
        { t: 'dots', n: 12, r: 68, rd: 3, c: P.bone, phase: 0.26 },
        { t: 'palace', r: 42, c: P.gold, w: 1.7 },
        { t: 'petals', n: 8, r0: 14, r1: 36, c: P.malachite, s: P.gold, w: 0.6 },
        { t: 'disc', r: 11, c: P.lapis }
      ]
    },
    {
      id: 'vajrabhairava', name: 'Ваджрабхайрава', group: 'buddh', tradition: 'Тибет, гнівне божество',
      meta: '8 кладовищ · трикутник у центрі',
      note: 'Мандала гнівної форми. Зовні — вісім кладовищ, у центрі перевернутий трикутник: джерело, з якого з’являється божество.',
      layers: [
        { t: 'spikes', n: 56, r0: 76, r1: 99, c: P.cinnabar },
        { t: 'disc', r: 78, c: P.ink },
        { t: 'dots', n: 8, r: 66, rd: 8, c: P.orpiment, fill: false, w: 1.4 },
        { t: 'band', r: 52, w: 3, c: P.bone },
        { t: 'palace', r: 38, c: P.malachite, w: 1.8 },
        { t: 'tri', set: [[-26, 26, 30]], c: P.cinnabar, w: 2.2 },
        { t: 'disc', r: 6, c: P.gold }
      ]
    },
    {
      id: 'bhaisajya', name: 'Мандала Медичного Будди', group: 'buddh', tradition: 'Тибет, зцілення',
      meta: '8 будд лікування · подвійний лотос',
      note: 'Використовується у практиках зцілення: у центрі Бгайшаджʼягуру, довкола — сім його супутників. Лотос тут подвійний, і це не декор, а рахунок.',
      layers: [
        { t: 'band', r: 94, w: 2, c: P.malachite },
        { t: 'rays', n: 48, r0: 78, r1: 92, c: P.malachite, w: 0.7 },
        { t: 'petals', n: 16, r0: 52, r1: 76, c: P.lapis, s: P.bone, w: 0.6 },
        { t: 'palace', r: 46, c: P.gold, w: 1.6 },
        { t: 'petals', n: 8, r0: 16, r1: 40, c: P.bone, s: P.malachite, w: 0.8 },
        { t: 'disc', r: 10, c: P.lapis }
      ]
    },
    {
      id: 'garbhadhatu', name: 'Ґарбгадгату', group: 'buddh', tradition: 'Японія, шінґон (Тайдзокай)',
      meta: '12 залів · лотос із 8 пелюсток',
      note: 'Мандала Лона. Не кільце, а план будівлі: дванадцять прямокутних залів довкола центрального лотоса. Половина пари рьокай.',
      layers: [
        { t: 'sq', r: 95, c: P.ink, w: 1.4 },
        { t: 'perim', n: 13, r: 95, cols: [P.lapis, P.bone, P.malachite, P.bone] },
        { t: 'sq', r: 80, c: P.ink, w: 1 },
        { t: 'sq', r: 66, c: P.ink, w: 1.2 },
        { t: 'perim', n: 9, r: 66, cols: [P.cinnabar, P.bone, P.orpiment, P.bone] },
        { t: 'sq', r: 51, c: P.ink, w: 1.2 },
        { t: 'petals', n: 8, r0: 13, r1: 45, c: P.cinnabar, s: P.gold, w: 0.9 },
        { t: 'disc', r: 13, c: P.gold }
      ]
    },
    {
      id: 'vajradhatu', name: 'Ваджрадгату', group: 'buddh', tradition: 'Японія, шінґон (Конґокай)',
      meta: '9 зібрань · сітка 3×3',
      note: 'Мандала Алмазної сфери: дев’ять окремих зібрань у сітці три на три, кожне — свій етап шляху. Друга половина пари рьокай.',
      layers: [
        { t: 'sq', r: 92, c: P.ink, w: 1.6 },
        { t: 'grid', n: 3, r: 92, c: P.ink, w: 0.9 },
        { t: 'nine', r: 92, c: P.lapis, w: 1.3, dot: P.cinnabar },
        { t: 'dots', n: 4, r: 87, rd: 3, c: P.gold, phase: Math.PI / 4 }
      ]
    },
    {
      id: 'borobudur', name: 'Борободур', group: 'buddh', tradition: 'Ява, VIII–IX ст.',
      meta: '9 платформ · 72 ступи · 504 будди',
      note: 'Мандала, у яку заходять ногами. Квадратні галереї переходять у три круглі тераси зі ступами; маршрут паломника і є проходженням схеми.',
      layers: [
        { t: 'steps', n: 4, r: 96, step: 15, c: P.malachite, w: 2 },
        { t: 'band', r: 46, w: 1.2, c: P.ink },
        { t: 'dots', n: 32, r: 46, rd: 3, c: P.ink },
        { t: 'band', r: 33, w: 1.2, c: P.ink },
        { t: 'dots', n: 24, r: 33, rd: 2.7, c: P.ink },
        { t: 'band', r: 21, w: 1.2, c: P.ink },
        { t: 'dots', n: 16, r: 21, rd: 2.4, c: P.ink },
        { t: 'disc', r: 9, c: P.gold }
      ]
    },
    {
      id: 'sriyantra', name: 'Шрі Янтра', group: 'hindu', tradition: 'Індія, шрі-від’я',
      meta: '9 трикутників · 43 менші · бінду',
      note: 'Чотири трикутники вершиною вгору й п’ять униз перетинаються так, що дають сорок три менші. У центрі — бінду, точка без розміру. Схема спрощена.',
      layers: [
        { t: 'sq', r: 95, c: P.cinnabar, w: 1.6 },
        { t: 'sq', r: 87, c: P.cinnabar, w: 1 },
        { t: 'petals', n: 16, r0: 70, r1: 84, c: P.bone, s: P.cinnabar, w: 0.8 },
        { t: 'petals', n: 8, r0: 57, r1: 70, c: P.bone, s: P.cinnabar, w: 0.8 },
        { t: 'tri', c: P.ink, w: 1.2, set: [
          [50, 55, -53], [38, 41, -43], [25, 29, -28], [13, 16, -15],
          [-53, 55, 50], [-41, 45, 40], [-30, 34, 28], [-19, 22, 18], [-9, 11, 9]
        ] },
        { t: 'disc', r: 3, c: P.cinnabar }
      ]
    },
    {
      id: 'vastu', name: 'Васту-пуруша-мандала', group: 'hindu', tradition: 'Індія, архітектурний канон',
      meta: '9×9 = 81 клітина · Брахма в центрі',
      note: 'Не для медитації, а для будівництва: сітка, за якою розмічають храм. Кожна клітина закріплена за божеством, центральні дев’ять — за Брахмою.',
      layers: [
        { t: 'sq', r: 90, c: P.ink, w: 1.8 },
        { t: 'grid', n: 9, r: 90, c: P.ink, w: 0.6 },
        { t: 'cells', n: 9, r: 90, o: 0.9, set: [
          [3, 3, 3, 3, P.orpiment],
          [0, 0, 1, 1, P.cinnabar], [8, 0, 1, 1, P.cinnabar],
          [0, 8, 1, 1, P.cinnabar], [8, 8, 1, 1, P.cinnabar],
          [4, 0, 1, 1, P.lapis], [0, 4, 1, 1, P.lapis],
          [8, 4, 1, 1, P.lapis], [4, 8, 1, 1, P.lapis]
        ] },
        { t: 'disc', r: 7, c: P.ink }
      ]
    },
    {
      id: 'iikaah', name: 'Іікаа', group: 'other', tradition: 'Навахо, піщаний живопис',
      meta: '4 напрямки · оправа відкрита на схід',
      note: 'Пісок сиплють просто на долівку хоґану під час обряду зцілення й стирають до заходу сонця. Веселкова оправа обіймає схему з трьох боків, зі сходу лишають вхід.',
      layers: [
        { t: 'openBorder', r: 88, w: 6, c: P.cinnabar },
        { t: 'bars', r0: 18, r1: 74, w: 11, edge: P.ink, cols: [P.bone, P.lapis, P.orpiment, P.malachite] },
        { t: 'sq', r: 16, c: P.ink, w: 1.4, fill: P.bone },
        { t: 'cross', r: 10, c: P.cinnabar, w: 1.6 }
      ]
    },
    {
      id: 'rose', name: 'Готична роза', group: 'other', tradition: 'Франція, XIII ст.',
      meta: 'кам’яне мереживо · 12 сегментів',
      note: 'Європа прийшла до тієї самої фігури через світло: радіальне мереживо із заскленими люкарнами. Західна роза Шартра ділиться на дванадцять.',
      layers: [
        { t: 'band', r: 96, w: 3, c: P.ink },
        { t: 'band', r: 86, w: 1.2, c: P.ink },
        { t: 'lobes', n: 12, rm: 62, rl: 20, c: P.lapis, w: 1.6 },
        { t: 'rays', n: 12, r0: 34, r1: 86, c: P.ink, w: 0.8, phase: Math.PI / 12 },
        { t: 'dots', n: 12, r: 92, rd: 3, c: P.cinnabar },
        { t: 'petals', n: 8, r0: 10, r1: 32, c: P.orpiment, s: P.ink, w: 0.7 },
        { t: 'disc', r: 8, c: P.cinnabar }
      ]
    },
    {
      id: 'girih', name: 'Гірих', group: 'other', tradition: 'Ісламський світ, геометрія',
      meta: '10-променева симетрія · без образів',
      note: 'Тут немає центральної фігури взагалі: заборона зображень лишила саму структуру. Візерунок за задумом продовжується поза межами панелі.',
      layers: [
        { t: 'band', r: 94, w: 1.2, c: P.malachite },
        { t: 'star', n: 10, step: 3, r: 92, c: P.ink, w: 1.1 },
        { t: 'star', n: 10, step: 4, r: 72, c: P.malachite, w: 1.1 },
        { t: 'rosettes', n: 5, r: 56, rl: 15, c: P.gold, w: 0.9 },
        { t: 'star', n: 10, step: 3, r: 30, c: P.ink, w: 1.1 },
        { t: 'band', r: 12, w: 1.2, c: P.malachite }
      ]
    },
    {
      id: 'jung', name: 'Мандала Юнга', group: 'modern', tradition: 'Європа, XX ст., психологія',
      meta: 'кватерність · коло та квадрат',
      note: 'Юнг малював кола щодня і побачив у них знак Самості. Його формула — «квадратура кола»: чотиричастинний поділ, що втримує психіку вкупі.',
      layers: [
        { t: 'quads', r: 66, cols: [P.orpiment, P.cinnabar, P.lapis, P.malachite], o: 0.9 },
        { t: 'band', r: 88, w: 2, c: P.ink },
        { t: 'sq', r: 62, c: P.ink, w: 1.6, rot: 45 },
        { t: 'band', r: 44, w: 1.4, c: P.ink },
        { t: 'cross', r: 88, c: P.ink, w: 0.8 },
        { t: 'sq', r: 18, c: P.ink, w: 1.4, fill: P.bone },
        { t: 'disc', r: 6, c: P.ink }
      ]
    },
    {
      id: 'enso', name: 'Енсо', group: 'buddh', tradition: 'Японія, дзен',
      meta: 'один рух · коло лишають незамкненим',
      note: 'Гранична межа форми: усе, що лишилося від мандали, — один мазок, зроблений за раз і не виправлений. Розрив у колі навмисний.',
      layers: [
        { t: 'brush', r: 62, w: 13, c: P.ink }
      ]
    }
  ];

  /* Схема для розділу «Анатомія»: шари підписані й підсвічуються з легенди. */
  var anatomy = {
    id: 'anatomy', name: 'Анатомія мандали',
    layers: [
      { t: 'spikes', n: 64, r0: 84, r1: 99, c: P.cinnabar, part: 'Кільце вогню' },
      { t: 'dots',   n: 28, r: 76, rd: 3.4, c: P.lapis, part: 'Кільце ваджр' },
      { t: 'petals', n: 16, r0: 48, r1: 70, c: P.bone, s: P.malachite, w: 0.9, part: 'Лотосове кільце' },
      { t: 'quads',  r: 44, cols: [P.bone, P.lapis, P.cinnabar, P.malachite], o: 0.8, part: 'Чотири сторони' },
      { t: 'palace', r: 44, c: P.gold, w: 2, part: 'Мури й брами' },
      { t: 'disc',   r: 11, c: P.gold, part: 'Центр' }
    ]
  };

  root.MANDALA = { P: P, specs: specs, anatomy: anatomy, svg: svg, draw: draw, draft: draft, metrics: metrics };
})(typeof globalThis !== 'undefined' ? globalThis : this);

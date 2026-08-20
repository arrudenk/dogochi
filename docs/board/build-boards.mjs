#!/usr/bin/env node
// Джерела правди -> борди для freedomOfThought / freeboard.
// Запуск: node docs/board/build-boards.mjs
//
// Три борди, одна функція розкладки:
//   balu-tasks.json     -> balu-board.json            (задачі, статуси міняються часто)
//   balu-refs.json      -> balu-refs-board.json       (рішення й референси)
//   balu-mechanics.json -> balu-mechanics-board.json  (механіки)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(HERE, f), 'utf8'));

// статуси задач: колір з Pantone-палітри борду + глиф (глиф лишається читабельним у ч/б PDF)
const STATUS = {
  todo:    { glyph: '▢', color: null,      label: 'не почато' },
  doing:   { glyph: '◐', color: '#FFBE98', label: 'в роботі' },
  done:    { glyph: '▣', color: '#88B04B', label: 'зроблено' },
  blocked: { glyph: '⊘', color: '#939597', label: 'заблоковано' },
};

const SEC_W = 400, SEC_H = 130, SEC_GAP = 460, SEC_Y = 0;
const IT_W = 340, IT_H = 190, IT_DY = 220, IT_Y0 = 250, IT_INSET = 30;
const HEAD_Y = -420;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const small = (s, em = 0.62) => `<span style="font-size:${em}em">${esc(s)}</span>`;

// board: { title, subtitle, sections: [{ id, title, subtitle, color, items: [{ title, note, glyph?, color? }] }] }
// extras: додаткові ноди-картки в шапці (прогрес, легенда) — { id, style, content, width, height }
function layout(board, extras = []) {
  const nodes = [], edges = [];
  const edge = (from, to) => edges.push({ id: `e-${from}-${to}`, from, to });

  board.sections.forEach((sec, i) => {
    const sx = i * SEC_GAP;
    nodes.push({
      id: `sec-${sec.id}`, type: 'text',
      x: sx, y: SEC_Y, width: SEC_W, height: SEC_H,
      style: 'heading', color: sec.color,
      content: `<b>${esc(sec.title)}</b><br>${small(sec.subtitle, 0.52)}` +
               (sec.counter ? `<br>${small(sec.counter, 0.48)}` : ''),
    });
    edge('root', `sec-${sec.id}`);

    sec.items.forEach((it, j) => {
      const node = {
        id: `it-${sec.id}-${j}`, type: 'text',
        x: sx + IT_INSET, y: IT_Y0 + j * IT_DY, width: IT_W, height: IT_H,
        style: 'body',
        content: `<b>${it.glyph ? esc(it.glyph) + ' ' : ''}${esc(it.title)}</b><br>${small(it.note)}`,
      };
      if (it.color) node.color = it.color;
      nodes.push(node);
      edge(`sec-${sec.id}`, `it-${sec.id}-${j}`);
    });
  });

  const centerX = ((board.sections.length - 1) * SEC_GAP + SEC_W) / 2;
  nodes.unshift({
    id: 'root', type: 'text',
    x: Math.round(centerX - 310), y: HEAD_Y, width: 620, height: 150,
    style: 'heading', color: '#BB2649',
    content: `<b>${esc(board.title)}</b><br>${small(board.subtitle, 0.5)}`,
  });

  // шапка: extras розкладаються ліворуч і праворуч від заголовка
  extras.forEach((ex, k) => {
    const w = ex.width || 380;
    nodes.push({
      ...ex, type: 'text',
      x: Math.round(centerX - 310) + (k % 2 === 0 ? -(w + 60) : 680 + Math.floor(k / 2) * (w + 40)),
      y: HEAD_Y + Math.floor(k / 2) * 20,
      width: w, height: ex.height || 200,
    });
    edge('root', ex.id);
  });

  // правило борду: жодних двох нод з однаковим x/y — інакше імпортер розсуне +24/+24 і зламає розкладку
  const seen = new Set();
  for (const n of nodes) {
    const k = `${n.x},${n.y}`;
    if (seen.has(k)) throw new Error(`duplicate position ${k} at ${n.id}`);
    seen.add(k);
  }
  return { nodes, edges };
}

const write = (file, data, label) => {
  writeFileSync(join(HERE, file), JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`${file.padEnd(28)} ${String(data.nodes.length).padStart(3)} нод · ${String(data.edges.length).padStart(3)} звʼязків  ${label}`);
};

// ---------- 1. задачі ----------
{
  const src = read('balu-tasks.json');
  let all = 0, done = 0;
  const perPhase = [];
  const board = {
    title: src.project,
    subtitle: 'тамагочі для реального пса · iOS · Swift · ' + src.spec,
    sections: src.phases.map((ph) => {
      const d = ph.tasks.filter((t) => t.status === 'done').length;
      all += ph.tasks.length; done += d;
      perPhase.push(`${ph.title.split(' ')[0]} ${d}/${ph.tasks.length}`);
      return {
        id: ph.id, title: ph.title, subtitle: ph.subtitle, color: ph.color,
        counter: `${d} / ${ph.tasks.length}`,
        items: ph.tasks.map((t) => {
          const st = STATUS[t.status] || STATUS.todo;
          return { title: `${t.id} · ${t.title}`, note: t.note, glyph: st.glyph, color: st.color };
        }),
      };
    }),
  };
  const extras = [
    { id: 'progress', style: 'subheading', height: 150,
      content: `<b>ВИКОНАНО ${done} / ${all}</b><br>${small(perPhase.join(' · '), 0.44)}` },
    { id: 'legend', style: 'caption', height: 230,
      content: `<b>ЛЕГЕНДА</b><br>` +
        Object.values(STATUS).map((s) => small(`${s.glyph}  ${s.label}`, 0.6)).join('<br>') +
        `<br>${small('колір фази = важливість · статус задачі = колір + глиф', 0.44)}` },
  ];
  write('balu-board.json', layout(board, extras), `виконано ${done}/${all}`);
}

// ---------- 2. рішення й референси, 3. механіки ----------
write('balu-refs-board.json', layout(read('balu-refs.json')), '');
write('balu-mechanics-board.json', layout(read('balu-mechanics.json')), '');

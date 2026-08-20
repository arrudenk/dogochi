#!/usr/bin/env node
// balu-tasks.json (джерело правди) -> balu-board.json (борд для freedomOfThought)
// Запуск: node docs/board/build-board.mjs
// Далі в freedomOfThought: Import JSON (replace) — координати лежать у файлі.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const src = JSON.parse(readFileSync(join(HERE, 'balu-tasks.json'), 'utf8'));

// статуси: колір з палітри Pantone борду + глиф (глиф лишається читабельним у PDF ч/б)
const STATUS = {
  todo:    { glyph: '▢', color: null,      label: 'не почато' },
  doing:   { glyph: '◐', color: '#FFBE98', label: 'в роботі' },
  done:    { glyph: '▣', color: '#88B04B', label: 'зроблено' },
  blocked: { glyph: '⊘', color: '#939597', label: 'заблоковано' },
};

// сітка: фази в рядок, задачі колонкою під своєю фазою
const PHASE_W = 400, PHASE_H = 130, PHASE_GAP = 460, PHASE_Y = 0;
const TASK_W = 340, TASK_H = 170, TASK_DY = 200, TASK_Y0 = 240, TASK_INSET = 30;
const HEAD_Y = -400;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const small = (s, em = 0.65) => `<span style="font-size:${em}em">${esc(s)}</span>`;

const nodes = [];
const edges = [];
const edge = (from, to) => edges.push({ id: `e-${from}-${to}`, from, to });

const totals = { all: 0, done: 0 };
const perPhase = [];

src.phases.forEach((phase, i) => {
  const px = i * PHASE_GAP;
  const doneCount = phase.tasks.filter((t) => t.status === 'done').length;
  totals.all += phase.tasks.length;
  totals.done += doneCount;
  perPhase.push(`${phase.title.split(' ')[0]} ${doneCount}/${phase.tasks.length}`);

  nodes.push({
    id: `phase-${phase.id}`,
    type: 'text',
    x: px, y: PHASE_Y, width: PHASE_W, height: PHASE_H,
    style: 'heading',
    color: phase.color,
    content: `<b>${esc(phase.title)}</b><br>${small(phase.subtitle, 0.55)}<br>${small(`${doneCount} / ${phase.tasks.length}`, 0.5)}`,
  });
  edge('root', `phase-${phase.id}`);

  phase.tasks.forEach((task, j) => {
    const st = STATUS[task.status] || STATUS.todo;
    const node = {
      id: `task-${task.id}`,
      type: 'text',
      x: px + TASK_INSET, y: TASK_Y0 + j * TASK_DY, width: TASK_W, height: TASK_H,
      style: 'body',
      content: `<b>${st.glyph} ${esc(task.id)} · ${esc(task.title)}</b><br>${small(task.note)}`,
    };
    if (st.color) node.color = st.color;
    nodes.push(node);
    edge(`phase-${phase.id}`, `task-${task.id}`);
  });
});

// заголовок, прогрес, легенда — над рядом фаз
const centerX = ((src.phases.length - 1) * PHASE_GAP + PHASE_W) / 2;

nodes.unshift({
  id: 'root',
  type: 'text',
  x: Math.round(centerX - 310), y: HEAD_Y, width: 620, height: 150,
  style: 'heading',
  color: '#BB2649',
  content: `<b>${esc(src.project)}</b><br>${small('тамагочі для реального пса · iOS · Swift', 0.5)}<br>${small(src.spec, 0.4)}`,
});

nodes.push({
  id: 'progress',
  type: 'text',
  x: Math.round(centerX - 310) - 460, y: HEAD_Y, width: 380, height: 150,
  style: 'subheading',
  content: `<b>ВИКОНАНО ${totals.done} / ${totals.all}</b><br>${small(perPhase.join(' · '), 0.45)}`,
});
edge('root', 'progress');

nodes.push({
  id: 'legend',
  type: 'text',
  x: Math.round(centerX - 310) + 700, y: HEAD_Y, width: 380, height: 230,
  style: 'caption',
  content: `<b>ЛЕГЕНДА</b><br>` +
    Object.values(STATUS).map((s) => small(`${s.glyph}  ${s.label}`, 0.6)).join('<br>') +
    `<br>${small('колір фази = важливість; статус задачі = колір + глиф', 0.45)}`,
});
edge('root', 'legend');

const out = { nodes, edges };
writeFileSync(join(HERE, 'balu-board.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');

// перевірка правила «жодних двох нод з однаковим x/y» — інакше імпортер розсуне +24/+24
const seen = new Set();
for (const n of nodes) {
  const key = `${n.x},${n.y}`;
  if (seen.has(key)) throw new Error(`duplicate position ${key} at ${n.id}`);
  seen.add(key);
}

console.log(`balu-board.json: ${nodes.length} нод, ${edges.length} звʼязків · виконано ${totals.done}/${totals.all}`);

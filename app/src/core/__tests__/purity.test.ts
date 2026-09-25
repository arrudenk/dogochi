import { compute } from '../engine';
import { heraldQueue } from '../herald';
import { desiredNotifications } from '../notifications';
import { addDays } from '../time';
import { YEAR_START, input, perfectYear } from './fixtures';

// @types/node у проєкті немає — тягнемо fs/path мінімальними локальними оголошеннями
declare const require: (id: string) => any;
declare const __dirname: string;
const fs = require('node:fs') as {
  readdirSync: (p: string) => string[];
  readFileSync: (p: string, enc: string) => string;
};
const path = require('node:path') as { join: (...parts: string[]) => string };

const CORE_DIR = path.join(__dirname, '..');

function coreFiles(): string[] {
  return fs
    .readdirSync(CORE_DIR)
    .filter((f: string) => f.endsWith('.ts'))
    .map((f: string) => path.join(CORE_DIR, f));
}

describe('межа двигуна', () => {
  test('жоден модуль ядра не питає системний час', () => {
    for (const file of coreFiles()) {
      const src = fs.readFileSync(file, 'utf8');
      expect({ file, hit: /Date\.now\s*\(/.test(src) }).toEqual({ file, hit: false });
      expect({ file, hit: /new\s+Date\s*\(\s*\)/.test(src) }).toEqual({ file, hit: false });
      expect({ file, hit: /performance\s*\.\s*now/.test(src) }).toEqual({ file, hit: false });
    }
  });

  test('ядро не імпортує нічого поза src/core', () => {
    for (const file of coreFiles()) {
      const src = fs.readFileSync(file, 'utf8');
      const specifiers = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
      for (const s of specifiers) {
        expect({ file, s, ok: s.startsWith('./') && !s.includes('..') }).toEqual({ file, s, ok: true });
      }
    }
  });

  test('той самий вхід дає глибоко однаковий вихід', () => {
    const events = perfectYear();
    const now = addDays(YEAR_START, 365);
    const a = compute(input({ events, now }));
    const b = compute(input({ events, now }));
    expect(a).toEqual(b);
    expect(heraldQueue(a, [])).toEqual(heraldQueue(b, []));
    expect(desiredNotifications({ now, quests: a.quests, lastOpenedAt: addDays(now, -5) })).toEqual(
      desiredNotifications({ now, quests: b.quests, lastOpenedAt: addDays(now, -5) }),
    );
  });

  test('compute не мутує вхід', () => {
    const events = perfectYear();
    const snapshot = JSON.stringify(events);
    const arg = input({ events, now: addDays(YEAR_START, 365) });
    compute(arg);
    expect(JSON.stringify(events)).toBe(snapshot);
    expect(arg.events).toHaveLength(events.length);
  });
});

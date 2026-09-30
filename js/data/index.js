// Single entry point for learning content. Adding a unit = add it to units-*.js (+ its words in
// vocab.js); lessons, the path, search and practice pools are derived from it automatically.
import GA from './grammar-a.js';
import GB from './grammar-b.js';
import UA from './units-a.js';
import UB from './units-b.js';
import { VOCAB, CATEGORIES } from './vocab.js';
import { CONVERTED } from './classic.js';
import { MISTAKES, TIPS } from './mistakes.js';
import { uid } from '../core/util.js';

export { CATEGORIES, MISTAKES, TIPS };

export const LEVELS = [
  { id: 'a1', code: 'A1', name: 'Beginner', es: 'Principiante',
    goals: ['Presentarte y hablar de ti y tu familia', 'Describir tu rutina y tu entorno', 'Pedir comida y preguntar direcciones', 'Entender frases y textos muy sencillos'] },
  { id: 'a2', code: 'A2', name: 'Elementary', es: 'Elemental',
    goals: ['Contar experiencias pasadas', 'Hablar de planes y del futuro', 'Desenvolverte en viajes, tiendas y en el médico', 'Comparar lugares y opciones'] },
  { id: 'b1', code: 'B1', name: 'Intermediate', es: 'Intermedio',
    goals: ['Narrate experiences and tell stories', 'Handle job interviews and work situations', 'Give and justify opinions', 'Understand the main points of clear texts'] },
  { id: 'b2', code: 'B2', name: 'Upper Intermediate', es: 'Intermedio alto',
    goals: ['Hold fluent conversations with native speakers', 'Write clear professional emails and essays', 'Understand news, arguments and complex texts', 'Speculate and argue about hypothetical situations'] },
  { id: 'c1', code: 'C1', name: 'Advanced', es: 'Avanzado',
    goals: ['Write cautious academic and professional texts', 'Adapt tone and register to any audience', 'Understand implicit meaning in demanding texts', 'Express ideas with precision and nuance'] },
  { id: 'c2', code: 'C2', name: 'Proficiency', es: 'Maestría', soon: true, goals: [] },
];
export const LEVEL = Object.fromEntries(LEVELS.map(l => [l.id, l]));
export const LEVEL_IDS = LEVELS.filter(l => !l.soon).map(l => l.id);

// ——— Grammar topics (+ the original class exercises merged in) ———
export const TOPICS = Object.fromEntries([...GA, ...GB].map(t => [t.id, t]));
for (const { topic, ...ex } of CONVERTED) TOPICS[topic].ex.push({ ...ex, src: 'classic' });
for (const t of Object.values(TOPICS)) t.ex.forEach(e => { e.skill = 'grammar'; e.topic = t.id; e.key = uid([t.id, e.q, e.a, e.o]); });
export const TOPIC_LIST = Object.values(TOPICS);

// ——— Words ———
export const WORDS = [];
export const WORD = {};
for (const [unit, rows] of Object.entries(VOCAB)) {
  for (const [en, es, ipa, ex, cat, pos] of rows) {
    const w = { id: en, en, es, ipa, ex, cat, pos, unit, level: unit.slice(0, 2) };
    WORDS.push(w); WORD[en] = w;
  }
}

// ——— Units and lessons ———
export const UNITS = [...UA, ...UB];
export const UNIT = Object.fromEntries(UNITS.map(u => [u.id, u]));
export const LESSONS = [];
export const LESSON = {};
for (const u of UNITS) {
  u.words = WORDS.filter(w => w.unit === u.id);
  u.lessons = [
    { id: `${u.id}-v`, unit: u.id, kind: 'vocab', title: `Words: ${u.title}`, es: `Vocabulario: ${u.es || u.title}`, min: 8 },
    ...u.grammar.map(g => ({ id: `${u.id}-g-${g}`, unit: u.id, kind: 'grammar', topic: g, title: TOPICS[g].title, es: TOPICS[g].es, min: 10 })),
    { id: `${u.id}-s`, unit: u.id, kind: 'skills', title: 'Real English: listen & read', es: 'Inglés real: escucha y lee', min: 12 },
  ];
  u.lessons.forEach(l => { LESSONS.push(l); LESSON[l.id] = l; });
  [u.listening, u.reading].forEach((block, k) => block.q.forEach(q => {
    q.skill = k ? 'reading' : 'listening'; q.key = uid([u.id, q.q]);
  }));
}
export const unitsOf = level => UNITS.filter(u => u.level === level);
export const topicsOf = level => TOPIC_LIST.filter(t => t.level === level);
export const wordsOf = level => WORDS.filter(w => w.level === level);
export const levelIndex = id => LEVEL_IDS.indexOf(id);

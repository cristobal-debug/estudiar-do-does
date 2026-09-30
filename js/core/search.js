// Global search across grammar, vocabulary, units, lessons, reading, examples and common mistakes.
import { norm } from './util.js';
import { TOPIC_LIST, WORDS, UNITS, MISTAKES, LEVEL, CATEGORIES } from '../data/index.js';

let INDEX = null;
function build() {
  const e = [];
  const add = (type, title, sub, href, ...text) => e.push({ type, title, sub, href, t: norm(title), x: norm(text.join(' ')) });
  for (const t of TOPIC_LIST) {
    add('grammar', t.title, `${LEVEL[t.level].code} · ${t.es}`, `#/grammar/${t.id}`, t.es, t.sum, t.explain.join(' '));
    t.examples.forEach(([en, es]) => add('example', en, `${t.title}${es ? ' · ' + es : ''}`, `#/grammar/${t.id}`, es));
    t.ex.forEach(x => { if (x.q && x.t !== 'card') add('exercise', x.q, `${t.title} · ${LEVEL[t.level].code}`, `#/grammar/${t.id}/practice`, [].concat(x.a || x.o || []).join(' ')); });
  }
  for (const w of WORDS) add('word', w.en, `${w.es} · ${LEVEL[w.level].code} · ${CATEGORIES[w.cat][0]}`, `#/vocabulary/word/${encodeURIComponent(w.id)}`, w.es, w.ex, w.cat);
  for (const u of UNITS) {
    add('unit', `${u.title}`, `${LEVEL[u.level].code} · Unit ${u.n}${u.es ? ' · ' + u.es : ''}`, `#/unit/${u.id}`, u.es || '', u.can.join(' '));
    u.lessons.forEach(l => add('lesson', l.title, `${LEVEL[u.level].code} · ${u.title}`, `#/lesson/${l.id}`, l.es || ''));
    add('reading', u.reading.title, `Reading · ${LEVEL[u.level].code}`, `#/reading/${u.id}`, u.reading.text);
    add('listening', `Listening: ${u.title}`, `${LEVEL[u.level].code}`, `#/listening/${u.id}`, u.listening.say);
  }
  for (const [id, m] of Object.entries(MISTAKES)) add('mistake', `${m.wrong} → ${m.right}`, 'Common mistake · Error típico', `#/mistakes#${id}`, m.es);
  return e;
}

const ORDER = ['grammar', 'lesson', 'unit', 'word', 'mistake', 'example', 'exercise', 'reading', 'listening'];
export function search(q, limit = 40) {
  INDEX ||= build();
  const toks = norm(q).split(' ').filter(Boolean);
  if (!toks.length) return [];
  const hits = [];
  for (const e of INDEX) {
    let score = 0, all = true;
    for (const t of toks) {
      if (e.t.startsWith(t)) score += 6; else if (e.t.includes(t)) score += 4; else if (e.x.includes(t)) score += 1; else { all = false; break; }
    }
    if (all) hits.push({ ...e, score: score + (e.t === toks.join(' ') ? 10 : 0) - ORDER.indexOf(e.type) * 0.1 });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
export const TYPE_LABEL = {
  grammar: ['Grammar', 'Gramática'], lesson: ['Lessons', 'Lecciones'], unit: ['Units', 'Unidades'], word: ['Vocabulary', 'Vocabulario'],
  mistake: ['Common mistakes', 'Errores típicos'], example: ['Examples', 'Ejemplos'], exercise: ['Exercises', 'Ejercicios'],
  reading: ['Reading', 'Lectura'], listening: ['Listening', 'Listening'],
};

// The learning path: what is unlocked, what comes next, how far each skill has got.
import { S, save, doneToday, SKILLS } from './store.js';
import { dueCount, strength, learnedIds } from './srs.js';
import { UNITS, UNIT, LEVEL_IDS, LEVEL, unitsOf, topicsOf, wordsOf, TOPICS, MISTAKES } from '../data/index.js';

export const lessonDone = id => !!S.lessons[id];
export const unitDone = u => u.lessons.every(l => lessonDone(l.id));
export const unitRatio = u => u.lessons.filter(l => lessonDone(l.id)).length / u.lessons.length;

// Where the learner's path starts (placement result), as an index into UNITS.
const startIndex = () => Math.max(0, UNITS.findIndex(u => u.level === (S.placed?.start || 'a1')));

export function currentUnit() {
  const st = startIndex();
  return UNITS.find((u, i) => i >= st && !unitDone(u)) || UNITS.find(u => !unitDone(u)) || UNITS[UNITS.length - 1];
}

// done · current · open (reachable, e.g. below your level or already started) · locked (ahead of you)
export function unitState(u) {
  if (unitDone(u)) return 'done';
  if (u.id === currentUnit().id) return 'current';
  const i = UNITS.indexOf(u);
  if (i < startIndex() || (i > 0 && unitDone(UNITS[i - 1])) || S.forced[u.id] || u.lessons.some(l => lessonDone(l.id))) return 'open';
  return 'locked';
}
export function forceOpen(unitId) { S.forced[unitId] = true; save(); }

export function nextLesson(u = currentUnit()) {
  return u.lessons.find(l => !lessonDone(l.id)) || null;
}

// After finishing lessons the learner may move into the next CEFR level.
export function syncLevel() {
  const cur = currentUnit();
  const from = S.level;
  if (LEVEL_IDS.indexOf(cur.level) > LEVEL_IDS.indexOf(S.level) && unitsOf(S.level).every(unitDone)) {
    S.level = cur.level; save();
    return { from, to: cur.level };
  }
  return null;
}

const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// 0..1 per skill, measured against the content of one level.
export function skillProgress(level = S.level) {
  const units = unitsOf(level);
  const item = k => avg(units.map(u => S.items[`${k}:${u.id}`] || 0));
  return {
    vocabulary: avg(wordsOf(level).map(w => strength(w.id))),
    grammar: avg(topicsOf(level).map(t => S.topics[t.id]?.best || 0)),
    listening: item('listening'),
    reading: item('reading'),
    writing: item('writing'),
    speaking: item('speaking'),
  };
}
export const levelRatio = (level = S.level) => {
  const ls = unitsOf(level).flatMap(u => u.lessons);
  return ls.length ? ls.filter(l => lessonDone(l.id)).length / ls.length : 0;
};

export const SKILL_META = {
  vocabulary: { en: 'Vocabulary', es: 'Vocabulario', icon: 'vocab', href: '#/vocabulary' },
  grammar: { en: 'Grammar', es: 'Gramática', icon: 'grammar', href: '#/grammar' },
  listening: { en: 'Listening', es: 'Comprensión oral', icon: 'listen', href: '#/listening' },
  reading: { en: 'Reading', es: 'Lectura', icon: 'read', href: '#/reading' },
  writing: { en: 'Writing', es: 'Escritura', icon: 'write', href: '#/writing' },
  speaking: { en: 'Speaking', es: 'Expresión oral', icon: 'speak', href: '#/speaking' },
};

// Accuracy-based strengths and weaknesses (needs a few answers to say anything).
export function areas() {
  const rows = SKILLS.map(s => ({ s, ...(S.acc[s] || { c: 0, t: 0 }) })).filter(r => r.t >= 5)
    .map(r => ({ ...r, acc: r.c / r.t })).sort((a, b) => a.acc - b.acc);
  return { weak: rows.filter(r => r.acc < 0.75).slice(0, 2), strong: rows.filter(r => r.acc >= 0.8).reverse().slice(0, 2) };
}
export function topMistakes(n = 3) {
  return Object.entries(S.mistakes.tags)
    .map(([id, t]) => ({ id, ...t, open: t.n - t.fixed, ...MISTAKES[id] }))
    .filter(m => m.open > 0 && m.wrong).sort((a, b) => b.open - a.open).slice(0, n);
}

// Words from units the learner has reached that are not in the review deck yet.
export function newWords(n = 8) {
  const cur = currentUnit();
  const reach = UNITS.slice(0, UNITS.indexOf(cur) + 1).filter(u => unitState(u) !== 'locked');
  const order = [cur, ...reach.filter(u => u !== cur).reverse()];
  return order.flatMap(u => u.words).filter(w => !S.cards[w.id]).slice(0, n);
}

// Today's plan: four concrete, clickable tasks. It adapts to reviews due and the current unit.
export function todayPlan() {
  const u = currentUnit();
  const due = dueCount();
  const nextG = u.lessons.find(l => l.kind === 'grammar' && !lessonDone(l.id)) || u.lessons.find(l => l.kind === 'grammar');
  const weakTopic = Object.entries(S.topics).filter(([id, t]) => t.best < 0.7 && TOPICS[id]).sort((a, b) => a[1].best - b[1].best)[0];
  const topic = TOPICS[weakTopic ? weakTopic[0] : nextG?.topic || 'be'];
  const alt = new Date().getDay() % 2 ? 'speaking' : 'reading';
  return [
    { skill: 'vocabulary', min: 5, href: due ? '#/review' : '#/review/new', done: doneToday('vocabulary'),
      en: due ? `Review ${due} word${due === 1 ? '' : 's'}` : 'Learn new words', es: due ? `Repasa ${due} palabra${due === 1 ? '' : 's'}` : 'Aprende palabras nuevas' },
    { skill: 'grammar', min: 5, href: `#/grammar/${topic.id}`, done: doneToday('grammar'), en: topic.title, es: topic.es },
    { skill: 'listening', min: 4, href: `#/listening/${u.id}`, done: doneToday('listening'), en: `Listen: ${u.title}`, es: `Escucha: ${u.es || u.title}` },
    alt === 'speaking'
      ? { skill: 'speaking', min: 4, href: `#/speaking/${u.id}`, done: doneToday('speaking'), en: u.speaking.p, es: u.speaking.es || u.speaking.p }
      : { skill: 'reading', min: 5, href: `#/reading/${u.id}`, done: doneToday('reading'), en: `Read: ${u.reading.title}`, es: `Lee: ${u.reading.title}` },
  ];
}

export const levelName = id => LEVEL[id] ? `${LEVEL[id].code} · ${LEVEL[id].name}` : '';
export const wordsLearned = () => learnedIds().length;
export { UNIT };

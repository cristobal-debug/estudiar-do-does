// Spaced repetition (a simplified SM-2). Grades: 0 Again, 1 Hard, 2 Good, 3 Easy.
// Missed words come back in 10 minutes; easy words wait days, then weeks.
import { S, save, day } from './store.js';

const MIN = 60e3, DAY = 864e5;
export const MASTERED_DAYS = 21;

const blank = () => ({ i: 0, e: 2.5, r: 0, l: 0, d: Date.now(), n: 1 });

export function addCards(ids) {
  let added = 0;
  for (const id of ids) if (!S.cards[id]) { S.cards[id] = blank(); added++; }
  if (added) save();
  return added;
}

function next(c, g) {
  c = { ...c };
  if (g === 0) { c.l++; c.r = 0; c.i = 0; c.e = Math.max(1.3, c.e - 0.2); c.d = Date.now() + 10 * MIN; }
  else {
    if (g === 1) { c.i = c.r === 0 ? 0.5 : Math.max(1, +(c.i * 1.2).toFixed(1)); c.e = Math.max(1.3, c.e - 0.15); }
    else if (g === 2) c.i = c.r === 0 ? 1 : c.r === 1 ? 3 : Math.round(c.i * c.e);
    else { c.i = c.r === 0 ? 4 : Math.round(c.i * c.e * 1.3); c.e += 0.15; }
    c.r++; c.d = Date.now() + c.i * DAY;
  }
  delete c.n;
  return c;
}

export function grade(id, g) {
  S.cards[id] = next(S.cards[id] || blank(), g);
  day().reviews++;
  save();
  return S.cards[id];
}

export function intervalLabel(id, g, lang = 'es') {
  const c = next(S.cards[id] || blank(), g);
  if (g === 0) return '10 min';
  if (c.i < 1) return lang === 'es' ? '12 h' : '12 h';
  if (c.i < 30) return `${Math.round(c.i)} ${lang === 'es' ? 'd' : 'd'}`;
  return `${Math.round(c.i / 30)} ${lang === 'es' ? 'mes' : 'mo'}`;
}

export const dueIds = (at = Date.now()) =>
  Object.entries(S.cards).filter(([, c]) => c.d <= at)
    .sort((a, b) => (b[1].l - a[1].l) || (a[1].d - b[1].d)).map(([id]) => id);

export const dueCount = at => dueIds(at).length;
export const dueTomorrow = () => dueCount(Date.now() + DAY) - dueCount();
export const learnedIds = () => Object.keys(S.cards).filter(id => S.cards[id].r > 0 || S.cards[id].l > 0);
export const isMastered = id => (S.cards[id]?.i || 0) >= MASTERED_DAYS;

// 0 = never seen, ~0.1 = seen, grows with the review interval up to 1 (mastered).
export function strength(id) {
  const c = S.cards[id];
  if (!c) return 0;
  if (c.r === 0) return 0.1;
  return Math.min(1, 0.35 + (c.i / MASTERED_DAYS) * 0.65);
}

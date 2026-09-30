// Learner state: one JSON document in localStorage. Every write goes through here,
// so a future sync backend only needs to replace load()/persist().
import { dayKey, debounce, addDays } from './util.js';

const KEY = 'doable:v1';
export const SKILLS = ['vocabulary', 'grammar', 'listening', 'reading', 'writing', 'speaking'];

const fresh = () => ({
  v: 1, created: Date.now(),
  name: '', level: 'a1', placed: null, onboarded: false,
  goal: 10, lang: 'auto', theme: 'system',   // audio settings live in speech.js
  xp: 0,
  days: {},        // 'YYYY-MM-DD' -> { sec, xp, lessons, reviews, c, t, done: [] }
  lessons: {},     // lessonId -> { done: ts, best: 0..1 }
  cards: {},       // wordId -> SRS card
  acc: {},         // skill -> { c, t } lifetime answers
  topics: {},      // grammarId -> { best: 0..1, n }
  items: {},       // 'listening:a1u1' -> best 0..1
  mistakes: { tags: {}, log: [] },
  ach: {},         // achievementId -> ts
  challenges: {},  // dayKey -> true
  drafts: {},      // writing drafts
  forced: {},      // unitIds the learner opened ahead of the path
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign(fresh(), JSON.parse(raw));
  } catch (_) { /* private mode or corrupt data: start fresh */ }
  return fresh();
}

export let S = load();
const listeners = new Set();
const persist = debounce(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} }, 150);

export function save() { persist(); listeners.forEach(f => f()); }
export const onChange = f => { listeners.add(f); return () => listeners.delete(f); };
export function flush() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} }
addEventListener('pagehide', flush);

export function day(k = dayKey()) {
  return (S.days[k] ||= { sec: 0, xp: 0, lessons: 0, reviews: 0, c: 0, t: 0, done: [] });
}

export function addXP(n) { S.xp += n; day().xp += n; save(); }
export function markDone(tag) { const d = day(); if (!d.done.includes(tag)) d.done.push(tag); save(); }
export const doneToday = tag => (S.days[dayKey()]?.done || []).includes(tag);

export function answer(skill, ok) {
  const a = (S.acc[skill] ||= { c: 0, t: 0 });
  a.t++; if (ok) a.c++;
  const d = day(); d.t++; if (ok) d.c++;
  save();
}

export function logMistake(m) {
  const log = S.mistakes.log;
  const prev = log.find(x => x.key === m.key && !x.fixed);
  if (prev) { prev.n = (prev.n || 1) + 1; prev.ts = Date.now(); prev.given = m.given; }
  else log.unshift({ ...m, n: 1, ts: Date.now() });
  if (log.length > 300) log.length = 300;
  if (m.tag) { const t = (S.mistakes.tags[m.tag] ||= { n: 0, fixed: 0 }); t.n++; t.last = Date.now(); }
  save();
}
export function fixMistake(key) {
  const m = S.mistakes.log.find(x => x.key === key && !x.fixed);
  if (!m) return;
  m.fixed = Date.now();
  if (m.tag && S.mistakes.tags[m.tag]) S.mistakes.tags[m.tag].fixed++;
  save();
}
export const openMistakes = () => S.mistakes.log.filter(m => !m.fixed);

export function completeLesson(id, score) {
  const prev = S.lessons[id];
  S.lessons[id] = { done: prev?.done || Date.now(), best: Math.max(prev?.best || 0, score) };
  if (!prev) day().lessons++;
  save();
}
export function topicScore(id, ratio) {
  const t = (S.topics[id] ||= { best: 0, n: 0 });
  t.best = Math.max(t.best, ratio); t.n++; save();
}
export function itemScore(key, ratio) { S.items[key] = Math.max(S.items[key] || 0, ratio); save(); }

export function tick(sec) { day().sec += sec; save(); }

// A day counts for the streak when the learner did something (time, XP or answers).
const active = k => { const d = S.days[k]; return !!d && (d.sec >= 30 || d.xp > 0 || d.t > 0); };
export function streak() {
  let n = 0, cur = new Date();
  if (!active(dayKey(cur))) cur = addDays(cur, -1);
  while (active(dayKey(cur))) { n++; cur = addDays(cur, -1); }
  return n;
}
export function bestStreak() {
  const keys = Object.keys(S.days).filter(active).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    run = prev && dayKey(addDays(new Date(prev + 'T12:00'), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run); prev = k;
  }
  return best;
}

export function reset() { localStorage.removeItem(KEY); S = fresh(); save(); }
export const exportState = () => JSON.stringify(S, null, 1);
export function importState(json) {
  const data = JSON.parse(json);
  if (!data || data.v !== 1 || typeof data.days !== 'object') throw new Error('invalid');
  S = Object.assign(fresh(), data); save(); flush();
}

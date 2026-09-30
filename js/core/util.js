// Small DOM + text helpers shared by every module.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

// Authored content supports **bold** and _italic_ (escaped first, so it stays safe). "___" is a blank.
export const md = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(?<![_\w])_(?!_)([^_\n]+?)_(?![_\w])/g, '<em>$1</em>')
  .replace(/_{3,}/g, '<span class="gap">____</span>');

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// Deterministic PRNG so "today's" content is stable for the whole day.
export function seeded(seed) {
  let s = hashStr(String(seed));
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(a, rnd = Math.random) {
  a = a.slice();
  for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
  return a;
}
export const sample = (a, n, rnd) => shuffle(a, rnd).slice(0, n);

export const dayKey = (d = new Date()) => {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const weekStart = (d = new Date()) => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); return addDays(x, -wd); };

// Answer comparison: case, punctuation, curly quotes and contractions don't matter.
export const norm = s => String(s ?? '').toLowerCase()
  .replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"')
  .replace(/[.!?¡¿,;:"()]/g, ' ').replace(/\s+/g, ' ').trim();
const CONTRACTIONS = [
  [/\bi'm\b/g, 'i am'], [/\b(you|we|they)'re\b/g, '$1 are'], [/\b(he|she|it|that|what|where|who|there|here)'s\b/g, '$1 is'],
  [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bwon't\b/g, 'will not'], [/\bshan't\b/g, 'shall not'],
  [/\b(\w+)n't\b/g, '$1 not'], [/\b(i|you|we|they)'ve\b/g, '$1 have'],
  [/\b(i|you|we|they|he|she|it|there|that)'ll\b/g, '$1 will'], [/\b(i|you|we|they|he|she|it)'d\b/g, '$1 would'],
];
export function canon(s) { let x = norm(s); for (const [r, v] of CONTRACTIONS) x = x.replace(r, v); return x; }

export function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length; if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// Case-sensitive comparison (capital letters exercises): only spacing and quote style are forgiven.
const tidy = s => String(s ?? '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
export const matchExact = (given, accepted) => [].concat(accepted).some(a => tidy(a) === tidy(given)) ? 'ok' : 'no';

// Returns 'ok' | 'typo' | 'no'. A single slip in a long answer counts, with a spelling note.
export function matchAnswer(given, accepted) {
  const g = canon(given); if (!g) return 'no';
  const list = [].concat(accepted).map(canon);
  if (list.includes(g)) return 'ok';
  if (list.some(a => a.length >= 8 && lev(a, g) === 1)) return 'typo';
  return 'no';
}

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const fmtMin = sec => Math.round(sec / 60);
export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const uid = o => 'i' + hashStr(JSON.stringify(o)).toString(36);

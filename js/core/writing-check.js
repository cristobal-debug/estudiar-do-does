// Rule-based writing feedback: typical Spanish-speaker errors, mechanics and task requirements.
// It is honest about its limits: it flags known patterns; it does not "grade" free writing.
import { MISTAKES } from '../data/index.js';
import { LEVEL_IDS } from '../data/index.js';

const DAYS = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday';
const MONTHS = 'january|february|march|april|june|july|august|september|october|november|december';
const LANGS = 'english|spanish|french|german|italian|portuguese|chinese|japanese|british|american|mexican|colombian|argentinian|chilean|peruvian|canadian|irish';

export function checkWriting(text, { need = [], min = 0, level = 'a1' } = {}) {
  const raw = text.trim();
  const low = raw.toLowerCase().replace(/[’‘]/g, "'");
  const words = raw ? raw.split(/\s+/).filter(w => /\w/.test(w)).length : 0;
  const sentences = raw ? raw.split(/(?<=[.!?])\s+/).filter(s => s.trim()).length : 0;
  const lv = LEVEL_IDS.indexOf(level);
  const issues = [];

  for (const [id, m] of Object.entries(MISTAKES)) {
    if (!m.re || LEVEL_IDS.indexOf(m.level) > lv + 1) continue;
    const re = new RegExp(m.re.source, m.re.flags.includes('g') ? m.re.flags : m.re.flags + 'g');
    const hits = [...low.matchAll(re)].map(x => x[0].replace(/^[\s.!?]+/, '').trim()).filter(Boolean);
    if (hits.length) issues.push({ id, found: [...new Set(hits)].slice(0, 3), wrong: m.wrong, right: m.right, es: m.es });
  }

  const mech = [];
  const sents = raw.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const lowerStart = sents.filter(s => /^[a-z]/.test(s));
  if (lowerStart.length) mech.push({ k: 'cap', found: lowerStart.slice(0, 2).map(s => s.split(' ').slice(0, 3).join(' ') + '…') });
  if (/(^|\s)i(\s|'|$)/.test(raw)) mech.push({ k: 'i' });
  const lowerNames = [...raw.matchAll(new RegExp(`\\b(${DAYS}|${MONTHS}|${LANGS})\\b`, 'g'))].map(x => x[0]);
  if (lowerNames.length) mech.push({ k: 'names', found: [...new Set(lowerNames)].slice(0, 4) });
  if (raw && !/[.!?)"]$/.test(raw)) mech.push({ k: 'end' });
  if (/[¿¡]/.test(raw)) mech.push({ k: 'es-marks' });

  const needs = need.map(n => ({ l: n.l, ok: n.re.test(low) }));
  return { words, sentences, issues, mech, needs, minOk: words >= min, min };
}

export const MECH_TEXT = {
  cap: ['Start every sentence with a capital letter.', 'Empieza cada frase con mayúscula.'],
  i: ['The pronoun "I" is always a capital letter.', 'El pronombre «I» siempre va en mayúscula.'],
  names: ['Days, months, languages and nationalities take a capital letter.', 'Días, meses, idiomas y nacionalidades van con mayúscula.'],
  end: ['End your text with a full stop (or ? / !).', 'Termina el texto con punto (o ? / !).'],
  'es-marks': ['English has no ¿ or ¡ — only ? and ! at the end.', 'En inglés no existen ¿ ni ¡: solo ? y ! al final.'],
};

// Scoring used for skill progress: task requirements + length, minus flagged issues (never below 0.2 if attempted).
export function writingScore(r) {
  if (!r.words) return 0;
  const reqs = r.needs.length ? r.needs.filter(n => n.ok).length / r.needs.length : 1;
  const len = Math.min(1, r.words / Math.max(1, r.min));
  const penalty = Math.min(0.4, (r.issues.length + r.mech.length) * 0.1);
  return Math.max(0.2, Math.min(1, 0.5 * reqs + 0.5 * len - penalty));
}

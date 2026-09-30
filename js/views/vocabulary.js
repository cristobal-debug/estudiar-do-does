import { esc } from '../core/util.js';
import { L, lang } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S } from '../core/store.js';
import { strength, addCards } from '../core/srs.js';
import { sayBtn, runSession } from '../core/session.js';
import { vocabItems } from '../core/generate.js';
import { WORDS, WORD, CATEGORIES, LEVELS, LEVEL, UNIT } from '../data/index.js';
import { h1, bar } from './ui.js';
import { flashcards } from './review.js';

const catName = c => CATEGORIES[c][lang() === 'es' ? 1 : 0];
const status = w => { const s = strength(w.id); return s === 0 ? ['new', L('New', 'Nueva')] : s >= 1 ? ['mastered', L('Mastered', 'Dominada')] : ['learning', L('Learning', 'Aprendiendo')]; };

function wordRow(w) {
  const [cls, lbl] = status(w);
  return `<li class="word-row"><a href="#/vocabulary/word/${encodeURIComponent(w.id)}"><b lang="en">${esc(w.en)}</b><span class="muted">/${esc(w.ipa)}/</span><span>${esc(w.es)}</span></a>
    ${sayBtn(w.en, L('Listen', 'Escuchar'))}<span class="wstat ${cls}">${lbl}</span></li>`;
}

export function vocabulary(root) {
  const cats = Object.keys(CATEGORIES).filter(c => WORDS.some(w => w.cat === c));
  root.innerHTML = `${h1(L('Vocabulary', 'Vocabulario'), { lead: L(`${WORDS.length} words by topic and level, with pronunciation, examples, flashcards and quizzes.`, `${WORDS.length} palabras por temas y niveles, con pronunciación, ejemplos, tarjetas y cuestionarios.`) })}
  <nav class="level-tabs small" aria-label="${L('Levels', 'Niveles')}">${LEVELS.filter(l => !l.soon).map(l => `<a class="lt" href="#/vocabulary/level/${l.id}"><b>${l.code}</b><small>${WORDS.filter(w => w.level === l.id).length}</small></a>`).join('')}</nav>
  <div class="grid topics">${cats.map(c => {
    const ws = WORDS.filter(w => w.cat === c);
    const r = ws.reduce((a, w) => a + strength(w.id), 0) / ws.length;
    return `<a class="link-card topic" href="#/vocabulary/topic/${c}"><span class="t-emoji" aria-hidden="true">${CATEGORIES[c][2]}</span><b>${esc(catName(c))}</b><span>${ws.length} ${L('words', 'palabras')} · ${[...new Set(ws.map(w => LEVEL[w.level].code))].join(' ')}</span>${bar(r, `${Math.round(r * 100)}%`)}</a>`;
  }).join('')}</div>`;
}

function list(root, ws, { title, eyebrow, back }) {
  root.innerHTML = `${h1(title, { eyebrow, back })}
  <div class="row actions">
    <button type="button" class="btn primary" id="fc">${icon('review')} ${L('Flashcards', 'Tarjetas')}</button>
    <button type="button" class="btn ghost" id="quiz">${icon('practice')} ${L('Quiz', 'Cuestionario')}</button>
    <button type="button" class="btn ghost" id="add">${icon('layers')} ${L('Add all to my review', 'Añadir todas a mi repaso')}</button>
  </div>
  <label class="field search-in"><span class="sr">${L('Filter', 'Filtrar')}</span>${icon('search')}<input type="search" placeholder="${L('Filter words…', 'Filtrar palabras…')}" id="flt"></label>
  <ul class="word-list">${ws.map(wordRow).join('')}</ul>`;
  root.querySelector('#fc').onclick = () => flashcards(root, { ids: ws.map(w => w.id).sort(() => Math.random() - 0.5).slice(0, 20), title, back: location.hash });
  root.querySelector('#quiz').onclick = () => runSession(root, { title, items: vocabItems(ws.slice().sort(() => Math.random() - 0.5).slice(0, 10)), exitHref: location.hash, onFinish: () => ({ nextHref: location.hash, nextLabel: L('Back to the list', 'Volver a la lista') }) });
  root.querySelector('#add').onclick = e => { const n = addCards(ws.map(w => w.id)); e.target.closest('button').innerHTML = `${icon('check')} ${n ? L(`${n} added`, `${n} añadidas`) : L('Already in your review', 'Ya estaban en tu repaso')}`; };
  root.querySelector('#flt').oninput = e => {
    const q = e.target.value.toLowerCase().trim();
    root.querySelectorAll('.word-row').forEach((li, i) => { const w = ws[i]; li.hidden = !!q && !(`${w.en} ${w.es}`.toLowerCase().includes(q)); });
  };
}

export function topic(root, { cat }) {
  if (!CATEGORIES[cat]) { location.hash = '#/vocabulary'; return; }
  const ws = WORDS.filter(w => w.cat === cat).sort((a, b) => a.level.localeCompare(b.level));
  list(root, ws, { title: catName(cat), eyebrow: `${CATEGORIES[cat][2]} ${L('Topic', 'Tema')}`, back: '#/vocabulary' });
}
export function levelWords(root, { level }) {
  const lv = LEVEL[level]; if (!lv) { location.hash = '#/vocabulary'; return; }
  list(root, WORDS.filter(w => w.level === level), { title: `${lv.code} · ${L(lv.name, lv.es)}`, eyebrow: L('Vocabulary', 'Vocabulario'), back: '#/vocabulary' });
}

export function word(root, { id }) {
  const w = WORD[decodeURIComponent(id)]; if (!w) { location.hash = '#/vocabulary'; return; }
  const [cls, lbl] = status(w); const c = S.cards[w.id];
  const u = UNIT[w.unit];
  root.innerHTML = `${h1(w.en, { eyebrow: `${LEVEL[w.level].code} · ${esc(catName(w.cat))}`, back: `#/vocabulary/topic/${w.cat}` })}
  <section class="panel word-detail">
    <div class="wd-top"><p class="ipa big">/${esc(w.ipa)}/</p>${sayBtn(w.en, L('Listen', 'Escuchar'))}${sayBtn(w.en, L('Listen slowly', 'Escuchar despacio'), true)}</div>
    <dl class="facts"><div><dt>${L('Spanish', 'Español')}</dt><dd>${esc(w.es)}</dd></div><div><dt>${L('Type', 'Tipo')}</dt><dd>${esc(w.pos)}</dd></div>
      <div><dt>${L('Level', 'Nivel')}</dt><dd>${LEVEL[w.level].code}</dd></div><div><dt>${L('Status', 'Estado')}</dt><dd><span class="wstat ${cls}">${lbl}</span>${c && c.r ? ` · ${L('next review', 'próximo repaso')}: ${new Date(c.d).toLocaleDateString()}` : ''}</dd></div></dl>
    ${w.ex ? `<p class="wc-ex big" lang="en">“${esc(w.ex)}” ${sayBtn(w.ex, L('Listen to the example', 'Escuchar el ejemplo'))}</p>` : ''}
    <div class="row">${c ? '' : `<button type="button" class="btn primary" id="add">${icon('layers')} ${L('Add to my review', 'Añadir a mi repaso')}</button>`}
      <a class="btn ghost" href="#/unit/${u.id}">${L('From unit', 'De la unidad')}: ${esc(u.title)}</a></div>
  </section>`;
  root.querySelector('#add')?.addEventListener('click', e => { addCards([w.id]); e.target.closest('button').outerHTML = `<span class="done-tag">${icon('check')} ${L('Added', 'Añadida')}</span>`; });
}

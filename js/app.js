// App shell: hash router, navigation, global search, time tracking and achievement toasts.
import { esc, debounce } from './core/util.js';
import { L, lang } from './core/i18n.js';
import { icon } from './core/icons.js';
import { S, save, onChange, tick, streak } from './core/store.js';
import { dueCount } from './core/srs.js';
import { speak } from './core/speech.js';
import { checkAchievements } from './core/gamification.js';
import { search, TYPE_LABEL } from './core/search.js';
import { applyTheme } from './core/theme.js';
import { toast } from './views/ui.js';

import dashboard from './views/dashboard.js';
import { learn, unit } from './views/learn.js';
import lesson from './views/lesson.js';
import { review, deck } from './views/review.js';
import * as vocab from './views/vocabulary.js';
import * as gram from './views/grammar.js';
import * as prac from './views/practice.js';
import * as skills from './views/skills.js';
import progress from './views/progress.js';
import profile from './views/profile.js';
import { welcome, placement } from './views/placement.js';
import mistakes from './views/mistakes.js';
import { classicHome, classic } from './views/classic.js';

export { applyTheme };

const ROUTES = [
  ['', dashboard, ['Dashboard', 'Inicio']],
  ['welcome', welcome, ['Welcome', 'Bienvenida']],
  ['placement', placement, ['Level test', 'Test de nivel']],
  ['learn', learn, ['Learn', 'Aprender']],
  ['learn/:level', learn, ['Learn', 'Aprender']],
  ['unit/:id', unit, ['Unit', 'Unidad']],
  ['lesson/:id', lesson, ['Lesson', 'Lección']],
  ['practice', prac.hub, ['Practice', 'Práctica']],
  ['practice/quick', prac.quick, ['5-minute practice', 'Práctica de 5 minutos']],
  ['practice/20', prac.long, ['20-minute session', 'Sesión de 20 minutos']],
  ['practice/daily', prac.daily, ['Daily challenge', 'Reto diario']],
  ['practice/exam', prac.exam, ['Exam mode', 'Modo examen']],
  ['practice/exam/:n', prac.exam, ['Exam', 'Examen']],
  ['practice/mistakes', prac.mistakes, ['My mistakes', 'Mis errores']],
  ['review', review, ['Review', 'Repaso']],
  ['review/:mode', review, ['Review', 'Repaso']],
  ['flashcards/:cat', deck, ['Flashcards', 'Tarjetas']],
  ['vocabulary', vocab.vocabulary, ['Vocabulary', 'Vocabulario']],
  ['vocabulary/topic/:cat', vocab.topic, ['Vocabulary', 'Vocabulario']],
  ['vocabulary/level/:level', vocab.levelWords, ['Vocabulary', 'Vocabulario']],
  ['vocabulary/word/:id', vocab.word, ['Word', 'Palabra']],
  ['grammar', gram.grammar, ['Grammar', 'Gramática']],
  ['grammar/level/:level', gram.grammar, ['Grammar', 'Gramática']],
  ['grammar/:id', gram.topic, ['Grammar', 'Gramática']],
  ['grammar/:id/practice', gram.practice, ['Grammar practice', 'Práctica de gramática']],
  ['listening', (r) => skills.skillList(r, { skill: 'listening' }), ['Listening', 'Listening']],
  ['listening/:id', skills.listening, ['Listening', 'Listening']],
  ['reading', (r) => skills.skillList(r, { skill: 'reading' }), ['Reading', 'Lectura']],
  ['reading/:id', skills.reading, ['Reading', 'Lectura']],
  ['writing', (r) => skills.skillList(r, { skill: 'writing' }), ['Writing', 'Escritura']],
  ['writing/:id', skills.writing, ['Writing', 'Escritura']],
  ['speaking', (r) => skills.skillList(r, { skill: 'speaking' }), ['Speaking', 'Speaking']],
  ['speaking/:id', skills.speaking, ['Speaking', 'Speaking']],
  ['progress', progress, ['Progress', 'Progreso']],
  ['profile', profile, ['Profile', 'Perfil']],
  ['mistakes', mistakes, ['My mistakes', 'Mis errores']],
  ['classic', classicHome, ['Class exercises', 'Ejercicios de clase']],
  ['classic/:mode', classic, ['Class exercises', 'Ejercicios de clase']],
].map(([pat, fn, title]) => {
  const keys = [];
  const re = new RegExp('^' + pat.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  return { pat, re, keys, fn, title };
});

const NAV = [
  ['', 'home', 'Dashboard', 'Inicio'], ['learn', 'learn', 'Learn', 'Aprender'], ['practice', 'practice', 'Practice', 'Práctica'],
  ['review', 'review', 'Review', 'Repaso'], ['vocabulary', 'vocab', 'Vocabulary', 'Vocabulario'], ['grammar', 'grammar', 'Grammar', 'Gramática'],
  ['listening', 'listen', 'Listening', 'Listening'], ['reading', 'read', 'Reading', 'Lectura'], ['writing', 'write', 'Writing', 'Escritura'],
  ['speaking', 'speak', 'Speaking', 'Speaking'], ['progress', 'progress', 'Progress', 'Progreso'], ['mistakes', 'mistakes', 'My mistakes', 'Mis errores'],
];
const MOBILE = [['', 'home', 'Home', 'Inicio'], ['learn', 'learn', 'Learn', 'Aprender'], ['practice', 'practice', 'Practice', 'Práctica'], ['review', 'review', 'Review', 'Repaso'], ['profile', 'profile', 'Profile', 'Perfil']];

const section = path => path.split('/')[0];
const view = document.getElementById('view');

function renderChrome(path) {
  const due = dueCount();
  const sec = section(path);
  const active = k => (k === sec || (k === 'learn' && ['unit', 'lesson'].includes(sec)) || (k === 'practice' && sec === 'classic')) ? ' aria-current="page"' : '';
  const badge = k => k === 'review' && due ? `<span class="badge" aria-label="${due} ${L('due', 'pendientes')}">${due > 99 ? '99+' : due}</span>` : '';
  document.getElementById('side-nav').innerHTML = `<ul>${NAV.map(([k, ic, en, es]) => `<li><a href="#/${k}"${active(k)}>${icon(ic)}<span>${L(en, es)}</span>${badge(k)}</a></li>`).join('')}</ul>
    <a class="side-profile" href="#/profile"${active('profile')}>${icon('profile')}<span>${esc(S.name || L('Profile', 'Perfil'))}</span></a>`;
  document.getElementById('bottom-nav').innerHTML = MOBILE.map(([k, ic, en, es]) => `<a href="#/${k}"${active(k)}>${icon(ic)}<span>${L(en, es)}</span>${badge(k)}</a>`).join('');
  const st = streak();
  document.getElementById('top-stats').innerHTML = `<a href="#/progress" class="stat-chip${st ? ' on' : ''}" title="${L('Streak', 'Racha')}">${icon('flame')}<b>${st}</b><span class="sr">${L('day streak', 'días de racha')}</span></a>
    <a href="#/progress" class="stat-chip xp" title="XP">${icon('bolt')}<b>${S.xp}</b><span class="sr">XP</span></a>`;
  document.getElementById('search-btn').setAttribute('aria-label', L('Search', 'Buscar'));
  document.getElementById('search-btn').querySelector('span').textContent = L('Search', 'Buscar');
  document.getElementById('theme-btn').setAttribute('aria-label', L('Switch light / dark theme', 'Cambiar tema claro / oscuro'));
  document.querySelector('.skip').textContent = L('Skip to content', 'Saltar al contenido');
}

let current = '';
function route() {
  const path = decodeURIComponent(location.hash.replace(/^#\/?/, '').split('#')[0].split('?')[0]).replace(/\/$/, '');
  if (!S.onboarded && !['welcome', 'placement'].includes(path)) { location.replace('#/welcome'); return; }
  const r = ROUTES.find(x => x.re.test(path)) || ROUTES[0];
  const m = path.match(r.re) || [];
  const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
  document.documentElement.lang = lang();
  renderChrome(path);
  const root = document.createElement('div');
  root.className = 'view-inner';
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `${L('Developed by', 'Desarrollado por')} <a href="https://cristobaljeldrez.com" target="_blank" rel="noopener">cristobaljeldrez.com</a>`;
  view.replaceChildren(root, footer);
  try { r.fn(root, params); }
  catch (err) { console.error(err); root.innerHTML = `<div class="panel notice">${icon('alert')}<p>${L('Something went wrong loading this page.', 'Algo ha fallado al cargar esta página.')} <a href="#/">${L('Go home', 'Ir al inicio')}</a></p></div>`; }
  document.title = `${L(...r.title)} · Doable English`;
  if (path !== current) {
    window.scrollTo(0, 0);
    (root.querySelector('h1[tabindex]') || root.querySelector('.session .ses-body') || root).focus?.({ preventScroll: true });
  }
  current = path;
}
addEventListener('hashchange', route);

// Anything with data-say plays English audio.
document.addEventListener('click', e => {
  const b = e.target.closest('[data-say]');
  if (b) { e.preventDefault(); speak(b.dataset.say, { rate: b.dataset.rate ? +b.dataset.rate : undefined }); b.classList.add('playing'); setTimeout(() => b.classList.remove('playing'), 600); }
});

// Theme toggle (light ↔ dark; "system" is available in the profile).
document.getElementById('theme-btn').addEventListener('click', () => {
  const dark = S.theme === 'dark' || (S.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  S.theme = dark ? 'light' : 'dark';
  save();
  applyTheme();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// ——— Global search ———
const dlg = document.getElementById('search-dlg');
const sInput = document.getElementById('search-input');
const sOut = document.getElementById('search-results');
function openSearch() {
  sInput.placeholder = L('Search grammar, words, lessons… e.g. "present perfect"', 'Busca gramática, palabras, lecciones… p. ej. «present perfect»');
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  sInput.select(); renderResults();
}
function renderResults() {
  const q = sInput.value;
  const hits = search(q);
  if (!q.trim()) { sOut.innerHTML = `<p class="muted small">${L('Try: "past simple", "apple", "make or do", "travel"', 'Prueba: «past simple», «apple», «make or do», «travel»')}</p>`; return; }
  if (!hits.length) { sOut.innerHTML = `<p class="muted">${L('No results', 'Sin resultados')}</p>`; return; }
  const groups = {};
  hits.forEach(h => (groups[h.type] ||= []).push(h));
  sOut.innerHTML = Object.entries(groups).map(([t, hs]) => `<section><h3>${L(...TYPE_LABEL[t])}</h3><ul>${hs.slice(0, 6).map(h => `<li><a href="${h.href}"><b>${esc(h.title)}</b><span>${esc(h.sub)}</span></a></li>`).join('')}</ul></section>`).join('');
}
sInput.addEventListener('input', debounce(renderResults, 80));
sOut.addEventListener('click', e => { if (e.target.closest('a')) dlg.close?.() ?? dlg.removeAttribute('open'); });
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
document.getElementById('search-btn').addEventListener('click', openSearch);
document.addEventListener('keydown', e => {
  if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !e.target.matches('input, textarea, select'))) { e.preventDefault(); openSearch(); }
});

// ——— Study time: counted while the page is visible and the learner is active ———
let lastInput = Date.now();
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true }));
setInterval(() => {
  const sec = section(current);
  if (document.visibilityState !== 'visible' || Date.now() - lastInput > 90e3) return;
  if (['', 'profile', 'progress', 'welcome'].includes(sec)) return;
  tick(15);
}, 15e3);

// ——— Achievements & live chrome updates ———
const afterChange = debounce(() => {
  checkAchievements().forEach(a => toast(`<b>${L('Achievement unlocked', 'Logro desbloqueado')}:</b> ${esc(L(a.en, a.es))}`, { icon: 'trophy' }));
  const due = dueCount();
  document.querySelectorAll('a[href="#/review"] .badge').forEach(b => { b.textContent = due > 99 ? '99+' : due; b.hidden = !due; });
  const st = document.querySelector('#top-stats .xp b'); if (st) st.textContent = S.xp;
}, 400);
onChange(afterChange);

applyTheme();
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

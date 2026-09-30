import { esc, shuffle } from '../core/util.js';
import { L, lang } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S, markDone, addXP } from '../core/store.js';
import { dueIds, dueTomorrow, grade, intervalLabel, addCards, learnedIds, isMastered } from '../core/srs.js';
import { newWords } from '../core/path.js';
import { sayBtn } from '../core/session.js';
import { speak, canSpeak, stopSpeaking } from '../core/speech.js';
import { WORD, WORDS, CATEGORIES, LEVEL } from '../data/index.js';
import { h1, empty } from './ui.js';

const GRADES = [
  { g: 0, en: 'Again', es: 'Otra vez', emo: '😵', cls: 'again' },
  { g: 1, en: 'Hard', es: 'Difícil', emo: '😐', cls: 'hard' },
  { g: 2, en: 'Good', es: 'Bien', emo: '🙂', cls: 'good' },
  { g: 3, en: 'Easy', es: 'Fácil', emo: '😄', cls: 'easy' },
];

export function review(root, { mode }) {
  if (mode === 'new') {
    const ws = newWords(8);
    if (!ws.length) {
      root.innerHTML = `${h1(L('Learn new words', 'Aprender palabras nuevas'), { back: '#/review' })}${empty('check', L('You have added every word from your current units. Finish more lessons to unlock new ones.', 'Ya has añadido todas las palabras de tus unidades actuales. Completa más lecciones para desbloquear nuevas.'), `<a class="btn primary" href="#/">${L('Back to dashboard', 'Volver al inicio')}</a>`)}`;
      return;
    }
    addCards(ws.map(w => w.id));
    return flashcards(root, { ids: ws.map(w => w.id), title: L('New words', 'Palabras nuevas'), back: '#/review', learning: true });
  }
  const due = dueIds();
  if (!due.length) {
    const tom = dueTomorrow();
    const learned = learnedIds().length;
    const mastered = Object.keys(S.cards).filter(isMastered).length;
    root.innerHTML = `${h1(L('Review today', 'Repaso de hoy'), { lead: L('Spaced repetition shows each word right before you would forget it.', 'La repetición espaciada te muestra cada palabra justo antes de que la olvides.') })}
      <div class="grid kpis">
        <div class="panel kpi">${icon('check')}<b>0</b><span>${L('due now', 'pendientes')}</span></div>
        <div class="panel kpi">${icon('calendar')}<b>${tom}</b><span>${L('due tomorrow', 'para mañana')}</span></div>
        <div class="panel kpi">${icon('vocab')}<b>${learned}</b><span>${L('words learned', 'palabras aprendidas')}</span></div>
        <div class="panel kpi">${icon('star')}<b>${mastered}</b><span>${L('mastered', 'dominadas')}</span></div>
      </div>
      ${empty('sparkle', L('All caught up! Nothing to review right now.', '¡Al día! No tienes nada que repasar ahora.'), `<a class="btn primary" href="#/review/new">${L('Learn new words', 'Aprender palabras nuevas')}</a> <a class="btn ghost" href="#/vocabulary">${L('Browse vocabulary', 'Ver vocabulario')}</a>`)}`;
    return;
  }
  flashcards(root, { ids: due.slice(0, 30), title: L('Review', 'Repaso'), back: '#/', total: due.length });
}

// Flashcards: front (word) → reveal (meaning + example) → self-grade, which schedules the next review.
export function flashcards(root, { ids, title, back = '#/', learning = false, total }) {
  const queue = ids.slice();
  let i = 0, shown = false, counts = [0, 0, 0, 0];
  const start = Date.now();
  const onKey = e => {
    if (!root.querySelector('.flash')) return document.removeEventListener('keydown', onKey);
    if (e.target.matches('input, textarea')) return;
    if (!shown && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reveal(); }
    else if (shown && /^[1-4]$/.test(e.key)) rate(+e.key - 1);
  };
  document.addEventListener('keydown', onKey);

  function paint() {
    stopSpeaking();
    if (i >= queue.length) return done();
    const w = WORD[queue[i]];
    root.innerHTML = `<section class="flash" aria-label="${esc(title)}">
      <header class="ses-top"><a class="icon-btn" href="${back}" aria-label="${L('Exit', 'Salir')}">${icon('x')}</a>
        <div class="ses-bar" role="progressbar" aria-valuenow="${Math.round(i / queue.length * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${i / queue.length * 100}%"></i></div>
        <span class="ses-count">${i + 1} / ${queue.length}</span></header>
      ${total && total > queue.length ? `<p class="small muted center">${L(`${total - queue.length} more after this round`, `${total - queue.length} más después de esta ronda`)}</p>` : ''}
      <div class="fc ${shown ? 'flipped' : ''}">
        <div class="fc-face">
          <p class="eyebrow">${esc(CATEGORIES[w.cat][lang() === 'es' ? 1 : 0])} · ${LEVEL[w.level].code}</p>
          <h2 class="fc-word" lang="en">${esc(w.en)}</h2>
          <p class="ipa">/${esc(w.ipa)}/ · ${esc(w.pos)} ${sayBtn(w.en, L('Listen', 'Escuchar'))}</p>
          ${shown ? `<div class="fc-back" aria-live="polite"><p class="fc-es">${esc(w.es)}</p>${w.ex ? `<p class="wc-ex" lang="en">“${esc(w.ex)}” ${sayBtn(w.ex, L('Listen to the example', 'Escuchar el ejemplo'))}</p>` : ''}</div>`
            : `<p class="fc-q">${learning ? L('New word — say it out loud, then reveal.', 'Palabra nueva: dila en voz alta y luego descúbrela.') : L('What does this mean?', '¿Qué significa?')}</p>`}
        </div>
      </div>
      <footer class="fc-foot">${shown
        ? `<p class="small muted center">${L('How well did you know it?', '¿Qué tal la sabías?')}</p><div class="grades">${GRADES.map(g => `<button type="button" class="grade ${g.cls}" data-g="${g.g}"><span aria-hidden="true">${g.emo}</span><b>${L(g.en, g.es)}</b><small>${intervalLabel(w.id, g.g, lang())}</small><kbd aria-hidden="true">${g.g + 1}</kbd></button>`).join('')}</div>`
        : `<button type="button" class="btn primary lg" id="reveal">${icon('eye')} ${L('Show answer', 'Mostrar respuesta')} <kbd aria-hidden="true">␣</kbd></button>`}</footer>
    </section>`;
    root.querySelector('#reveal')?.addEventListener('click', reveal);
    root.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => rate(+b.dataset.g)));
    (root.querySelector('#reveal') || root.querySelector('[data-g="2"]'))?.focus({ preventScroll: true });
    if (!shown && canSpeak && learning) speak(w.en);
  }
  function reveal() { shown = true; paint(); }
  function rate(g) {
    const id = queue[i];
    grade(id, g); counts[g]++;
    if (g === 0) queue.push(id);   // "Again" comes back in this same session
    i++; shown = false; paint();
  }
  function done() {
    document.removeEventListener('keydown', onKey);
    const n = counts.reduce((a, b) => a + b, 0);
    addXP(n); markDone('vocabulary');
    const next = dueIds().length;
    root.innerHTML = `<section class="result"><div class="res-burst" aria-hidden="true">${icon('review')}</div>
      <h1 tabindex="-1">${L('Review complete!', '¡Repaso completado!')}</h1>
      <p class="lead">${L(`${n} cards in ${Math.max(1, Math.round((Date.now() - start) / 60000))} min.`, `${n} tarjetas en ${Math.max(1, Math.round((Date.now() - start) / 60000))} min.`)} ${counts[0] ? L('Missed words will come back soon.', 'Las palabras falladas volverán pronto.') : L('Great memory!', '¡Qué memoria!')}</p>
      <ul class="grade-sum">${GRADES.map(g => `<li class="${g.cls}"><span aria-hidden="true">${g.emo}</span> ${L(g.en, g.es)} <b>${counts[g.g]}</b></li>`).join('')}</ul>
      <p class="muted">+${n} XP · ${L('Tomorrow', 'Mañana')}: ${dueTomorrow()} ${L('cards', 'tarjetas')}</p>
      <div class="res-actions">${next ? `<a class="btn ghost" href="#/review">${L(`Review ${next} more`, `Repasar ${next} más`)}</a>` : ''}<a class="btn primary" href="#/">${L('Continue', 'Continuar')} ${icon('arrow')}</a></div></section>`;
    root.querySelector('h1').focus();
  }
  paint();
}

export function deck(root, { cat, level }) {
  const ws = WORDS.filter(w => (cat ? w.cat === cat : true) && (level ? w.level === level : true));
  flashcards(root, { ids: shuffle(ws.map(w => w.id)).slice(0, 20), title: L('Flashcards', 'Tarjetas'), back: cat ? `#/vocabulary/topic/${cat}` : '#/vocabulary' });
}

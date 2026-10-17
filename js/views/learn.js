import { esc, md } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S } from '../core/store.js';
import { unitState, unitRatio, lessonDone, levelRatio, currentUnit, forceOpen, nextLesson, skillProgress } from '../core/path.js';
import { LEVELS, LEVEL, UNIT, unitsOf, TOPICS } from '../data/index.js';
import { h1, bar, skillMeters } from './ui.js';
import { canAccess } from '../core/premium.js';

const STATE = {
  done: ['check', 'Completed', 'Completada'], current: ['arrow', 'Current', 'Actual'],
  open: ['learn', 'Available', 'Disponible'], locked: ['lock', 'Locked', 'Bloqueada'],
};

export function learn(root, { level }) {
  const lv = LEVEL[level] || LEVEL[S.level];
  const units = unitsOf(lv.id);
  const cur = currentUnit();
  root.innerHTML = `${h1(L('Your learning path', 'Tu ruta de aprendizaje'), { lead: L('From A1 to C1, one unit at a time. You can always go back to earlier units.', 'De A1 a C1, unidad a unidad. Siempre puedes volver a las anteriores.') })}
  <nav class="level-tabs" aria-label="${L('Levels', 'Niveles')}">${LEVELS.map(l => l.soon
    ? `<span class="lt soon" aria-disabled="true" title="${L('Coming soon', 'Próximamente')}"><b>${l.code}</b><small>${L('Soon', 'Pronto')}</small></span>`
    : `<a class="lt${l.id === lv.id ? ' on' : ''}" href="#/learn/${l.id}" ${l.id === lv.id ? 'aria-current="page"' : ''}><b>${l.code}</b><small>${Math.round(levelRatio(l.id) * 100)}%</small></a>`).join('')}</nav>

  <section class="level-intro">
    <div class="li-main">
      <p class="eyebrow">${lv.code} · ${esc(L(lv.name, lv.es))}${lv.id === S.level ? ` · ${L('your level', 'tu nivel')}` : ''}</p>
      <p class="li-focus">${esc(lv.focus)}</p>
      <h2 class="kicker">${L('What you will be able to do', 'Al terminar podrás')}</h2>
      <ul class="can">${lv.goals.map(g => `<li>${icon('check')} ${esc(g)}</li>`).join('')}</ul>
    </div>
    <figure class="li-trap">
      <figcaption>${L(`The ${lv.code} trap`, `La trampa del ${lv.code}`)}</figcaption>
      <p lang="en"><s>${esc(lv.trap.wrong)}</s></p>
      <p lang="en"><b>${esc(lv.trap.right)}</b></p>
      <p class="small">${md(lv.trap.why)}</p>
    </figure>
    <div class="li-side">${bar(levelRatio(lv.id), L('Level progress', 'Progreso del nivel'))}<p class="small muted">${Math.round(levelRatio(lv.id) * 100)}% ${L('of lessons completed', 'de las lecciones completadas')} · ${units.length} ${L('units', 'unidades')}</p>
    <a class="link" href="#/grammar/level/${lv.id}">${icon('grammar')} ${L('Grammar of this level', 'Gramática de este nivel')}</a>
    <a class="link" href="#/vocabulary/level/${lv.id}">${icon('vocab')} ${L('Vocabulary of this level', 'Vocabulario de este nivel')}</a></div>
  </section>
  ${canAccess(lv.id) ? '' : `<section class="panel prem-banner">${icon('lock')}<p class="grow"><b>${L(`${lv.code} is part of the full course`, `${lv.code} es parte del curso completo`)}</b><span class="small muted">${L('A1 is free. Unlock A2 to C1 with a one-time payment of whatever you choose.', 'El A1 es gratis. Desbloquea de A2 a C1 con un pago voluntario: tú eliges cuánto aportar.')}</span></p><a class="btn primary" href="#/premium">${L('See the full course', 'Ver el curso completo')}</a></section>`}

  <ol class="path" aria-label="${L('Units', 'Unidades')} ${lv.code}">
    ${units.map(u => {
      const st = unitState(u); const [ic, en, es] = STATE[st];
      const r = unitRatio(u);
      return `<li class="unit-node ${st}">
        <span class="node-dot" aria-hidden="true">${icon(ic)}</span>
        <a class="unit-card" href="#/unit/${u.id}">
          <span class="u-num" aria-hidden="true">${String(u.n).padStart(2, '0')}</span>
          <span class="u-txt"><small class="st">${L(en, es)}</small>
            <b lang="en">${esc(u.title)}</b>${u.es ? `<span class="muted small">${esc(u.es)}</span>` : ''}
            ${st !== 'locked' ? bar(r, `${Math.round(r * 100)}%`) : ''}</span>
          ${st === 'current' ? `<span class="btn primary sm">${L('Continue', 'Continuar')}</span>` : icon('chevron')}
        </a></li>`;
    }).join('')}
  </ol>
  ${lv.id !== 'c1' ? '' : `<p class="panel muted">${L('C2 — Proficiency is coming soon. When you finish C1, keep practising with Exam mode and Reading.', 'C2 — Maestría llegará pronto. Cuando termines C1, sigue practicando con el Modo examen y la Lectura.')}</p>`}`;
  root.querySelector(`.unit-node.current`)?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
  if (cur.level !== lv.id) window.scrollTo(0, 0);
}

export function unit(root, { id }) {
  const u = UNIT[id]; if (!u) { location.hash = '#/learn'; return; }
  const st = unitState(u);
  const next = nextLesson(u);
  const kindIcon = { vocab: 'vocab', grammar: 'grammar', skills: 'listen' };
  const act = (k, ic, en, es, href, what) => {
    const v = S.items[`${k}:${u.id}`] || 0;
    return `<li><a class="row-link${v ? ' done' : ''}" href="${href}">${icon(ic)}<span class="rl-txt"><b>${L(en, es)}</b><small>${what}</small></span><span class="rl-end">${v ? `${icon('check')} ${Math.round(v * 100)}%` : L('Not started', 'Sin empezar')}</span></a></li>`;
  };
  root.innerHTML = `${h1(u.title, { eyebrow: `${LEVEL[u.level].code} · ${L('Unit', 'Unidad')} ${u.n}${u.es ? ' · ' + esc(u.es) : ''}`, back: `#/learn/${u.level}` })}
  ${st === 'locked' ? `<div class="panel notice">${icon('lock')}<div><b>${L('This unit is ahead of your path.', 'Esta unidad va por delante de tu ruta.')}</b><p class="muted">${L('We recommend finishing the previous units first, but you can open it if you already know the content.', 'Te recomendamos terminar antes las unidades anteriores, pero puedes abrirla si ya dominas el contenido.')}</p>
    <button type="button" class="btn ghost" id="force">${L('Open anyway', 'Abrir de todos modos')}</button></div></div>` : ''}
  <div class="unit-grid">
    <div class="unit-main">
      <section class="unit-goals"><h2 class="kicker">${L('By the end of this unit you can', 'Al terminar esta unidad podrás')}</h2>
        <ul class="can">${u.can.map(c => `<li>${icon('check')} ${esc(c)}</li>`).join('')}</ul></section>
      <section class="sect"><h2>${L('Lessons', 'Lecciones')}</h2>
      <ol class="lessons">${u.lessons.map((l, i) => {
        const d = lessonDone(l.id); const isNext = next && next.id === l.id;
        return `<li><a class="lesson-row${d ? ' done' : ''}${isNext ? ' next' : ''}" href="${st === 'locked' ? '#' : `#/lesson/${l.id}`}" ${st === 'locked' ? 'aria-disabled="true" data-locked' : ''}>
          <span class="lr-n" aria-hidden="true">${d ? icon('check') : i + 1}</span>
          <span class="lr-txt"><b>${esc(L(l.title, l.es))}</b><small>~${l.min} min${d ? ` · ${L('best', 'mejor')} ${Math.round(S.lessons[l.id].best * 100)}%` : ''}</small></span>
          ${isNext ? `<span class="btn primary sm">${lessonDone(u.lessons[0].id) ? L('Continue', 'Continuar') : L('Start', 'Empezar')}</span>` : d ? `<span class="small muted">${L('Repeat', 'Repetir')}</span>` : ''}</a></li>`;
      }).join('')}</ol></section>
    </div>
    <aside class="panel unit-side">
      <h2>${L('Practise the skills', 'Practica las destrezas')}</h2>
      <ul class="rows">
        ${act('listening', 'listen', 'Listening', 'Listening', `#/listening/${u.id}`, L('Questions about a recording', 'Preguntas sobre una grabación'))}
        ${act('reading', 'read', 'Reading', 'Lectura', `#/reading/${u.id}`, esc(u.reading.title))}
        ${act('writing', 'write', 'Writing', 'Escritura', `#/writing/${u.id}`, esc(L(u.writing.p, u.writing.es || u.writing.p)))}
        ${act('speaking', 'speak', 'Speaking', 'Speaking', `#/speaking/${u.id}`, esc(L(u.speaking.p, u.speaking.es || u.speaking.p)))}
      </ul>
      <h2>${L('Grammar in this unit', 'Gramática de la unidad')}</h2>
      <ul class="links">${u.grammar.map(g => `<li><a href="#/grammar/${g}">${icon('grammar')} ${esc(TOPICS[g].title)}</a></li>`).join('')}</ul>
      <h2>${L('Words', 'Palabras')} <span class="muted">(${u.words.length})</span></h2>
      <p class="word-chips">${u.words.map(w => `<a href="#/vocabulary/word/${encodeURIComponent(w.id)}" lang="en">${esc(w.en)}</a>`).join('')}</p>
    </aside>
  </div>`;
  root.querySelector('#force')?.addEventListener('click', () => { forceOpen(u.id); unit(root, { id }); });
  root.querySelectorAll('[data-locked]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); root.querySelector('#force')?.focus(); }));
}

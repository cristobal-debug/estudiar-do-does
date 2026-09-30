import { esc } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S } from '../core/store.js';
import { unitState, unitRatio, lessonDone, levelRatio, currentUnit, forceOpen, nextLesson, skillProgress } from '../core/path.js';
import { LEVELS, LEVEL, UNIT, unitsOf, TOPICS } from '../data/index.js';
import { h1, bar, skillMeters } from './ui.js';

const STATE = {
  done: ['check', 'Completed', 'Completada'], current: ['arrow', 'Current', 'Actual'],
  open: ['learn', 'Available', 'Disponible'], locked: ['lock', 'Locked', 'Bloqueada'],
};

export function learn(root, { level }) {
  const lv = LEVEL[level] || LEVEL[S.level];
  const units = unitsOf(lv.id);
  const cur = currentUnit();
  root.innerHTML = `${h1(L('Your learning path', 'Tu ruta de aprendizaje'), { lead: L('From A1 to C1, one unit at a time. You can always go back to earlier units.', 'De A1 a C1, unidad a unidad. Siempre puedes volver a unidades anteriores.') })}
  <nav class="level-tabs" aria-label="${L('Levels', 'Niveles')}">${LEVELS.map(l => l.soon
    ? `<span class="lt soon" aria-disabled="true" title="${L('Coming soon', 'Próximamente')}"><b>${l.code}</b><small>${L('Soon', 'Pronto')}</small></span>`
    : `<a class="lt${l.id === lv.id ? ' on' : ''}" href="#/learn/${l.id}" ${l.id === lv.id ? 'aria-current="page"' : ''}><b>${l.code}</b><small>${Math.round(levelRatio(l.id) * 100)}%</small></a>`).join('')}</nav>

  <section class="panel level-intro">
    <div><p class="eyebrow">${lv.code} · ${esc(L(lv.name, lv.es))}${lv.id === S.level ? ` · ${L('your level', 'tu nivel')}` : ''}</p>
    <h2>${L('What you will be able to do', 'Lo que serás capaz de hacer')}</h2>
    <ul class="can">${lv.goals.map(g => `<li>${icon('check')} ${esc(g)}</li>`).join('')}</ul></div>
    <div class="li-side">${bar(levelRatio(lv.id), L('Level progress', 'Progreso del nivel'))}<p class="small muted">${Math.round(levelRatio(lv.id) * 100)}% ${L('of lessons completed', 'de las lecciones completadas')}</p>
    <a class="link" href="#/grammar/level/${lv.id}">${icon('grammar')} ${L('Grammar of this level', 'Gramática de este nivel')}</a>
    <a class="link" href="#/vocabulary/level/${lv.id}">${icon('vocab')} ${L('Vocabulary of this level', 'Vocabulario de este nivel')}</a></div>
  </section>

  <ol class="path" aria-label="${L('Units', 'Unidades')} ${lv.code}">
    ${units.map(u => {
      const st = unitState(u); const [ic, en, es] = STATE[st];
      const r = unitRatio(u);
      return `<li class="unit-node ${st}">
        <span class="node-dot" aria-hidden="true">${icon(ic)}</span>
        <a class="unit-card" href="#/unit/${u.id}">
          <span class="u-emoji" aria-hidden="true">${u.icon}</span>
          <span class="u-txt"><small>${L('Unit', 'Unidad')} ${u.n} · <span class="st">${L(en, es)}</span></small>
            <b>${esc(u.title)}</b>${u.es ? `<span class="muted small">${esc(u.es)}</span>` : ''}
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
  const act = (k, ic, en, es, href) => {
    const done = (S.items[`${k}:${u.id}`] || 0) > 0;
    return `<a class="link-card act${done ? ' done' : ''}" href="${href}">${icon(ic)}<b>${L(en, es)}</b><span>${done ? `${icon('check')} ${Math.round(S.items[`${k}:${u.id}`] * 100)}%` : L('Not started', 'Sin empezar')}</span></a>`;
  };
  root.innerHTML = `${h1(u.title, { eyebrow: `${LEVEL[u.level].code} · ${L('Unit', 'Unidad')} ${u.n}${u.es ? ' · ' + esc(u.es) : ''}`, back: `#/learn/${u.level}` })}
  ${st === 'locked' ? `<div class="panel notice">${icon('lock')}<div><b>${L('This unit is ahead of your path.', 'Esta unidad va por delante de tu ruta.')}</b><p class="muted">${L('We recommend finishing the previous units first, but you can open it if you already know the content.', 'Te recomendamos terminar antes las unidades anteriores, pero puedes abrirla si ya dominas el contenido.')}</p>
    <button type="button" class="btn ghost" id="force">${L('Open anyway', 'Abrir de todos modos')}</button></div></div>` : ''}
  <div class="unit-grid">
    <section class="panel">
      <h2>${L('Goals', 'Objetivos')}</h2><ul class="can">${u.can.map(c => `<li>${icon('check')} ${esc(c)}</li>`).join('')}</ul>
      <h2>${L('Lessons', 'Lecciones')}</h2>
      <ol class="lessons">${u.lessons.map((l, i) => {
        const d = lessonDone(l.id); const isNext = next && next.id === l.id;
        return `<li><a class="lesson-row${d ? ' done' : ''}${isNext ? ' next' : ''}" href="${st === 'locked' ? '#' : `#/lesson/${l.id}`}" ${st === 'locked' ? 'aria-disabled="true" data-locked' : ''}>
          <span class="lr-ico">${icon(d ? 'check' : kindIcon[l.kind])}</span>
          <span class="lr-txt"><small>${L('Lesson', 'Lección')} ${i + 1} · ~${l.min} min${d ? ` · ${L('best', 'mejor')} ${Math.round(S.lessons[l.id].best * 100)}%` : ''}</small><b>${esc(L(l.title, l.es))}</b></span>
          ${isNext ? `<span class="btn primary sm">${L('Start', 'Empezar')}</span>` : d ? `<span class="small muted">${L('Repeat', 'Repetir')}</span>` : ''}</a></li>`;
      }).join('')}</ol>
    </section>
    <aside>
      <section class="panel"><h2>${L('Skills practice', 'Práctica de destrezas')}</h2>
        <div class="acts">
          ${act('listening', 'listen', 'Listening', 'Listening', `#/listening/${u.id}`)}
          ${act('reading', 'read', 'Reading', 'Lectura', `#/reading/${u.id}`)}
          ${act('writing', 'write', 'Writing', 'Escritura', `#/writing/${u.id}`)}
          ${act('speaking', 'speak', 'Speaking', 'Speaking', `#/speaking/${u.id}`)}
        </div></section>
      <section class="panel"><h2>${L('Grammar in this unit', 'Gramática de la unidad')}</h2>
        <ul class="links">${u.grammar.map(g => `<li><a href="#/grammar/${g}">${icon('grammar')} ${esc(TOPICS[g].title)}</a></li>`).join('')}</ul>
        <h2>${L('Words', 'Palabras')} <span class="muted">(${u.words.length})</span></h2>
        <p class="word-chips">${u.words.map(w => `<a href="#/vocabulary/word/${encodeURIComponent(w.id)}" lang="en">${esc(w.en)}</a>`).join('')}</p>
      </section>
    </aside>
  </div>`;
  root.querySelector('#force')?.addEventListener('click', () => { forceOpen(u.id); unit(root, { id }); });
  root.querySelectorAll('[data-locked]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); root.querySelector('#force')?.focus(); }));
}

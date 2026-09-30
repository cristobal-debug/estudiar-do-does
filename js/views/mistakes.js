import { esc, md } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S } from '../core/store.js';
import { topMistakes } from '../core/path.js';
import { mistakeItems } from '../core/generate.js';
import { MISTAKES, LEVEL, TOPICS, LEVEL_IDS } from '../data/index.js';
import { h1, empty } from './ui.js';
import { audioBtn } from '../core/audio.js';

const say = t => audioBtn(t.replace(/\s*\/\s*/g, ' '), { kind: 'sentence' });

export default function mistakes(root) {
  const tags = topMistakes(10);
  const log = S.mistakes.log.filter(m => !m.fixed).slice(0, 30);
  const practicable = mistakeItems(50).length;
  const fixed = S.mistakes.log.filter(m => m.fixed).length;
  const lvIdx = LEVEL_IDS.indexOf(S.level);
  const catalogue = Object.entries(MISTAKES).filter(([, m]) => LEVEL_IDS.indexOf(m.level) <= lvIdx + 1);
  root.innerHTML = `${h1(L('My mistakes', 'Mis errores'), { lead: L('Every mistake you make is collected here and comes back until you get it right.', 'Cada error que cometes se guarda aquí y vuelve hasta que lo aciertes.') })}
  <div class="row"><a class="btn primary${practicable ? '' : ' disabled'}" href="#/practice/mistakes" ${practicable ? '' : 'aria-disabled="true"'}>${icon('refresh')} ${L(`Practise my mistakes (${practicable})`, `Practicar mis errores (${practicable})`)}</a><span class="muted small">${fixed} ${L('fixed so far', 'corregidos hasta ahora')}</span></div>

  ${tags.length ? `<section class="panel"><h2>${L('You often confuse…', 'Sueles confundir…')}</h2><ul class="mk-list">${tags.map(m => `<li>
    <p><span class="tag no">${icon('x')}</span> <s>${esc(m.wrong)}</s></p><p><span class="tag ok">${icon('check')}</span> <strong>${esc(m.right)}</strong> ${say(m.right)}</p>
    <p class="small">${md(m.es)}</p><p class="small muted">${L('Times', 'Veces')}: ${m.open}${m.topic ? ` · <a href="#/grammar/${m.topic}">${esc(TOPICS[m.topic].title)}</a>` : ''}</p></li>`).join('')}</ul></section>` : ''}

  <section class="panel"><h2>${L('Recent mistakes', 'Errores recientes')}</h2>
    ${log.length ? `<ul class="recent">${log.map(m => `<li><span class="chip">${esc(m.skill)}</span><span class="q-small">${md(m.q || '')}</span>
      ${m.given ? `<span class="given">${icon('x')} ${esc(m.given)}</span>` : ''}<span class="ans">${icon('check')} ${md(String(m.right || ''))}</span></li>`).join('')}</ul>`
      : empty('sparkle', L('No mistakes yet. They will appear here as you practise.', 'Aún no hay errores. Irán apareciendo aquí mientras practicas.'))}
  </section>

  <section class="panel"><h2>${L('Common mistakes of Spanish speakers', 'Errores típicos de hispanohablantes')}</h2>
    <p class="muted small">${L('Up to your level. Learn them before you make them!', 'Hasta tu nivel. ¡Apréndelos antes de cometerlos!')}</p>
    <ul class="mk-list cat">${catalogue.map(([id, m]) => `<li id="${id}"><p><span class="level-chip sm"><b>${LEVEL[m.level].code}</b></span> <s>${esc(m.wrong)}</s> → <strong>${esc(m.right)}</strong> ${say(m.right)}</p><p class="small">${md(m.es)}</p></li>`).join('')}</ul>
  </section>`;
  const target = decodeURIComponent(location.hash.split('#')[2] || '');
  if (target) root.querySelector(`#${CSS.escape(target)}`)?.scrollIntoView({ block: 'center' });
}

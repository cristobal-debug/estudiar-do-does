import { esc, md } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S, topicScore, markDone } from '../core/store.js';
import { runSession } from '../core/session.js';
import { topicBody, contrastBlock, examplesBlock, topicItems } from '../core/generate.js';
import { LEVELS, LEVEL, TOPICS, topicsOf, UNITS } from '../data/index.js';
import { h1, bar } from './ui.js';

const state = t => { const b = S.topics[t.id]?.best; return b == null ? ['new', L('Not studied', 'Sin estudiar')] : b >= 0.8 ? ['mastered', `${Math.round(b * 100)}%`] : ['learning', `${Math.round(b * 100)}%`]; };

export function grammar(root, { level }) {
  const shown = level ? LEVELS.filter(l => l.id === level) : LEVELS.filter(l => !l.soon);
  root.innerHTML = `${h1(L('Grammar', 'Gramática'), { lead: L('Clear explanations for Spanish speakers, with the typical mistakes to avoid. Then practise each topic.', 'Explicaciones claras para hispanohablantes, con los errores típicos que debes evitar. Después, practica cada tema.'), back: level ? '#/grammar' : '' })}
  <nav class="level-tabs small" aria-label="${L('Levels', 'Niveles')}">${LEVELS.filter(l => !l.soon).map(l => `<a class="lt${l.id === level ? ' on' : ''}" href="#/grammar/level/${l.id}"><b>${l.code}</b><small>${topicsOf(l.id).length}</small></a>`).join('')}</nav>
  ${shown.map(lv => `<section class="g-level" aria-labelledby="gl-${lv.id}">
    <h2 id="gl-${lv.id}"><span class="level-chip"><b>${lv.code}</b> ${esc(L(lv.name, lv.es))}</span></h2>
    <div class="grid">${topicsOf(lv.id).map(t => { const [cls, lbl] = state(t); return `<a class="link-card gtopic" href="#/grammar/${t.id}"><b>${esc(t.title)}</b><span>${esc(t.sum)}</span><span class="wstat ${cls}">${lbl}</span></a>`; }).join('')}</div>
  </section>`).join('')}`;
}

export function topic(root, { id }) {
  const t = TOPICS[id]; if (!t) { location.hash = '#/grammar'; return; }
  const lv = LEVEL[t.level];
  const units = UNITS.filter(u => u.grammar.includes(id));
  const b = S.topics[id]?.best;
  root.innerHTML = `${h1(t.title, { eyebrow: `${lv.code} · ${esc(t.es)}`, lead: md(t.sum), back: `#/grammar/level/${t.level}` })}
  <div class="topic-layout">
    <article class="panel prose">${topicBody(t)}</article>
    <aside class="topic-side">
      <section class="panel"><h2>${L('Practise', 'Practica')}</h2>
        ${b != null ? `${bar(b)}<p class="small muted">${L('Best score', 'Mejor resultado')}: ${Math.round(b * 100)}%</p>` : `<p class="small muted">${t.ex.length} ${L('exercises available', 'ejercicios disponibles')}</p>`}
        <a class="btn primary" href="#/grammar/${id}/practice">${icon('practice')} ${L('Practise this topic', 'Practicar este tema')}</a>
        ${units.length ? `<p class="small">${L('Studied in', 'Se estudia en')}: ${units.map(u => `<a href="#/unit/${u.id}">${lv.code} · ${esc(u.title)}</a>`).join(', ')}</p>` : ''}
      </section>
    </aside>
  </div>
  ${t.contrast?.length ? `<section class="panel">${contrastBlock(t)}</section>` : ''}
  <section class="panel"><h2>${L('Examples', 'Ejemplos')}</h2>${examplesBlock(t.examples)}</section>
  <div class="center"><a class="btn primary lg" href="#/grammar/${id}/practice">${L('Practise now', 'Practicar ahora')} ${icon('arrow')}</a></div>`;
}

export function practice(root, { id }) {
  const t = TOPICS[id]; if (!t) { location.hash = '#/grammar'; return; }
  runSession(root, {
    title: t.title, items: topicItems(id, 10), exitHref: `#/grammar/${id}`, subtitle: t.title,
    onFinish(s) {
      topicScore(id, s.score); markDone('grammar');
      return { title: s.score >= 0.8 ? L('Well mastered!', '¡Bien dominado!') : L('Practice complete', 'Práctica completada'),
        sub: s.score >= 0.8 ? L('You can move on — this topic will come back in mixed practice.', 'Puedes avanzar: este tema volverá en la práctica mixta.') : L('Read the explanation again and repeat: the second round is always better.', 'Vuelve a leer la explicación y repite: la segunda ronda siempre sale mejor.'),
        nextHref: `#/grammar/${id}`, nextLabel: L('Back to the topic', 'Volver al tema') };
    },
  });
}

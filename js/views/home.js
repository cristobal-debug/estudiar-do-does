// Home page for new learners ("Editorial Learning Studio"). Everything shown here comes from the
// real course: the demo sentence is the Present Simple topic, the trap is a mistake from mistakes.js,
// the route and lesson steps are the actual levels and lesson phases.
import { esc, md } from '../core/util.js';
import { icon } from '../core/icons.js';
import { S, save } from '../core/store.js';
import { audioBtn } from '../core/audio.js';
import { PHASES } from '../core/session.js';
import { LEVELS, TOPICS, MISTAKES, unitsOf } from '../data/index.js';
import { googleBtn } from './account.js';
import { prepare } from '../core/cloud.js';

const T = TOPICS['present-simple'];
const row = type => T.table.rows.find(r => r[0] === type)[2];          // 'She works here.' / 'Does she work here?'
const TRAP = MISTAKES.doesS;                                            // Does she works here? → Does she work here?
const OPTIONS = [TRAP.wrong, TRAP.right, TRAP.right.replace(/^Does/, 'Do')];
// Each wrong option gets the explanation of its own mistake.
const WHY = [TRAP.es, 'La -s de tercera persona pasa al auxiliar: **does**. El verbo principal queda en forma base: **work**.', 'Con she, he o it el auxiliar es **does**, no do. Y el verbo principal va en forma base: **work**.'];

// "She works here." with its parts named: the -s is what moves into "Does".
const base = () => {
  const [subj, verb, ...rest] = row('Afirmativa').split(' ');
  return `<p class="ann-line" lang="en">
    <span class="w" data-tag="sujeto">${esc(subj)}</span>
    <span class="w verb" data-tag="verbo + s">${esc(verb.slice(0, -1))}<span class="s-mark">s</span></span>
    <span class="w">${esc(rest.join(' '))}</span></p>`;
};
const question = () => {
  const [aux, subj, verb, ...rest] = row('Pregunta').split(' ');
  return `<p class="ann-line q-line" lang="en">
    <span class="w aux" data-tag="auxiliar">${esc(aux)}</span>
    <span class="w" data-tag="sujeto">${esc(subj)}</span>
    <span class="w verb base-form" data-tag="verbo base">${esc(verb)}</span>
    <span class="w">${esc(rest.join(' '))}</span></p>`;
};

function demo() {
  return `<div class="demo" id="demo" aria-labelledby="demo-t">
    <div class="demo-bar"><span class="demo-dot"></span><span class="demo-dot"></span><span class="demo-dot"></span>
      <span class="demo-where">Gramática · ${esc(T.title)} · A1</span></div>
    <div class="demo-body">
      <p class="eyebrow" id="demo-t">Mira la frase</p>
      <div class="demo-sent">${base()}${audioBtn(row('Afirmativa'), { kind: 'sentence' })}</div>
      <div class="demo-transform" hidden>
        <p class="tf-note"><span class="tf-arrow" aria-hidden="true">${icon('arrow')}</span> En la pregunta, la <b>-s</b> se va a <b>does</b> y el verbo vuelve a su forma base.</p>
        <div class="demo-sent">${question()}${audioBtn(row('Pregunta'), { kind: 'sentence' })}</div>
      </div>
      <p class="demo-q"><b>¿Cómo se pregunta?</b></p>
      <div class="demo-opts" role="group" aria-label="Elige la pregunta correcta">
        ${OPTIONS.map((o, i) => `<button type="button" class="opt" data-i="${i}" lang="en">${esc(o)}<span class="mark" aria-hidden="true"></span></button>`).join('')}
      </div>
      <div class="demo-fb" aria-live="polite"></div>
    </div>
  </div>`;
}

function wireDemo(root) {
  const box = root.querySelector('#demo');
  const fb = box.querySelector('.demo-fb');
  box.querySelector('.demo-opts').addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (!b || b.disabled) return;
    const ok = OPTIONS[+b.dataset.i] === TRAP.right;
    box.querySelectorAll('.opt').forEach(o => {
      o.disabled = true;
      const right = OPTIONS[+o.dataset.i] === TRAP.right;
      if (right) { o.classList.add('ok'); o.querySelector('.mark').innerHTML = icon('check'); }
      if (o === b && !ok) { o.classList.add('no'); o.querySelector('.mark').innerHTML = icon('x'); }
    });
    box.querySelector('.demo-transform').hidden = false;
    box.classList.add('solved');
    fb.innerHTML = `<p class="fb-line ${ok ? 'ok' : 'no'}">${icon(ok ? 'check' : 'x')} <b>${ok ? 'Correcto.' : 'No es esta.'}</b> ${md(WHY[+b.dataset.i])}</p>
      ${ok ? '' : '<button type="button" class="btn ghost sm" data-retry>Probar otra vez</button>'}`;
  });
  fb.addEventListener('click', e => {
    if (!e.target.closest('[data-retry]')) return;
    box.querySelectorAll('.opt').forEach(o => { o.disabled = false; o.classList.remove('ok', 'no'); o.querySelector('.mark').innerHTML = ''; });
    box.querySelector('.demo-transform').hidden = true;
    box.classList.remove('solved');
    fb.innerHTML = '';
    box.querySelector('.opt').focus();
  });
}

// What actually happens in a lesson, in order (session phases).
const STEPS = [
  ['explain', 'La regla, explicada en español (desde B2, en inglés) y con ejemplos que puedes escuchar.'],
  ['guided', 'Primeros ejercicios con pistas, para fijar la estructura.'],
  ['exercise', 'Práctica sin ayuda: eliges, completas y traduces.'],
  ['challenge', 'Construyes y escribes tus propias frases.'],
  ['test', 'Un mini test final te dice qué dominas y qué repasar.'],
];
const PRACTICE = [
  ['vocab', 'Vocabulary', 'Palabras por temas, con audio y repaso espaciado.'],
  ['grammar', 'Grammar', 'Cada estructura con su regla, ejemplos y errores típicos.'],
  ['listen', 'Listening', 'Audios con transcripción y velocidad lenta.'],
  ['read', 'Reading', 'Textos por nivel con glosario y preguntas.'],
  ['write', 'Writing', 'Tareas guiadas con comprobación de lo que escribes.'],
  ['speak', 'Speaking', 'Repite en voz alta con un modelo. Si tu navegador reconoce la voz, verás qué palabras se entendieron.'],
];

export default function home(root) {
  const levels = LEVELS.filter(l => !l.soon);
  root.innerHTML = `<div class="landing">
  <section class="land-hero">
    <div class="lh-text">
      <p class="eyebrow">Inglés para hispanohablantes · de A1 a C1</p>
      <h1 tabindex="-1">Del «lo entiendo» <span class="nb">al «<em class="serif mark-lime">lo hablo</em>».</span></h1>
      <p class="lead">Aprende inglés paso a paso con explicaciones claras en español, practica cada estructura hasta que te salga sola y comprueba tu progreso en cada lección.</p>
      <div class="lh-ctas">
        <a class="btn primary lg" href="#/placement">${icon('compass')} Descubrir mi nivel</a>
        <button type="button" class="btn ghost lg" data-scroll="ruta">Explorar la ruta de aprendizaje</button>
      </div>
      <p class="lh-alt small">¿Prefieres empezar sin test? <button type="button" class="linkish" data-zero>Empieza desde A1</button></p>
    </div>
    <div class="lh-demo">${demo()}</div>
  </section>

  <section class="land-sec route-sec" id="ruta" aria-labelledby="ruta-t">
    <div class="sec-head"><p class="eyebrow">La ruta</p><h2 id="ruta-t">Cinco niveles, un camino claro.</h2>
      <p class="muted">Sigue los niveles del Marco Común Europeo. El test te sitúa en el tuyo y cada unidad desbloquea la siguiente. El A1 es gratis; de A2 a C1 se desbloquean con un pago voluntario, una sola vez: tú decides cuánto vale.</p></div>
    <ol class="route">${levels.map((l, i) => {
      const us = unitsOf(l.id);
      const lessons = us.reduce((n, u) => n + u.lessons.length, 0);
      return `<li class="stop"><span class="stop-code">${l.code}</span><span class="stop-name">${esc(l.es)}</span>
        <span class="stop-meta">${us.length} unidades · ${lessons} lecciones</span><span class="stop-tag${i === 0 ? '' : ' paid'}">${i === 0 ? 'Gratis' : 'Curso completo'}</span></li>`;
    }).join('')}</ol>
  </section>

  <section class="land-sec lesson-sec" id="leccion" aria-labelledby="lec-t">
    <div class="sec-head"><p class="eyebrow">Una lección</p><h2 id="lec-t">De la regla a la frase que dices tú.</h2></div>
    <ol class="steps">${STEPS.map(([k, d], i) => `<li><span class="step-n">${String(i + 1).padStart(2, '0')}</span><b>${PHASES[k][1]}</b><span>${d}</span></li>`).join('')}</ol>
  </section>

  <section class="land-sec practice-sec" id="practica" aria-labelledby="pr-t">
    <div class="sec-head"><p class="eyebrow">Práctica</p><h2 id="pr-t">Las seis destrezas, en un mismo sitio.</h2>
      <p class="muted">Además, repaso diario de vocabulario y una sección con tus propios errores para corregirlos.</p></div>
    <dl class="skills-list">${PRACTICE.map(([ic, en, es]) => `<div><dt lang="en">${icon(ic)} ${en}</dt><dd>${es}</dd></div>`).join('')}</dl>
  </section>

  <section class="land-band" id="metodo" aria-labelledby="met-t">
    <div class="band-in">
      <div class="band-text"><p class="eyebrow">El método</p><h2 id="met-t">Pensado para quien piensa en español.</h2>
        <p>Los errores de un hispanohablante son previsibles. Por eso cada tema te enseña también lo que <em>no</em> debes decir, y cada fallo queda guardado para repasarlo.</p>
        <ul class="principles"><li><b>Entiende</b> la regla en tu idioma.</li><li><b>Practícala</b> en contexto, con audio.</li><li><b>Repásala</b> justo antes de olvidarla.</li></ul></div>
      <figure class="contrast-fig" aria-label="Ejemplo de corrección">
        <p class="cf-es"><span class="flag-es">ES</span> <span>Tengo 20 años.</span></p>
        <p class="cf-no" lang="en"><span class="cf-tag">No</span> <s>I <span class="hl-coral">have</span> 20 years.</s></p>
        <p class="cf-ok" lang="en"><span class="cf-tag ok">Sí</span> <span>I <span class="hl-lime">am</span> 20 years <span class="hl-lime">old</span>.</span></p>
        <figcaption>${md(MISTAKES.age.es)}</figcaption>
      </figure>
    </div>
  </section>

  <section class="land-sec final-sec" aria-labelledby="fin-t">
    <h2 id="fin-t">Empieza por saber dónde estás.</h2>
    <p class="muted">Cinco minutos de test y tendrás tu punto de partida.</p>
    <div class="lh-ctas center"><a class="btn primary lg" href="#/placement">${icon('compass')} Descubrir mi nivel</a></div>
    <div class="ob-account"><p class="muted small">¿Ya estudias con nosotros?</p>${googleBtn('Entra con Google y continúa')}</div>
  </section>
  </div>`;

  wireDemo(root);
  prepare().catch(() => {});
  root.addEventListener('click', e => {
    if (e.target.closest('[data-zero]')) { S.level = 'a1'; S.placed = null; S.onboarded = true; save(); location.hash = '#/'; }
  });
}

// Section links (in the page and in the header) scroll instead of changing the hash route.
document.addEventListener('click', e => {
  const s = e.target.closest('[data-scroll]'); if (!s) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(s.dataset.scroll)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
});

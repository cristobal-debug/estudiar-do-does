// The original app's modes, preserved: study guide, class tasks with automatic checking,
// verb tables with "cover the answers", and the seven exercise modes.
import { esc } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { runSession } from '../core/session.js';
import { markDone, topicScore } from '../core/store.js';
import { B, F, DM, TH, CL, MY, IRR, RV, TK, LAB, TIPS, chk } from '../data/classic.js';
import { h1 } from './ui.js';

const MODES = {
  guide: ['Guía', 'Estructuras, tercera persona, to be, can, mayúsculas y colores de corrección', 'read'],
  tareas: ['Tareas', '7 tareas de 10 frases con corrección automática', 'write'],
  build: ['Construye la frase', 'Ordena las palabras (Present Simple, to be, can)', 'layers'],
  fill: ['Completa la frase', 'Elige la forma correcta', 'practice'],
  third: ['Tercera persona', 'Escribe la forma con he / she / it', 'grammar'],
  dm: ['Do o make', 'Elige el verbo correcto', 'bulb'],
  may: ['Mayúsculas', 'Idiomas, días, meses, siglas y puntuación', 'flag'],
  clase: ['Tus frases', 'Transforma frases de clase', 'refresh'],
  reg: ['Verbos regulares', 'Tabla con la tercera persona', 'classic'],
  irr: ['Verbos irregulares', 'Tabla de pasado y participio', 'classic'],
};

const GUIDE = `<h2>Present Simple: estructura</h2><div class="tw"><table><thead><tr><th scope="col">Tipo</th><th scope="col">Estructura</th></tr></thead><tbody>
<tr><td>Afirmativa</td><td>Sujeto + verbo (he, she, it: verbo + s)</td></tr><tr><td>Negativa</td><td>Sujeto + do / does + not + verbo base</td></tr>
<tr><td>Pregunta</td><td>Do / Does + sujeto + verbo base</td></tr><tr><td>Wh-</td><td>Palabra + do / does + sujeto + verbo base</td></tr></tbody></table></div>
<h2>Tercera persona (he, she, it)</h2><div class="tw"><table><thead><tr><th scope="col">Regla</th><th scope="col">Ejemplos</th></tr></thead><tbody>
<tr><td>Casi todos: +s</td><td>work → works, kill → kills</td></tr><tr><td>Acaba en -s, -sh, -ch, -x, -z, -o: +es</td><td>kiss → kisses, pass → passes, finish → finishes, watch → watches, fix → fixes, go → goes, do → does</td></tr>
<tr><td>Consonante + y: -ies</td><td>fly → flies, study → studies, cry → cries, try → tries</td></tr><tr><td>Vocal + y: +s</td><td>play → plays, enjoy → enjoys, stay → stays</td></tr><tr><td>Irregular</td><td>have → has</td></tr></tbody></table></div>
<h2>Verbo to be</h2><div class="tw"><table><thead><tr><th scope="col">Sujeto</th><th scope="col">Afirmativa</th><th scope="col">Negativa</th><th scope="col">Pregunta</th></tr></thead><tbody>
<tr><td>I</td><td>I am (I'm)</td><td>I'm not</td><td>Am I?</td></tr><tr><td>he, she, it</td><td>is (he's)</td><td>isn't, 's not</td><td>Is he?</td></tr><tr><td>you, we, they</td><td>are (you're)</td><td>aren't, 're not</td><td>Are you?</td></tr></tbody></table></div>
<p>Wh-: palabra + to be + sujeto. Where are we? How is she?</p>
<h2>Verbo can</h2><p>Sirve para habilidad, capacidad, permiso y favores. Sujeto + can + verbo base, sin -s con he, she, it. Negativa: can't o cannot. Pregunta: Can + sujeto + verbo. Wh-: When can I go?</p>
<h2>Mayúsculas y punto final</h2><div class="tw"><table><thead><tr><th scope="col">Se escribe con mayúscula</th><th scope="col">Ejemplos</th></tr></thead><tbody>
<tr><td>Idiomas</td><td>English, Spanish</td></tr><tr><td>Nacionalidades</td><td>British, American</td></tr><tr><td>Días de la semana</td><td>Monday, Tuesday</td></tr><tr><td>Meses</td><td>January, February</td></tr>
<tr><td>El pronombre I, esté donde esté en la frase</td><td>Yesterday I went home.</td></tr><tr><td>Siglas</td><td>TV, CD, DVD, NASA, NBA, ASAP, OK, LOL</td></tr></tbody></table></div>
<p>Pon un punto al final de cada frase, salvo que termine en signo de interrogación o de exclamación.</p>
<h2>Colores para marcar errores</h2>
<ul class="marks"><li><i style="background:#F28C28"></i>Naranja: ortografía (spelling)</li><li><i style="background:#D93636"></i>Rojo: gramática (grammar)</li>
<li><i style="background:#2F6FDE"></i>Azul: vocabulario (vocabulary)</li><li><i style="background:#2E9B4F"></i>Verde: puntuación, o falta o sobra alguna palabra</li><li><i style="background:#F2C21B"></i>Amarillo: atención a las instrucciones del ejercicio</li></ul>`;

const items = mode => {
  if (mode === 'build' || mode === 'clase') return (mode === 'build' ? B : CL).map(([es, t, a, d]) => ({ t: 'build', q: es, a, x: [d], e: TIPS[t], label: LAB[t], skill: 'grammar' }));
  if (mode === 'fill') return F.map(([q, o, c, e]) => ({ t: 'mc', q, o: [o[c], ...o.filter((_, k) => k !== c)], e, skill: 'grammar' }));
  if (mode === 'may') return MY.map(([q, o, c, e]) => ({ t: 'mc', q, o: [o[c], o[1 - c]], e, skill: 'writing' }));
  if (mode === 'dm') return DM.map(([s, c, es]) => ({ t: 'mc', q: s, o: [['do', 'make'][c], ['do', 'make'][1 - c]], e: `${s.replace('___', ['do', 'make'][c])}: ${es}. Do es para actividades, make para crear algo.`, m: c ? 'makeDo' : undefined, skill: 'grammar' }));
  if (mode === 'third') return TH.slice().sort(() => Math.random() - 0.5).slice(0, 15).map(([v, a, r]) => ({ t: 'type', q: `He / she / it: **${v}** → ___`, a: [a], e: r, label: 'Tercera persona', skill: 'grammar' }));
  return [];
};

export function classicHome(root) {
  root.innerHTML = `${h1('Ejercicios de clase', { eyebrow: 'A1 · Present Simple, to be, can', lead: 'La guía y los ejercicios originales. Los fallos se repiten al final.', back: '#/practice' })}
  <div class="grid">${Object.entries(MODES).map(([k, [t, d, ic]]) => `<a class="link-card" href="#/classic/${k}">${icon(ic)}<b>${t}</b><span>${d}</span></a>`).join('')}</div>`;
}

export function classic(root, { mode }) {
  if (!MODES[mode]) { location.hash = '#/classic'; return; }
  if (mode === 'guide') { root.innerHTML = `${h1('Guía', { back: '#/classic', eyebrow: 'Ejercicios de clase' })}<article class="panel prose">${GUIDE}</article>`; return; }
  if (mode === 'tareas') return tareas(root);
  if (mode === 'irr') return table(root, IRR, ['Infinitivo', 'Past simple', 'Past participle', 'Traducción'], [1, 2], 'Tapa las formas para comprobarte y toca una celda tapada para verla.', 'Verbos irregulares');
  if (mode === 'reg') return table(root, TH.slice(0, RV.length).map(([v, a, r]) => [({ enter: 'enter (a place)', listen: 'listen (to something)' })[v] || v, a, r]), ['Infinitivo', 'He / she / it', 'Regla'], [1], 'Los 50 verbos regulares de clase. Tapa la columna del medio y comprueba la tercera persona.', 'Verbos regulares');
  runSession(root, {
    title: MODES[mode][0], items: items(mode).sort(() => Math.random() - 0.5), exitHref: '#/classic',
    onFinish(s) {
      markDone('grammar');
      if (mode === 'build' || mode === 'fill' || mode === 'third') topicScore('present-simple', s.score);
      if (mode === 'dm') topicScore('do-make', s.score);
      if (mode === 'may') topicScore('capitals', s.score);
      return { title: `${s.correct} de ${s.total} aciertos`, sub: s.missed.length ? 'Repite los fallos para fijarlos.' : 'Sin fallos. Prueba otro ejercicio o repítelo.', nextHref: '#/classic', nextLabel: 'Otros ejercicios' };
    },
  });
}

function table(root, rows, head, cover, note, title) {
  let covered = false;
  const paint = () => {
    root.innerHTML = `${h1(title, { back: '#/classic', eyebrow: 'Ejercicios de clase', lead: note })}
    <div class="row"><button type="button" class="btn primary" id="tg" aria-pressed="${covered}">${icon('eye')} ${covered ? 'Mostrar todo' : 'Tapar las respuestas'}</button></div>
    <div class="panel tw"><table class="tbl verbs"><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr>${r.map((c, k) => k === 0 ? `<th scope="row">${esc(c)}</th>` : covered && cover.includes(k) ? `<td><button type="button" class="cv" aria-label="Mostrar respuesta">···</button><span class="cv-a" hidden>${esc(c)}</span></td>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    root.querySelector('#tg').onclick = () => { covered = !covered; paint(); };
    root.querySelectorAll('.cv').forEach(b => b.onclick = () => { b.nextElementSibling.hidden = false; b.remove(); });
  };
  paint();
}

function tareas(root) {
  let sv = {}; try { sv = JSON.parse(localStorage.getItem('tareas') || '{}'); } catch (_) {}
  root.innerHTML = `${h1('Tareas', { back: '#/classic', eyebrow: 'Ejercicios de clase', lead: 'Escribe 10 frases en cada tarea. Se corrigen al escribir y se guardan en este dispositivo.' })}
  ${TK.map((T, j) => `<section class="panel tarea"><h2>${T.t}</h2><p>${T.n}</p>
    <div class="pista"><b>${icon('bulb')} Pista: estructura</b>${T.h.map(h => `<div>${esc(h)}</div>`).join('')}<div>Ejemplo de clase: <em lang="en">${esc(T.ex)}</em></div></div>
    ${[...Array(10)].map((_, i) => `<div class="ln"><label class="sr" for="t${j}-${i}">Frase ${i + 1}</label><input id="t${j}-${i}" data-j="${j}" data-i="${i}" lang="en" autocomplete="off" spellcheck="false" placeholder="${i + 1}." value="${esc(sv[j + '-' + i] || '')}"><small aria-live="polite"></small></div>`).join('')}
    <p class="sum" aria-live="polite"></p></section>`).join('')}`;
  const upd = j => {
    const T = TK[j]; let g = 0, w = 0;
    const Ls = [...root.querySelectorAll(`input[data-j="${j}"]`)];
    Ls.forEach(x => { const [st, m] = chk(T.k, x.value), sm = x.nextElementSibling; sm.className = st; sm.innerHTML = st === 'ok' ? `${icon('check')} Correcto${m ? ' (' + m + ')' : ''}` : st === 'no' ? `${icon('x')} ${esc(m)}` : ''; if (st === 'ok') { g++; if (m === 'Wh-') w++; } });
    Ls[0].closest('.tarea').querySelector('.sum').textContent = `Frases correctas: ${g} de 10.` + (T.w ? ` Preguntas Wh-: ${w} de ${T.w}.` : '') + ' Comprueba tú que cada sujeto y cada verbo sean distintos.';
  };
  root.oninput = e => { const t = e.target; if (t.dataset.j === undefined) return; upd(+t.dataset.j); try { sv[t.dataset.j + '-' + t.dataset.i] = t.value; localStorage.setItem('tareas', JSON.stringify(sv)); } catch (_) {} markDone('writing'); };
  TK.forEach((_, j) => upd(j));
}

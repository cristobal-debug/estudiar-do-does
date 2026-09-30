// Adaptive placement: blocks of 3 questions. Start at A2; pass (2/3) → go up, fail → stop
// (or drop to A1 if A2 was failed). Most people finish in 6–12 questions.
import { esc, shuffle } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S, save, addXP } from '../core/store.js';
import { stop as stopSpeaking } from '../core/speech.js';
import { canSpeak, listenPanel } from '../core/audio.js';
import { PLACEMENT, PLACEMENT_LEVELS } from '../data/placement.js';
import { LEVEL, unitsOf } from '../data/index.js';
import { h1 } from './ui.js';

const PER_BLOCK = 3;

export function welcome(root) {
  root.innerHTML = `<section class="welcome">
    <div class="brand-big" aria-hidden="true">${icon('learn')}</div>
    <p class="eyebrow">Doable English</p>
    <h1 tabindex="-1">${L('Your English teacher, step by step', 'Tu profesor de inglés, paso a paso')}</h1>
    <p class="lead">${L('A structured path from A1 to C1: learn, practise and review — with feedback designed for Spanish speakers.', 'Una ruta estructurada de A1 a C1: aprende, practica y repasa, con correcciones pensadas para hispanohablantes.')}</p>
    <form class="panel onboard" id="ob">
      <label class="field"><span>${L('What should we call you?', '¿Cómo te llamas?')} <small class="muted">(${L('optional', 'opcional')})</small></span><input name="name" autocomplete="given-name" maxlength="30" value="${esc(S.name)}"></label>
      <fieldset><legend>${L('Daily goal', 'Objetivo diario')}</legend><div class="seg">${[5, 10, 15, 20].map(m => `<label><input type="radio" name="goal" value="${m}" ${S.goal === m ? 'checked' : ''}><span>${m} min</span></label>`).join('')}</div>
        <p class="small muted">${L('Short, daily sessions work better than long, occasional ones.', 'Las sesiones cortas y diarias funcionan mejor que las largas y esporádicas.')}</p></fieldset>
      <div class="ob-choices">
        <button type="submit" class="choice primary" name="go" value="test">${icon('compass')}<b>${L('Find my level', 'Descubrir mi nivel')}</b><span>${L('Adaptive test · 5 minutes', 'Test adaptativo · 5 minutos')}</span></button>
        <button type="submit" class="choice" name="go" value="zero">${icon('flag')}<b>${L('Start from zero', 'Empezar desde cero')}</b><span>A1 · ${L('Beginner', 'Principiante')}</span></button>
      </div>
    </form></section>`;
  const form = root.querySelector('#ob');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    S.name = (fd.get('name') || '').trim(); S.goal = +(fd.get('goal') || 10);
    if (e.submitter?.value === 'zero') { S.level = 'a1'; S.placed = null; S.onboarded = true; save(); location.hash = '#/'; }
    else { save(); location.hash = '#/placement'; }
  });
}

export function placement(root) {
  const asked = []; // { lv, s, ok }
  let lvIdx = 1, block = [], bi = 0, passed = new Set(), failed = new Set();
  const pool = Object.fromEntries(PLACEMENT_LEVELS.map(l => [l, shuffle(PLACEMENT[l].filter(q => canSpeak || !q.say))]));

  const intro = () => {
    root.innerHTML = `${h1(L('Find your English level', 'Descubre tu nivel de inglés'), { back: S.onboarded ? '#/profile' : '#/welcome' })}
    <section class="panel">
      <ul class="can"><li>${icon('check')} ${L('Grammar, vocabulary, reading' + (canSpeak ? ' and listening' : ''), 'Gramática, vocabulario, lectura' + (canSpeak ? ' y comprensión oral' : ''))}</li>
      <li>${icon('check')} ${L('Adaptive: questions get harder when you answer correctly', 'Adaptativo: las preguntas suben de nivel cuando aciertas')}</li>
      <li>${icon('check')} ${L('About 5 minutes · no time limit', 'Unos 5 minutos · sin límite de tiempo')}</li></ul>
      <p class="small muted">${L('If you don\'t know an answer, choose "I don\'t know" — guessing makes the result less accurate.', 'Si no sabes una respuesta, elige «No lo sé»: adivinar hace que el resultado sea menos preciso.')}</p>
      <button type="button" class="btn primary lg" id="start">${L('Start the test', 'Empezar el test')} ${icon('arrow')}</button>
    </section>`;
    root.querySelector('#start').onclick = nextBlock;
  };

  function nextBlock() { block = pool[PLACEMENT_LEVELS[lvIdx]].splice(0, PER_BLOCK); bi = 0; ask(); }

  function ask() {
    stopSpeaking();
    const q = block[bi]; const lv = PLACEMENT_LEVELS[lvIdx];
    const opts = shuffle(q.o.map((t, i) => ({ t, ok: i === 0 })));
    const n = asked.length + 1;
    root.innerHTML = `<section class="session placement">
      <header class="ses-top"><a class="icon-btn" href="#/" aria-label="${L('Exit', 'Salir')}">${icon('x')}</a>
        <div class="ses-bar indeterminate" aria-hidden="true"><i style="width:${Math.min(95, n * 7)}%"></i></div><span class="ses-count">${L('Question', 'Pregunta')} ${n}</span></header>
      <div class="ses-body enter">
        <div class="ins"><span class="chip">${{ grammar: L('Grammar', 'Gramática'), vocabulary: L('Vocabulary', 'Vocabulario'), reading: L('Reading', 'Lectura'), listening: 'Listening' }[q.s]}</span></div>
        ${q.text ? `<blockquote class="passage-q" lang="en">${esc(q.text)}</blockquote>` : ''}
        ${q.say ? listenPanel(q.say, { transcript: false }) : ''}
        <p class="q" lang="en">${esc(q.q)}</p>
        <div class="opts ${opts.some(o => o.t.length > 28) ? 'long' : ''}">${opts.map((o, i) => `<button type="button" class="opt" data-i="${i}"><kbd aria-hidden="true">${i + 1}</kbd><span>${esc(o.t)}</span></button>`).join('')}
          <button type="button" class="opt idk" data-i="-1"><span>${L('I don\'t know', 'No lo sé')}</span></button></div>
      </div></section>`;
    const pick = i => {
      asked.push({ lv, s: q.s, ok: i >= 0 && opts[i].ok });
      bi++;
      if (bi < block.length) return ask();
      const got = asked.slice(-block.length).filter(a => a.ok).length;
      if (got >= 2) {
        passed.add(lv);
        const nx = PLACEMENT_LEVELS[lvIdx + 1];
        if (nx && !failed.has(nx)) { lvIdx++; return nextBlock(); }
      }
      else {
        failed.add(lv);
        if (lvIdx === 1 && !passed.has('a1')) { lvIdx = 0; return nextBlock(); }
      }
      result();
    };
    root.querySelector('.opts').onclick = e => { const b = e.target.closest('.opt'); if (b) pick(+b.dataset.i); };
    root.onkeydown = e => { if (/^[1-4]$/.test(e.key) && +e.key <= opts.length) pick(+e.key - 1); };
    root.querySelector('.opt')?.focus();
  }

  function result() {
    root.onkeydown = null;
    const est = [...PLACEMENT_LEVELS].reverse().find(l => passed.has(l)) || 'a1';
    const starter = !passed.size;
    const bySkill = {};
    asked.forEach(a => { (bySkill[a.s] ||= { c: 0, t: 0 }); bySkill[a.s].t++; if (a.ok) bySkill[a.s].c++; });
    const lv = LEVEL[est];
    const units = unitsOf(est).slice(0, 3);
    root.innerHTML = `<section class="result placement-result">
      <div class="res-burst" aria-hidden="true">${icon('compass')}</div>
      <p class="eyebrow">${L('Estimated level', 'Nivel estimado')}</p>
      <h1 tabindex="-1"><span class="level-big">${lv.code}</span> ${esc(L(lv.name, lv.es))}${starter ? ` <small class="muted">(${L('starter', 'inicial')})</small>` : ''}</h1>
      <p class="lead">${L(`Based on ${asked.length} questions.`, `Basado en ${asked.length} preguntas.`)} ${L('This is an estimate to choose your starting point, not an official certification.', 'Es una estimación para elegir tu punto de partida, no una certificación oficial.')}</p>
      <table class="tbl narrow"><thead><tr><th scope="col">${L('Area', 'Área')}</th><th scope="col">${L('Correct', 'Aciertos')}</th></tr></thead><tbody>${Object.entries(bySkill).map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v.c}/${v.t}</td></tr>`).join('')}</tbody></table>
      <div class="panel left"><h2>${L('Your recommended learning path', 'Tu ruta recomendada')}</h2>
        <p>${L(`Start at ${lv.code}, Unit 1. Earlier units stay open so you can review them anytime.`, `Empieza en ${lv.code}, unidad 1. Las unidades anteriores quedan abiertas para repasarlas cuando quieras.`)}</p>
        <ol class="rec-units">${units.map(u => `<li><span aria-hidden="true">${u.icon}</span> ${esc(u.title)}</li>`).join('')}</ol></div>
      <div class="res-actions"><a class="btn ghost" href="#/placement" id="retry">${icon('refresh')} ${L('Repeat test', 'Repetir test')}</a><button type="button" class="btn primary lg" id="accept">${L('Start my path', 'Empezar mi ruta')} ${icon('arrow')}</button></div>
    </section>`;
    root.querySelector('h1').focus();
    root.querySelector('#retry').onclick = e => { e.preventDefault(); placement(root); };
    root.querySelector('#accept').onclick = () => {
      const firstTime = !S.placed;
      S.level = est; S.placed = { start: est, date: Date.now(), asked: asked.length }; S.onboarded = true; save();
      if (firstTime) addXP(20);
      location.hash = '#/';
    };
  }
  intro();
}

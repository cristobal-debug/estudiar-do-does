// Exercise engine + session runner. A session is a queue of items: content cards (teach first)
// and exercises (mc, type, tr, fix, build, match, listen, dict). Misses are logged to "My mistakes"
// and asked again at the end of the session.
import { esc, md, shuffle, matchAnswer, matchExact, canon, lev, uid } from './util.js';
import { L } from './i18n.js';
import { icon } from './icons.js';
import { speak, canSpeak, stopSpeaking } from './speech.js';
import * as store from './store.js';
import { MISTAKES } from '../data/index.js';

export const PHASES = {
  intro: ['Intro', 'Introducción'], explain: ['Learn', 'Explicación'], examples: ['Examples', 'Ejemplos'],
  guided: ['Guided practice', 'Práctica guiada'], exercise: ['Practice', 'Ejercicio'], challenge: ['Challenge', 'Reto'],
  review: ['Review', 'Repaso'], test: ['Mini test', 'Mini test'],
};
const INSTR = {
  mc: ['Choose the correct option', 'Elige la opción correcta'], type: ['Complete the sentence', 'Completa la frase'],
  tr: ['Translate into English', 'Traduce al inglés'], fix: ['Find and correct the mistake', 'Encuentra y corrige el error'],
  build: ['Build the sentence', 'Construye la frase'], match: ['Match the pairs', 'Une las parejas'],
  listen: ['Listen and answer', 'Escucha y responde'], dict: ['Listen and write what you hear', 'Escucha y escribe lo que oyes'],
};
const PRAISE = [['Correct!', '¡Correcto!'], ['Great!', '¡Muy bien!'], ['Exactly!', '¡Exacto!'], ['Nice work!', '¡Genial!']];

export const sayBtn = (text, label = 'Listen', slow = false) => canSpeak
  ? `<button type="button" class="say-btn${slow ? ' slow' : ''}" data-say="${esc(text)}"${slow ? ' data-rate="0.7"' : ''} aria-label="${esc(label)}${slow ? ' (slow)' : ''}: ${esc(text)}">${icon(slow ? 'slow' : 'volume')}</button>`
  : '';

const blankIn = (q, a) => q.includes('___') ? q.replace(/_{3,}/, `**${a}**`) : a;

// ——— Exercise renderers: each returns nothing, and calls api.submit(result) when answered ———
const R = {
  card(it, el, api) { el.innerHTML = `<div class="card-item">${it.html}</div>`; api.content(); },

  mc(it, el, api, opts = {}) {
    const items = shuffle(it.o.map((t, i) => ({ t, ok: i === 0 })));
    const passage = it.ctx ? `<details class="passage" open><summary>${esc(it.ctx.title || L('Text', 'Texto'))}</summary><p>${md(it.ctx.text)}</p></details>` : '';
    const audio = it.say ? `<div class="listen-row">${bigPlay(it.say)}</div>` : '';
    el.innerHTML = `${head(it)}${passage}${audio}<p class="q">${md(it.q)}</p>
      <div class="opts ${items.some(x => x.t.length > 28) ? 'long' : ''}" role="group" aria-label="${L('Options', 'Opciones')}">
      ${items.map((x, i) => `<button type="button" class="opt" data-i="${i}"><kbd aria-hidden="true">${i + 1}</kbd><span>${esc(x.t)}</span></button>`).join('')}</div>`;
    const pick = i => {
      if (api.locked()) return;
      const btns = [...el.querySelectorAll('.opt')];
      btns.forEach(b => { b.disabled = true; });
      if (api.silent) btns[i].classList.add('sel');
      else {
        btns.forEach((b, k) => { if (items[k].ok) b.classList.add('ok'); });
        if (!items[i].ok) btns[i].classList.add('no');
        btns.forEach((b, k) => { if (items[k].ok || k === i) b.insertAdjacentHTML('beforeend', icon(items[k].ok ? 'check' : 'x', 'mark')); });
      }
      api.submit({ ok: items[i].ok, given: items[i].t, right: it.o[0] });
    };
    el.onclick = e => { const b = e.target.closest('.opt'); if (b) pick(+b.dataset.i); };
    api.keys(k => { const n = +k - 1; if (n >= 0 && n < items.length) pick(n); });
    if (it.say && !it.noAuto && opts.autoplay !== false) setTimeout(() => speak(it.say), 250);
  },

  listen(it, el, api) {
    if (!canSpeak) it = { ...it, ctx: { title: L('Transcript (audio not available in this browser)', 'Transcripción (tu navegador no puede reproducir audio)'), text: it.say }, say: null };
    R.mc(it, el, api);
  },

  type(it, el, api) { textInput(it, el, api, false); },
  tr(it, el, api) { textInput(it, el, api, false); },
  fix(it, el, api) { textInput(it, el, api, true); },

  dict(it, el, api) {
    el.innerHTML = `${head(it)}<div class="listen-row">${bigPlay(it.say)}</div>
      ${canSpeak ? '' : `<p class="note">${L('Audio is not available in this browser. Read and copy:', 'Tu navegador no reproduce audio. Lee y copia:')} <em>${esc(it.say)}</em></p>`}
      <label class="field"><span class="sr">${L('Your answer', 'Tu respuesta')}</span><input class="answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${L('Type what you hear…', 'Escribe lo que oyes…')}"></label>`;
    const inp = el.querySelector('input');
    inp.oninput = () => api.ready(!!inp.value.trim());
    api.onCheck(() => {
      const g = canon(inp.value), a = canon(it.say);
      const d = lev(g, a);
      inp.disabled = true;
      return { ok: d <= Math.max(1, Math.floor(a.length / 25)), typo: d > 0, given: inp.value, right: it.say };
    });
    setTimeout(() => { speak(it.say); inp.focus(); }, 250);
  },

  build(it, el, api) {
    const words = shuffle([...it.a.split(' '), ...(it.x || [])]);
    let sel = [];
    const paint = () => {
      el.innerHTML = `${head(it)}<p class="q">${md(it.q)}</p>
        <div class="slot" aria-label="${L('Your sentence', 'Tu frase')}" aria-live="polite">${sel.length ? sel.map(k => `<button type="button" class="tile" data-s="${k}" ${api.locked() ? 'disabled' : ''}>${esc(words[k])}</button>`).join('') : `<span class="slot-hint">${L('Tap the words in order', 'Toca las palabras en orden')}</span>`}</div>
        <div class="pool">${words.map((w, k) => `<button type="button" class="tile" data-p="${k}" ${sel.includes(k) || api.locked() ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>`;
      api.ready(sel.length > 0);
    };
    el.onclick = e => {
      if (api.locked()) return;
      const p = e.target.closest('[data-p]'), s = e.target.closest('[data-s]');
      if (p && !p.disabled) { sel.push(+p.dataset.p); paint(); el.querySelector(`[data-p]:not([disabled])`)?.focus(); }
      else if (s) { sel = sel.filter(k => k !== +s.dataset.s); paint(); }
    };
    api.onCheck(() => {
      const given = sel.map(k => words[k]).join(' ');
      const ok = canon(given) === canon(it.a);
      paint();
      return { ok, given, right: it.a };
    });
    paint();
  },

  match(it, el, api) {
    const left = shuffle(it.p.map((p, i) => ({ t: p[0], i }))), right = shuffle(it.p.map((p, i) => ({ t: p[1], i })));
    let pickL = null, done = new Set(), errors = 0;
    el.innerHTML = `${head(it)}${it.q ? `<p class="q">${md(it.q)}</p>` : ''}<div class="match">
      <div class="col">${left.map(x => `<button type="button" class="m-item" data-side="l" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div>
      <div class="col">${right.map(x => `<button type="button" class="m-item" data-side="r" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div></div>`;
    el.onclick = e => {
      const b = e.target.closest('.m-item'); if (!b || b.disabled || api.locked()) return;
      const i = +b.dataset.i;
      if (b.dataset.side === 'l') { el.querySelectorAll('[data-side=l]').forEach(x => x.classList.remove('sel')); pickL = i; b.classList.add('sel'); b.setAttribute('aria-pressed', 'true'); return; }
      if (pickL === null) return;
      const l = el.querySelector(`[data-side=l][data-i="${pickL}"]`);
      if (pickL === i) {
        [l, b].forEach(x => { x.classList.remove('sel'); x.classList.add('matched'); x.disabled = true; x.insertAdjacentHTML('beforeend', icon('check', 'mark')); });
        done.add(i); pickL = null;
        if (done.size === it.p.length) api.submit({ ok: errors <= 1, given: `${errors}`, right: '', note: errors ? L(`${errors} wrong attempt${errors > 1 ? 's' : ''}`, `${errors} intento${errors > 1 ? 's' : ''} fallido${errors > 1 ? 's' : ''}`) : '' });
        else el.querySelector('[data-side=l]:not([disabled])')?.focus();
      } else {
        errors++;
        b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400);
      }
    };
  },
};

function head(it) {
  const [en, es] = INSTR[it.t] || ['', ''];
  return `<div class="ins">${it.label ? `<span class="chip">${esc(it.label)}</span>` : ''}<span>${esc(it.ins || L(en, es))}</span></div>`;
}
function bigPlay(text) {
  return canSpeak ? `<button type="button" class="play-big" data-say="${esc(text)}" aria-label="${L('Play audio', 'Reproducir audio')}">${icon('volume')}</button>
    <button type="button" class="play-slow" data-say="${esc(text)}" data-rate="0.7" aria-label="${L('Play slowly', 'Reproducir despacio')}">${icon('slow')}<span>${L('Slow', 'Lento')}</span></button>` : '';
}
function textInput(it, el, api, prefill) {
  const q = it.t === 'fix' ? `<p class="q wrong-sent">${icon('x', 'inline-x')} ${esc(it.q)}</p>` : `<p class="q">${md(it.q)}</p>`;
  el.innerHTML = `${head(it)}${q}${it.hint ? `<p class="hint">${icon('bulb')} ${md(it.hint)}</p>` : ''}
    <label class="field"><span class="sr">${L('Your answer', 'Tu respuesta')}</span><input class="answer" autocomplete="off" autocapitalize="off" spellcheck="false" value="${prefill ? esc(it.q) : ''}" placeholder="${it.t === 'type' ? L('Type the missing word(s)', 'Escribe la(s) palabra(s) que faltan') : L('Type your answer', 'Escribe tu respuesta')}"></label>`;
  const inp = el.querySelector('input');
  inp.oninput = () => api.ready(!!inp.value.trim() && (!prefill || (it.cs ? inp.value.trim() !== it.q : canon(inp.value) !== canon(it.q))));
  api.onCheck(() => {
    const r = it.cs ? matchExact(inp.value, it.a) : matchAnswer(inp.value, it.a);
    inp.disabled = true;
    return { ok: r !== 'no', typo: r === 'typo', given: inp.value, right: it.t === 'type' ? blankIn(it.q, [].concat(it.a)[0]) : [].concat(it.a)[0] };
  });
  setTimeout(() => { inp.focus(); if (prefill) inp.setSelectionRange(inp.value.length, inp.value.length); }, 60);
}

// ——— Session runner ———
export function runSession(root, opts) {
  const queue = opts.items.map(x => ({ ...x }));
  const results = [];
  const started = Date.now();
  let idx = 0, xp = 0, locked = false, checker = null, keyFn = null, confirmExit = false;
  const scored = () => results.filter(r => !r.retry);

  root.innerHTML = `<section class="session${opts.exam ? ' exam' : ''}" aria-label="${esc(opts.title)}">
    <header class="ses-top">
      <button type="button" class="icon-btn" data-act="exit" aria-label="${L('Exit session', 'Salir de la sesión')}">${icon('x')}</button>
      <div class="ses-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="${L('Progress', 'Progreso')}"><i></i></div>
      <span class="ses-count" aria-hidden="true"></span>
    </header>
    <p class="ses-phase" aria-live="polite"></p>
    <div class="ses-body" id="ses-body"></div>
    <footer class="ses-foot"><div class="ses-fb" aria-live="polite"></div><div class="ses-actions"></div></footer>
  </section>`;
  const $ = s => root.querySelector(s);
  const body = $('#ses-body'), foot = $('.ses-actions'), fbBox = $('.ses-fb');

  const onKey = e => {
    if (!root.isConnected || !root.querySelector('.session')) return document.removeEventListener('keydown', onKey);
    if (e.target.matches('textarea')) return;
    if (e.key === 'Enter') { const b = foot.querySelector('.btn.primary:not([disabled])'); if (b) { e.preventDefault(); b.click(); } return; }
    if (!e.target.matches('input') && keyFn && /^[1-9]$/.test(e.key)) keyFn(e.key);
  };
  document.addEventListener('keydown', onKey);

  const api = {
    silent: !!opts.exam,
    locked: () => locked,
    ready: ok => { const b = foot.querySelector('[data-act=check]'); if (b) b.disabled = !ok; },
    onCheck: fn => { checker = fn; },
    keys: fn => { keyFn = fn; },
    submit: res => answer(res),
    content: () => { locked = true; setFoot('continue'); },
  };

  function setFoot(mode) {
    if (mode === 'check') foot.innerHTML = `<button type="button" class="btn primary" data-act="check" disabled>${L('Check', 'Comprobar')}</button>`;
    else if (mode === 'none') foot.innerHTML = '';
    else foot.innerHTML = `<button type="button" class="btn primary" data-act="next">${L('Continue', 'Continuar')} ${icon('arrow')}</button>`;
    if (mode === 'continue') setTimeout(() => foot.querySelector('.btn')?.focus({ preventScroll: true }), 30);
  }

  function paintTop() {
    const it = queue[idx];
    const total = queue.length;
    $('.ses-bar i').style.width = `${(idx / total) * 100}%`;
    $('.ses-bar').setAttribute('aria-valuenow', Math.round((idx / total) * 100));
    $('.ses-count').textContent = `${Math.min(idx + 1, total)} / ${total}`;
    const ph = it?.phase && PHASES[it.phase];
    $('.ses-phase').innerHTML = it?.retry ? `${icon('refresh')} ${L('Let\'s try this one again', 'Repasemos este otra vez')}` : ph ? `<span class="phase-dot"></span>${L(ph[0], ph[1])}` : (opts.subtitle || '');
  }

  function show() {
    stopSpeaking();
    locked = false; checker = null; keyFn = null; confirmExit = false;
    fbBox.innerHTML = ''; fbBox.className = 'ses-fb';
    if (idx >= queue.length) return finish();
    paintTop();
    const it = queue[idx];
    body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter');
    setFoot(it.t === 'card' ? 'continue' : ['mc', 'listen', 'match'].includes(it.t) ? 'none' : 'check');
    (R[it.t] || R.card)(it, body, api);
    if (it.t !== 'card') body.querySelector('.q, .ins')?.setAttribute('tabindex', '-1');
    if (idx > 0) (body.querySelector('input, .opt, .tile, .m-item') || body.querySelector('h2, .q'))?.focus?.({ preventScroll: true });
    root.scrollIntoView?.({ block: 'start' });
  }

  function answer(res) {
    if (locked) return;
    locked = true;
    const it = queue[idx];
    const scoredItem = !it.noScore;
    if (scoredItem) store.answer(it.skill || 'grammar', res.ok);
    results.push({ it, ok: res.ok, given: res.given, retry: !!it.retry });
    if (res.ok) {
      xp += it.retry ? 1 : 2;
      if (opts.fixMode && it.key) store.fixMistake(it.key);
    } else {
      store.logMistake({ key: it.key || uid(it), skill: it.skill || 'grammar', q: it.say && it.t === 'dict' ? it.say : it.q, given: res.given, right: res.right, tag: it.m, e: it.e, topic: it.topic, item: it.ctx ? null : strip(it) });
      if (opts.requeue !== false && !it.retry && !opts.exam) queue.push({ ...it, retry: true });
    }
    if (opts.exam) { setTimeout(next, 180); return; }
    feedback(it, res);
    setFoot('continue');
  }

  function feedback(it, res) {
    const p = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    const mk = it.m && MISTAKES[it.m];
    const showRight = res.right && (!res.ok || res.typo || it.t === 'listen' || it.t === 'dict');
    fbBox.className = `ses-fb show ${res.ok ? 'ok' : 'no'}`;
    fbBox.innerHTML = `<div class="fb-head">${icon(res.ok ? 'check' : 'x')}<strong>${res.ok ? L(p[0], p[1]) : L('Not quite', 'Casi…')}</strong>${res.ok ? `<span class="xp-pop">+${it.retry ? 1 : 2} XP</span>` : ''}</div>
      ${showRight ? `<p>${res.ok ? '' : L('Correct answer: ', 'Respuesta correcta: ')}<strong>${md(res.right)}</strong> ${it.t === 'listen' || it.t === 'dict' ? '' : sayBtn(res.right.replace(/\*\*/g, ''))}</p>` : ''}
      ${res.typo ? `<p class="small">${L('Watch the spelling.', 'Ojo con la ortografía.')}</p>` : ''}
      ${res.note ? `<p class="small">${esc(res.note)}</p>` : ''}
      ${it.e ? `<p class="fb-e">${md(it.e)}</p>` : ''}
      ${!res.ok && mk ? `<p class="fb-tag">${icon('alert')} ${L('Common mistake for Spanish speakers', 'Error típico de hispanohablantes')}: <s>${esc(mk.wrong)}</s> → <strong>${esc(mk.right)}</strong></p>` : ''}`;
    if (it.t === 'listen' && canSpeak) fbBox.insertAdjacentHTML('beforeend', `<p class="small">${L('Transcript', 'Transcripción')}: <em>${esc(it.say)}</em></p>`);
  }

  function next() { idx++; show(); }

  function finish() {
    document.removeEventListener('keydown', onKey);
    stopSpeaking();
    const first = scored();
    const correct = first.filter(r => r.ok).length;
    const summary = {
      correct, total: first.length, score: first.length ? correct / first.length : 1, xp,
      sec: Math.round((Date.now() - started) / 1000), results: first,
      missed: first.filter(r => !r.ok).map(r => r.it),
    };
    if (xp) store.addXP(xp);
    const view = opts.onFinish?.(summary) || {};
    if (view.redirect) { location.hash = view.redirect; return; }
    root.innerHTML = resultScreen(summary, view, opts);
    root.querySelector('[data-act=again]')?.addEventListener('click', () => runSession(root, { ...opts, items: summary.missed.map(x => ({ ...x, retry: false })), title: L('Your mistakes', 'Tus fallos') }));
    root.querySelector('.res-actions .btn.primary')?.focus();
  }

  root.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'check' && checker && !locked) { const res = checker(); answer(res); }
    else if (act === 'next') next();
    else if (act === 'exit') {
      if (!results.length || confirmExit) { stopSpeaking(); document.removeEventListener('keydown', onKey); location.hash = opts.exitHref || '#/'; return; }
      confirmExit = true;
      fbBox.className = 'ses-fb show warn';
      fbBox.innerHTML = `<p><strong>${L('Leave this session?', '¿Salir de la sesión?')}</strong> ${L('Your answers so far are saved, but you won\'t get the completion reward.', 'Tus respuestas quedan guardadas, pero no obtendrás la recompensa final.')}</p>
        <div class="row"><button type="button" class="btn ghost" data-act="stay">${L('Keep going', 'Seguir')}</button><button type="button" class="btn danger" data-act="exit">${L('Leave', 'Salir')}</button></div>`;
    } else if (act === 'stay') { confirmExit = false; fbBox.className = 'ses-fb'; fbBox.innerHTML = ''; show(); }
  };

  show();
}

const strip = it => { const { ctx, retry, ...rest } = it; return rest; };

function resultScreen(s, v, opts) {
  const pctv = Math.round(s.score * 100);
  const mins = Math.max(1, Math.round(s.sec / 60));
  const C = 2 * Math.PI * 42;
  return `<section class="result" aria-labelledby="res-title">
    <div class="res-burst" aria-hidden="true">${icon(v.icon || 'sparkle')}</div>
    <h1 id="res-title">${esc(v.title || L('Session complete!', '¡Sesión completada!'))}</h1>
    ${v.sub ? `<p class="lead">${esc(v.sub)}</p>` : ''}
    <div class="res-stats">
      ${s.total ? `<div class="ring" role="img" aria-label="${pctv}%"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" class="ring-bg"/><circle cx="50" cy="50" r="42" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - s.score)}"/></svg><span>${pctv}%</span></div>` : ''}
      <ul class="res-list">
        ${s.total ? `<li>${icon('check')} <b>${s.correct}/${s.total}</b> ${L('correct', 'aciertos')}</li>` : ''}
        <li>${icon('bolt')} <b>+${s.xp + (v.bonus || 0)}</b> XP</li>
        <li>${icon('clock')} <b>${mins}</b> min</li>
      </ul>
    </div>
    ${v.extra || ''}
    ${s.missed.length ? `<details class="res-missed"><summary>${L('Review your mistakes', 'Revisa tus fallos')} (${s.missed.length})</summary><ul>${s.missed.map(it => `<li><span class="q-small">${md(it.q || it.say || '')}</span><span class="ans">${icon('check')} ${md([].concat(it.a || it.o?.[0] || it.say || '')[0] || '')}</span>${it.e ? `<span class="small">${md(it.e)}</span>` : ''}</li>`).join('')}</ul></details>` : ''}
    <div class="res-actions">
      ${s.missed.length && !opts.noRepeat ? `<button type="button" class="btn ghost" data-act="again">${icon('refresh')} ${L('Practise these again', 'Repetir los fallos')}</button>` : ''}
      <a class="btn primary" href="${v.nextHref || opts.exitHref || '#/'}">${esc(v.nextLabel || L('Continue', 'Continuar'))} ${icon('arrow')}</a>
    </div>
  </section>`;
}

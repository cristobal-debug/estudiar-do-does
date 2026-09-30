// Audio UI: reusable button/players (as HTML strings, like every view) + one delegated controller
// that keeps every button in sync with speechService. Nothing here ever plays on its own:
// audio always starts from a learner's tap or key press.
//
//  audioBtn(text, { variant: 'icon'|'label', kind: 'word'|'example'|'sentence', slow, rate, lang, label })
//  listenPanel(text, { transcript })     🎧 Listening practice: Play · Slow · Repeat · Stop · transcript
//  readAlong(parts, targetId)            Listen · Slow · Pause/Resume · Stop with sentence highlighting
//  audioNote()                           discreet fallback when speech synthesis is missing
import { esc, hashStr } from './util.js';
import { L } from './i18n.js';
import { icon } from './icons.js';
import * as speech from './speech.js';

export const canSpeak = speech.canSpeak;
const keyOf = (text, rate, lang) => 'a' + hashStr(`${lang}|${rate}|${Array.isArray(text) ? text.join('¶') : text}`).toString(36);

const LABELS = {
  word: ['Listen', 'Escuchar'], example: ['Example', 'Ejemplo'], sentence: ['Listen', 'Escuchar'],
  slow: ['Slow', 'Lento'], repeat: ['Repeat', 'Repetir'], pause: ['Pause', 'Pausa'], resume: ['Resume', 'Continuar'], playing: ['Playing…', 'Reproduciendo…'],
};

export function audioBtn(text, { variant = 'icon', kind = 'word', slow = false, rate, lang = 'en', label, cls = '', repeat = false } = {}) {
  if (!canSpeak || !text) return '';
  const r = rate ?? (slow ? speech.SPEEDS.slow : '');
  const k = keyOf(text, r, lang) + (repeat ? 'r' : '');
  const base = label || L(...(repeat ? LABELS.repeat : slow ? LABELS.slow : LABELS[kind] || LABELS.word));
  const what = repeat ? L('Play again from the start', 'Volver a escuchar desde el principio') : kind === 'example' ? L('Listen to the example', 'Escuchar el ejemplo') : slow ? L('Listen slowly', 'Escuchar despacio') : L('Listen to pronunciation', 'Escuchar la pronunciación');
  const aria = `${what}: ${Array.isArray(text) ? text[0] + '…' : text}`;
  // Short words and "Repeat" restart on a tap; sentences pause/resume.
  const mode = repeat || (variant === 'icon' && kind === 'word') ? 'restart' : 'toggle';
  const ic = repeat ? 'refresh' : slow ? 'turtle' : 'volume';
  return `<button type="button" class="audio-btn ${variant} ${slow ? 'is-slow' : ''} ${cls}" data-audio data-key="${k}" data-mode="${mode}"
    data-text="${esc(Array.isArray(text) ? JSON.stringify(text) : text)}"${Array.isArray(text) ? ' data-seq' : ''}${r ? ` data-rate="${r}"` : ''}${lang !== 'en' ? ` data-lang="${esc(lang)}"` : ''}
    aria-label="${esc(aria)}" title="${esc(what)}" data-base="${esc(base)}" data-aria="${esc(aria)}" data-icon="${ic}">
    <span class="ab-ic" aria-hidden="true" data-ic="${ic}">${icon(ic)}</span>${variant === 'label' ? `<span class="ab-lbl">${esc(base)}</span>` : ''}</button>`;
}

export const audioNote = () => canSpeak ? '' : `<p class="audio-note">${icon('info')} ${L('Audio isn\'t available in this browser.', 'El audio no está disponible en este navegador.')}</p>`;

// 🎧 Listening practice. The transcript starts hidden so the learner tries to understand first.
export function listenPanel(text, { transcript = true, title } = {}) {
  if (!canSpeak) return `<div class="listen-panel no-audio">${audioNote()}<p class="lp-transcript" lang="en">${esc(text)}</p></div>`;
  return `<div class="listen-panel">
    <p class="lp-title">${icon('listen')} ${esc(title || L('Listening practice', 'Práctica de listening'))}</p>
    <p class="lp-sub">${L('Listen carefully.', 'Escucha con atención.')}</p>
    <div class="lp-controls">
      ${audioBtn(text, { variant: 'label', kind: 'sentence', label: L('Play', 'Reproducir'), cls: 'play-main' })}
      ${audioBtn(text, { variant: 'label', slow: true })}
      ${audioBtn(text, { variant: 'label', repeat: true })}
      <button type="button" class="audio-ctl" data-audio-stop aria-label="${L('Stop audio', 'Detener el audio')}" hidden>${icon('stop')}<span>${L('Stop', 'Parar')}</span></button>
    </div>
    ${transcript ? `<details class="lp-details"><summary>${L('Show transcript', 'Mostrar transcripción')}</summary><p class="lp-transcript" lang="en">${esc(text)}</p></details>` : ''}
  </div>`;
}

// Read-along: plays sentence by sentence and highlights the one being spoken (sentence-level,
// because word-level timing is not reliable across browsers).
export function readAlong(parts, targetId, { title } = {}) {
  if (!canSpeak) return audioNote();
  const k = keyOf(parts, '', 'en');
  return `<div class="read-along" data-target="${esc(targetId)}">
    ${title ? `<span class="ra-title">${icon('read')} ${esc(title)}</span>` : ''}
    <button type="button" class="audio-btn label" data-audio data-seq data-key="${k}" data-mode="toggle" data-text="${esc(JSON.stringify(parts))}" data-target="${esc(targetId)}" data-base="${L('Listen', 'Escuchar')}" data-icon="volume" data-aria="${L('Listen to the whole text', 'Escuchar todo el texto')}" aria-label="${L('Listen to the whole text', 'Escuchar todo el texto')}"><span class="ab-ic" aria-hidden="true">${icon('volume')}</span><span class="ab-lbl">${L('Listen', 'Escuchar')}</span></button>
    <button type="button" class="audio-btn label is-slow" data-audio data-seq data-key="${keyOf(parts, speech.SPEEDS.slow, 'en')}" data-mode="toggle" data-rate="${speech.SPEEDS.slow}" data-text="${esc(JSON.stringify(parts))}" data-target="${esc(targetId)}" data-base="${L('Slow', 'Lento')}" data-icon="turtle" data-aria="${L('Listen slowly', 'Escuchar despacio')}" aria-label="${L('Listen slowly', 'Escuchar despacio')}"><span class="ab-ic" aria-hidden="true">${icon('turtle')}</span><span class="ab-lbl">${L('Slow', 'Lento')}</span></button>
    <button type="button" class="audio-ctl" data-audio-stop aria-label="${L('Stop audio', 'Detener el audio')}" hidden>${icon('stop')}<span>${L('Stop', 'Parar')}</span></button>
  </div>`;
}
// Wraps sentences so read-along can highlight them.
export const partsHtml = parts => parts.map((p, i) => `<span class="ra-part" data-part="${i}">${p}</span>`).join(' ');

// ——— Controller: one listener for the whole app, one subscription for all buttons ———
let started = false;
export function initAudio() {
  if (started) return; started = true;
  document.addEventListener('click', e => {
    const stopBtn = e.target.closest('[data-audio-stop]');
    if (stopBtn) { speech.stop(); return; }
    const b = e.target.closest('[data-audio]');
    if (!b || b.disabled) return;
    e.preventDefault();
    const text = b.hasAttribute('data-seq') ? JSON.parse(b.dataset.text) : b.dataset.text;
    const o = { rate: b.dataset.rate ? +b.dataset.rate : undefined, lang: b.dataset.lang };
    const target = b.dataset.target;
    if (target) o.onpart = i => highlight(target, i);
    if (target) o.onend = () => highlight(target, -1);
    const st = speech.getState();
    if (b.dataset.mode === 'restart' && st.key === b.dataset.key && st.status !== 'idle') { speech.speak(text, { ...o, key: b.dataset.key }); return; }
    if (st.key !== b.dataset.key) clearHighlights();
    speech.toggle(b.dataset.key, text, o);
  });
  speech.subscribe(sync);
}
const clearHighlights = () => document.querySelectorAll('.ra-part.speaking').forEach(x => x.classList.remove('speaking'));
function highlight(targetId, i) {
  const box = document.getElementById(targetId); if (!box) return;
  box.querySelectorAll('.ra-part.speaking').forEach(x => x.classList.remove('speaking'));
  if (i >= 0) box.querySelector(`.ra-part[data-part="${i}"]`)?.classList.add('speaking');
}
function sync(st) {
  document.querySelectorAll('[data-audio]').forEach(b => {
    const mine = st.key === b.dataset.key;
    const status = mine ? st.status : 'idle';
    b.classList.toggle('is-playing', status === 'playing');
    b.classList.toggle('is-paused', status === 'paused');
    b.setAttribute('aria-pressed', status === 'playing' ? 'true' : 'false');
    const lbl = b.querySelector('.ab-lbl');
    const ic = b.querySelector('.ab-ic');
    const toggle = b.dataset.mode === 'toggle';
    if (lbl) lbl.textContent = !toggle || status === 'idle' ? b.dataset.base : status === 'playing' ? L(...LABELS.pause) : L(...LABELS.resume);
    const want = toggle && status === 'playing' ? 'pause' : toggle && status === 'paused' ? 'play' : b.dataset.icon || 'volume';
    if (ic && ic.dataset.ic !== want) { ic.dataset.ic = want; ic.innerHTML = icon(want); }
    b.setAttribute('aria-label', toggle && status === 'playing' ? L('Pause audio', 'Pausar el audio') : toggle && status === 'paused' ? L('Resume audio', 'Continuar el audio') : b.dataset.aria);
    if (st.failed && st.failed === b.dataset.key) { b.disabled = true; b.title = L('Audio isn\'t available for this text.', 'Audio no disponible para este texto.'); }
  });
  const active = st.status !== 'idle';
  if (!active) clearHighlights();
  document.querySelectorAll('[data-audio-stop]').forEach(s => { s.hidden = !active; });
  document.body.classList.toggle('audio-active', active);
  const speedBtn = document.getElementById('speed-btn');
  if (speedBtn) paintSpeed(speedBtn);
}

// Global speed chip (top bar): 🐢 Slow · ▶ Normal · ⚡ Fast, visible so learners know the current pace.
const SPEED_UI = { slow: ['turtle', 'Slow', 'Lento'], normal: ['play', 'Normal', 'Normal'], fast: ['bolt', 'Fast', 'Rápido'], custom: ['settings', 'Custom', 'Personal'] };
export function paintSpeed(btn) {
  const s = speech.settings().speechSpeed; const [ic, en, es] = SPEED_UI[s] || SPEED_UI.normal;
  btn.innerHTML = `${icon(ic)}<span>${L(en, es)}</span>`;
  btn.setAttribute('aria-label', `${L('Speaking speed', 'Velocidad de lectura')}: ${L(en, es)}. ${L('Tap to change', 'Pulsa para cambiar')}`);
  btn.classList.toggle('slow', s === 'slow');
}
export function cycleSpeed() {
  const order = ['slow', 'normal', 'fast'];
  const cur = speech.settings().speechSpeed;
  speech.setSpeed(order[(order.indexOf(cur) + 1) % order.length] || 'normal');
}

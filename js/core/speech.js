// speechService — the only module that talks to window.speechSynthesis.
// Text-to-speech only: it reads text aloud; it never listens to or grades the learner
// (speech recognition lives in recognition.js).
//
//  speak(text, opts)          play one text (cancels anything playing first)
//  speakSequence(parts, opts) play sentences/lines one by one (long texts, dialogues)
//  toggle(key, text, opts)    play → pause → resume, keyed so buttons know their own state
//  pause() resume() stop()
//  getVoices() englishVoices() availableAccents() selectVoice() setAccent()
//  setRate() setSpeed() setPitch() setVolume() settings()
//  subscribe(fn)              state changes: { status: 'idle'|'playing'|'paused', key, part }

const synth = globalThis.speechSynthesis;
export const canSpeak = !!synth && typeof globalThis.SpeechSynthesisUtterance === 'function';

// State and subscribers come first: voices can be ready synchronously and emit() right away.
let state = { status: 'idle', key: null, part: -1 };
const subs = new Set();
function emit() { subs.forEach(f => { try { f(state); } catch (_) {} }); }

// ——— Settings (one localStorage key) ———
const KEY = 'englishLearningSpeechSettings';
export const SPEEDS = { slow: 0.65, normal: 1, fast: 1.25 };
export const ACCENTS = {
  'en-US': { flag: '🇺🇸', en: 'American English', es: 'Inglés americano' },
  'en-GB': { flag: '🇬🇧', en: 'British English', es: 'Inglés británico' },
};
const DEFAULTS = { preferredAccent: 'en-US', preferredVoice: '', speechSpeed: 'normal', speechRate: 1, speechVolume: 1, speechPitch: 1 };
let cfg = { ...DEFAULTS };
try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) {}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (_) {} };
export const settings = () => ({ ...cfg });

// ——— Voices: getVoices() can be empty at first; wait for voiceschanged (and poll for Safari) ———
let voices = [];
const readyFns = [];
function loadVoices() {
  if (!canSpeak) return;
  const list = synth.getVoices() || [];
  if (!list.length) return;
  voices = list;
  readyFns.splice(0).forEach(f => f());
  emit();
}
if (canSpeak) {
  loadVoices();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
  else synth.onvoiceschanged = loadVoices;
  let tries = 0;
  const poll = setInterval(() => { if (voices.length || ++tries > 20) return clearInterval(poll); loadVoices(); }, 250);
}
export const voicesReady = () => new Promise(res => (voices.length || !canSpeak ? res() : (readyFns.push(res), setTimeout(res, 3000))));
export const getVoices = () => voices.slice();

const norm = l => String(l || '').replace('_', '-').toLowerCase();
export const englishVoices = () => voices.filter(v => norm(v.lang).startsWith('en'));
export const voicesFor = accent => voices.filter(v => norm(v.lang) === norm(accent));
// Only accents this device can actually pronounce.
export const availableAccents = () => Object.keys(ACCENTS).filter(a => voicesFor(a).length);

const QUALITY = [/Samantha|Ava|Allison|Susan|Zoe/i, /Google US English|Google UK English/i, /Microsoft (Aria|Jenny|Guy|Libby|Sonia|Ryan)/i, /Daniel|Kate|Serena|Arthur|Martha/i, /Natural|Enhanced|Premium/i];
function rank(v) {
  const q = QUALITY.findIndex(re => re.test(v.name));
  return (q < 0 ? 10 : q) + (v.localService ? 0 : 0.5);
}
// preferred voice → best voice of the chosen accent → other accent → any English → system default.
export function resolveVoice(lang = cfg.preferredAccent) {
  if (!voices.length) return null;
  if (norm(lang).startsWith('es')) return voices.filter(v => norm(v.lang).startsWith('es')).sort((a, b) => rank(a) - rank(b))[0] || null;
  const pref = voices.find(v => v.voiceURI === cfg.preferredVoice && norm(v.lang) === norm(lang));
  if (pref) return pref;
  const pick = list => list.slice().sort((a, b) => rank(a) - rank(b))[0];
  return pick(voicesFor(lang)) || pick(voicesFor(lang === 'en-GB' ? 'en-US' : 'en-GB')) || pick(englishVoices()) || voices.find(v => v.default) || null;
}

export function selectVoice(voiceURI) { cfg.preferredVoice = voiceURI || ''; persist(); emit(); }
export function setAccent(accent) { if (ACCENTS[accent]) { cfg.preferredAccent = accent; cfg.preferredVoice = ''; persist(); emit(); } }
export function setSpeed(name) { if (SPEEDS[name]) { cfg.speechSpeed = name; cfg.speechRate = SPEEDS[name]; persist(); emit(); } }
// Manual rate, clamped to a range that stays intelligible for learners.
export function setRate(r) { cfg.speechRate = Math.min(1.3, Math.max(0.5, +r || 1)); cfg.speechSpeed = Object.keys(SPEEDS).find(k => Math.abs(SPEEDS[k] - cfg.speechRate) < 0.01) || 'custom'; persist(); emit(); }
export function setPitch(p) { cfg.speechPitch = Math.min(1.5, Math.max(0.5, +p || 1)); persist(); }
export function setVolume(v) { cfg.speechVolume = Math.min(1, Math.max(0, +v)); persist(); emit(); }
export const currentRate = () => cfg.speechRate;

// ——— Playback state ———
export const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
export const getState = () => ({ ...state });
function set(next) { state = { ...state, ...next }; emit(); }

let token = 0;       // invalidates callbacks of cancelled playbacks
let current = null;  // keeps the utterance referenced (some browsers drop onend if it is garbage-collected)
let queue = [];      // parts of the active playback
let opts = {};

function makeUtterance(text, o) {
  const u = new SpeechSynthesisUtterance(text);
  const lang = o.lang || cfg.preferredAccent;
  const v = o.noVoice ? null : resolveVoice(lang);
  if (v) u.voice = v;
  u.lang = v ? v.lang : lang;
  u.rate = o.rate ?? cfg.speechRate;
  u.pitch = cfg.speechPitch;
  u.volume = cfg.speechVolume;
  return u;
}
function clean(u) { if (u) u.onend = u.onerror = u.onstart = u.onpause = u.onresume = null; }

function playPart(i, my, retried = false) {
  if (my !== token) return;
  if (i >= queue.length) { finish(my); return; }
  set({ status: 'playing', part: i });
  opts.onpart?.(i);
  const u = makeUtterance(queue[i], { ...opts, noVoice: retried });
  clean(current); current = u;
  u.onend = () => { clean(u); if (my === token) playPart(i + 1, my); };
  u.onerror = e => {
    clean(u);
    if (my !== token || e.error === 'interrupted' || e.error === 'canceled') return;
    // Voice problems: retry once with the browser's default voice for the language.
    if (!retried && ['voice-unavailable', 'language-unavailable', 'synthesis-failed', 'synthesis-unavailable'].includes(e.error)) return playPart(i, my, true);
    opts.onerror?.(e.error);
    finish(my, true);
  };
  synth.speak(u);
}
function finish(my, failed = false) {
  if (my !== token) return;
  const done = opts.onend;
  queue = []; clean(current); current = null;
  set({ status: 'idle', key: null, part: -1, failed: failed ? state.key : null });
  done?.(failed);
}

// Split long texts into sentences: better control, pausing, and no Chrome cut-offs on long utterances.
export const splitSentences = text => String(text).replace(/\s+/g, ' ').trim().match(/[^.!?…]+(?:[.!?…]+["”’)]?|$)/g)?.map(s => s.trim()).filter(Boolean) || [];

export function speakSequence(parts, o = {}) {
  if (!canSpeak || !parts?.length) return false;
  const my = ++token;
  synth.cancel();                       // never two voices at once
  queue = parts.filter(p => String(p).trim()); opts = o;
  set({ status: 'playing', key: o.key ?? null, part: 0, failed: null });
  // Safari needs a tick after cancel() before speaking again.
  setTimeout(() => playPart(0, my), 30);
  return true;
}
export const speak = (text, o = {}) => speakSequence(String(text).length > 220 ? splitSentences(text) : [text], o);

export function stop() {
  if (!canSpeak) return;
  token++; queue = []; clean(current); current = null;
  synth.cancel();
  if (state.status !== 'idle') set({ status: 'idle', key: null, part: -1 });
}
export function pause() {
  if (!canSpeak || state.status !== 'playing') return;
  synth.pause();
  set({ status: 'paused' });
}
export function resume() {
  if (!canSpeak || state.status !== 'paused') return;
  const my = token, part = state.part;
  set({ status: 'playing' });
  synth.resume();
  // Some engines (Chrome with network voices, Android) drop paused speech: restart the sentence.
  setTimeout(() => { if (my === token && state.status === 'playing' && !synth.speaking) playPart(part, my); }, 350);
}
// Button behaviour: idle → play, playing → pause, paused → resume.
export function toggle(key, text, o = {}) {
  if (state.key === key && state.status === 'playing') return pause();
  if (state.key === key && state.status === 'paused') return resume();
  return Array.isArray(text) ? speakSequence(text, { ...o, key }) : speak(text, { ...o, key });
}
export const isSpeaking = () => state.status !== 'idle';
export const stopSpeaking = stop;   // kept for older call sites

addEventListener('pagehide', stop);

// Real browser capabilities only: speechSynthesis (listen), SpeechRecognition (speak, where the
// browser supports it) and MediaRecorder (record yourself). Every feature is detected, never assumed.
import { S } from './store.js';

const synth = globalThis.speechSynthesis;
export const canSpeak = !!synth && typeof SpeechSynthesisUtterance !== 'undefined';
const Rec = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const canRecognize = !!Rec;
export const canRecord = !!(navigator.mediaDevices?.getUserMedia && globalThis.MediaRecorder);

let voices = [];
function loadVoices() { if (canSpeak) voices = synth.getVoices().filter(v => /^en[-_]/i.test(v.lang)); }
if (canSpeak) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }

export const englishVoices = () => voices;
const PREFERRED = [/Samantha/i, /Google US English/i, /Microsoft (Aria|Jenny|Guy)/i, /Daniel/i, /Google UK English Female/i, /Karen/i];
function pickVoice() {
  if (S.voice) { const v = voices.find(x => x.name === S.voice); if (v) return v; }
  for (const re of PREFERRED) { const v = voices.find(x => re.test(x.name)); if (v) return v; }
  return voices.find(v => /en[-_]US/i.test(v.lang) && v.localService) || voices.find(v => /en[-_](US|GB)/i.test(v.lang)) || voices[0];
}

let current = null;
export function speak(text, { rate, onend } = {}) {
  if (!canSpeak || !text) return false;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
  u.rate = rate ?? S.rate ?? 0.95;
  u.onend = () => { current = null; onend?.(); };
  u.onerror = () => { current = null; onend?.(); };
  current = u;
  synth.speak(u);
  return true;
}
export const stopSpeaking = () => { if (canSpeak) synth.cancel(); current = null; };
export const isSpeaking = () => !!current;

// Speech recognition: returns a controller; results arrive through callbacks.
export function recognize({ onresult, onend, onerror, continuous = false } = {}) {
  if (!Rec) return null;
  const r = new Rec();
  r.lang = 'en-US'; r.interimResults = true; r.continuous = continuous; r.maxAlternatives = 1;
  let finalText = '';
  r.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finalText += res[0].transcript + ' '; else interim += res[0].transcript;
    }
    onresult?.((finalText + interim).trim(), false);
  };
  r.onerror = e => onerror?.(e.error);
  r.onend = () => onend?.(finalText.trim());
  try { r.start(); } catch (e) { onerror?.('start'); return null; }
  return { stop: () => { try { r.stop(); } catch (_) {} } };
}

// Record yourself: resolves to an object URL you can play back.
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = e => chunks.push(e.data);
  rec.start();
  return {
    stop: () => new Promise(res => {
      rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); res(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }))); };
      rec.stop();
    }),
  };
}

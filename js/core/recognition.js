// Listening to the learner (separate from text-to-speech on purpose).
// SpeechRecognition only transcribes what the browser understood: it is NOT a pronunciation
// score. A future pronunciation-assessment provider plugs in through ai.js ('pronunciation').
const Rec = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const canRecognize = !!Rec;
export const canRecord = !!(navigator.mediaDevices?.getUserMedia && globalThis.MediaRecorder);

export function recognize({ onresult, onend, onerror, continuous = false, lang = 'en-US' } = {}) {
  if (!Rec) return null;
  const r = new Rec();
  r.lang = lang; r.interimResults = true; r.continuous = continuous; r.maxAlternatives = 1;
  let finalText = '';
  r.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finalText += res[0].transcript + ' '; else interim += res[0].transcript;
    }
    onresult?.((finalText + interim).trim());
  };
  r.onerror = e => onerror?.(e.error);
  r.onend = () => { r.onresult = r.onerror = r.onend = null; onend?.(finalText.trim()); };
  try { r.start(); } catch (_) { onerror?.('start'); return null; }
  return { stop: () => { try { r.stop(); } catch (_) {} } };
}

// Record yourself: resolves to an object URL you can play back and compare with the model.
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

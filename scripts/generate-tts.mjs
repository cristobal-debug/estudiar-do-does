// Pre-generates Ana's voice (OpenAI TTS) for every fixed English text in the app, as static MP3s
// in assets/tts/<hash>.mp3. The app plays these first, so they are paid for only once; texts not
// found here (answers built on the fly, new content) go through /api/tts/.
//
//   node scripts/generate-tts.mjs --dry     count texts and estimate the cost, generate nothing
//   node scripts/generate-tts.mjs           generate what is missing (skips existing files)
//
// Needs OPENAI_API_KEY in .env.local (never committed). Voice settings must match api/tts.js.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ttsHash, ttsNorm, splitSentences } from '../js/core/tts-text.js';
import GA from '../js/data/grammar-a.js';
import GB from '../js/data/grammar-b.js';
import UA from '../js/data/units-a.js';
import UB from '../js/data/units-b.js';
import { VOCAB } from '../js/data/vocab.js';
import { MISTAKES } from '../js/data/mistakes.js';
import { PLACEMENT } from '../js/data/placement.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'tts');
const DRY = process.argv.includes('--dry');
const VOICE = 'coral';
const INSTRUCTIONS = 'You are Ana, a friendly female English teacher. Speak in clear, standard American English for language learners. Natural pace, careful pronunciation.';

// ——— Collect texts exactly as speech.js will send them ———
const texts = new Set();
const add = t => { t = ttsNorm(t); if (t && t.length <= 500) texts.add(t); };
const speak = t => { if (!t) return; t = String(t); (t.length > 220 ? splitSentences(t) : [t]).forEach(add); };   // = speech.speak
const plain = t => String(t).replace(/\*\*/g, '');

speak('Hello! I usually wake up at seven, and I have breakfast at eight.');   // profile "Test voice"
Object.values(VOCAB).flat().forEach(([en, , , ex]) => { speak(en); speak(ex); });
for (const u of [...UA, ...UB]) {
  u.phrases?.forEach(([en]) => speak(plain(en)));
  u.dialogue?.forEach(([, line]) => speak(line));
  if (u.listening) speak(u.listening.say);
  if (u.reading) splitSentences(u.reading.text).forEach(add);   // read-along plays sentence by sentence
  if (u.writing?.model) speak(u.writing.model.replace(/\n/g, ' '));
  u.speaking?.repeat?.forEach(speak);
  if (u.speaking?.model) speak(u.speaking.model);
}
for (const t of [...GA, ...GB]) {
  t.examples?.forEach(([en]) => speak(plain(en)));
  t.contrast?.forEach(c => speak(c.right));
}
Object.values(MISTAKES).forEach(m => speak(m.right.replace(/\s*\/\s*/g, ' ')));
Object.values(PLACEMENT).flat().forEach(q => q?.say && speak(q.say));

const list = [...texts];
const chars = list.reduce((n, t) => n + t.length, 0);
const todo = list.filter(t => !existsSync(join(OUT, ttsHash(t) + '.mp3')));
const todoChars = todo.reduce((n, t) => n + t.length, 0);
// ~15 characters per second of speech; gpt-4o-mini-tts ≈ 0.015 USD per minute of audio.
const usd = c => (c / 15 / 60 * 0.015).toFixed(2);
console.log(`Texts: ${list.length} (${chars} chars) · missing: ${todo.length} (${todoChars} chars) · est. cost ≈ ${usd(todoChars)} USD`);
if (DRY || !todo.length) process.exit(0);

const env = existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '';
const KEY = process.env.OPENAI_API_KEY || env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.error('Missing OPENAI_API_KEY in .env.local'); process.exit(1); }
mkdirSync(OUT, { recursive: true });

async function synth(text, tries = 4) {
  for (let a = 1; ; a++) {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: 'mp3' }),
    });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const msg = `${r.status} ${(await r.text()).slice(0, 200)}`;
    // 429/5xx: wait and retry. Quota/auth errors stop the run (nothing more would succeed).
    if (a >= tries || (r.status !== 429 && r.status < 500) || /insufficient_quota/.test(msg)) throw new Error(msg);
    await new Promise(res => setTimeout(res, 2000 * a));
  }
}

let done = 0, failed = 0;
const queue = todo.slice();
async function worker() {
  while (queue.length) {
    const t = queue.shift();
    try { writeFileSync(join(OUT, ttsHash(t) + '.mp3'), await synth(t)); done++; }
    catch (e) {
      failed++; console.error(`\n✗ "${t.slice(0, 60)}": ${e.message}`);
      if (/insufficient_quota|401|403/.test(e.message)) { queue.length = 0; }
    }
    if ((done + failed) % 25 === 0) process.stdout.write(`\r${done + failed}/${todo.length}`);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`\nGenerated ${done}, failed ${failed}.`);

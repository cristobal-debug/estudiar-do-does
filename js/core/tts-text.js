// Text helpers shared by speech.js and scripts/generate-tts.mjs, so the app looks up exactly
// the MP3 file the generator wrote (assets/voice/<ttsHash(text)>.mp3).
export const ttsNorm = t => String(t || '').replace(/\s+/g, ' ').trim();

// cyrb53: fast 53-bit string hash, as base 36 (collisions are negligible for a few thousand texts).
export function ttsHash(text) {
  const str = ttsNorm(text);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Split long texts into sentences: better control, pausing, and no Chrome cut-offs on long utterances.
export const splitSentences = text => String(text).replace(/\s+/g, ' ').trim().match(/[^.!?…]+(?:[.!?…]+["”’)]?|$)/g)?.map(s => s.trim()).filter(Boolean) || [];

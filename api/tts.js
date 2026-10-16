// GET /api/tts/?v=<voice>&t=<text> → MP3 from OpenAI text-to-speech.
// The key stays on the server (env OPENAI_API_KEY). Responses are immutable and cached by the CDN
// and the service worker, so each sentence is synthesized (and billed) about once.
const ACCENT = {
  us: 'Speak in clear, standard American English, like a friendly teacher reading for language learners. Natural pace, careful pronunciation.',
  gb: 'Speak in clear, standard British English (Received Pronunciation), like a friendly teacher reading for language learners. Natural pace, careful pronunciation.',
};
const VOICES = {
  'us-female': ['coral', 'us'], 'us-male': ['ash', 'us'],
  'gb-female': ['fable', 'gb'], 'gb-male': ['ballad', 'gb'],
};
const MAX = 500;

module.exports = async (req, res) => {
  const v = String(req.query.v || '');
  const text = String(req.query.t || '').replace(/\s+/g, ' ').trim();
  if (!VOICES[v] || !text || text.length > MAX) return res.status(400).send('bad request');
  // Cheap guard against other sites hot-linking the endpoint (the real cost cap is the OpenAI budget).
  const from = req.headers.origin || req.headers.referer || '';
  const host = req.headers.host || '';
  if (from && !from.includes(host) && !/localhost|127\.0\.0\.1/.test(from)) return res.status(403).send('forbidden');
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).send('tts not configured');

  const [voice, accent] = VOICES[v];
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, instructions: ACCENT[accent], response_format: 'mp3' }),
    });
    if (!r.ok) return res.status(502).send('tts error');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch (_) {
    res.status(502).send('tts error');
  }
};

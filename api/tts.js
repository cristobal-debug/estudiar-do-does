// GET /api/tts/?v=<voice>&t=<text> → MP3 from Google Cloud Text-to-Speech.
// The key stays on the server (env GOOGLE_TTS_KEY). Responses are immutable and cached by the CDN
// and the service worker, so each sentence is synthesized (and billed) about once.
const VOICES = {
  'en-US-Neural2-F': 'en-US', 'en-US-Neural2-D': 'en-US',
  'en-GB-Neural2-A': 'en-GB', 'en-GB-Neural2-B': 'en-GB',
};
const MAX = 500;

module.exports = async (req, res) => {
  const v = String(req.query.v || '');
  const text = String(req.query.t || '').replace(/\s+/g, ' ').trim();
  if (!VOICES[v] || !text || text.length > MAX) return res.status(400).send('bad request');
  // Cheap guard against other sites hot-linking the endpoint (the real cost cap is the Google quota).
  const from = req.headers.origin || req.headers.referer || '';
  const host = req.headers.host || '';
  if (from && !from.includes(host) && !/localhost|127\.0\.0\.1/.test(from)) return res.status(403).send('forbidden');
  const key = process.env.GOOGLE_TTS_KEY;
  if (!key) return res.status(503).send('tts not configured');

  try {
    const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text }, voice: { languageCode: VOICES[v], name: v }, audioConfig: { audioEncoding: 'MP3' } }),
    });
    if (!r.ok) return res.status(502).send('tts error');
    const { audioContent } = await r.json();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.status(200).send(Buffer.from(audioContent, 'base64'));
  } catch (_) {
    res.status(502).send('tts error');
  }
};

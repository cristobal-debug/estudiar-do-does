// POST /api/premium/ — pay-what-you-want, one-time purchase of the full course (A2–C1). A1 stays free.
//   { action: 'checkout', idToken, currency, amount } → { url } payment page (CLP → Mercado Pago, USD → Stripe)
//   { action: 'confirm', idToken, provider, ref } → { license } once the provider says the payment went through
//   { action: 'check', idToken, license }        → { ok }    is this license genuine and for this account?
// No database and no webhooks: the payment is always checked against Stripe / Mercado Pago themselves and
// the result is a license signed with LICENSE_SECRET, stored in the learner's synced progress.
// Env: STRIPE_SECRET_KEY, MP_ACCESS_TOKEN, LICENSE_SECRET.
const crypto = require('crypto');

const FIREBASE_KEY = 'AIzaSyAg-qYTPblHf6hyp7Hx2ANeffhz_QydDdk';   // public web key (same as js/core/cloud.js)
const PRODUCT = 'Doable English · Curso completo A1–C1 (aporte voluntario)';
// The learner chooses the amount; same limits as js/core/premium.js.
const LIMITS = { usd: { min: 1, max: 500 }, clp: { min: 1000, max: 500000 } };
const amountOk = (cur, n) => Number.isInteger(n) && n >= LIMITS[cur].min && n <= LIMITS[cur].max;

// The Firebase ID token proves who is paying; Google checks it for us.
async function whoIs(idToken) {
  if (!idToken) return null;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  });
  if (!r.ok) return null;
  const u = (await r.json()).users?.[0];
  return u ? { uid: u.localId, email: u.email || '' } : null;
}

const b64 = s => Buffer.from(s).toString('base64url');
const sign = body => crypto.createHmac('sha256', process.env.LICENSE_SECRET).update(body).digest('base64url');
function makeLicense(uid, provider, ref) {
  const body = b64(JSON.stringify({ uid, p: provider, ref, t: Date.now() }));
  return `${body}.${sign(body)}`;
}
function readLicense(lic) {
  const [body, sig] = String(lic || '').split('.');
  if (!body || !sig) return null;
  const want = sign(body);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
}

const form = obj => {
  const p = new URLSearchParams();
  const add = (k, v) => v == null ? null : typeof v === 'object' ? Object.entries(v).forEach(([kk, vv]) => add(`${k}[${kk}]`, vv)) : p.append(k, String(v));
  Object.entries(obj).forEach(([k, v]) => add(k, v));
  return p;
};
const stripe = (path, body) => fetch(`https://api.stripe.com/v1/${path}`, {
  method: body ? 'POST' : 'GET',
  headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
  body: body ? form(body) : undefined,
}).then(r => r.json());
const mp = (path, body) => fetch(`https://api.mercadopago.com/${path}`, {
  method: body ? 'POST' : 'GET',
  headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
}).then(r => r.json());

async function checkout(user, origin, provider, amount) {
  if (provider === 'mp') {
    const pref = await mp('checkout/preferences', {
      items: [{ title: PRODUCT, quantity: 1, unit_price: amount, currency_id: 'CLP' }],
      external_reference: user.uid,
      payer: user.email ? { email: user.email } : undefined,
      back_urls: { success: `${origin}/?pay=mp`, pending: `${origin}/?pay=mp`, failure: `${origin}/?pay=fail` },
      auto_return: 'approved',
      statement_descriptor: 'DOABLE ENGLISH',
    });
    return pref.init_point;
  }
  const s = await stripe('checkout/sessions', {
    mode: 'payment',
    success_url: `${origin}/?pay=stripe&ref={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#/premium`,
    client_reference_id: user.uid,
    customer_email: user.email || undefined,
    metadata: { uid: user.uid, product: 'doable-full' },
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: amount * 100, product_data: { name: PRODUCT } } }],
  });
  return s.url;
}

async function paid(user, provider, ref) {
  if (!ref) return false;
  if (provider === 'stripe') {
    const s = await stripe(`checkout/sessions/${encodeURIComponent(ref)}`);
    return s.payment_status === 'paid' && s.client_reference_id === user.uid;
  }
  if (provider === 'mp') {
    const p = await mp(`v1/payments/${encodeURIComponent(ref)}`);
    return p.status === 'approved' && p.external_reference === user.uid && Number(p.transaction_amount) >= LIMITS.clp.min;
  }
  return false;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!process.env.LICENSE_SECRET) return res.status(503).json({ error: 'not configured' });
  const { action, idToken, provider, ref, license, currency, amount } = req.body || {};
  try {
    const user = await whoIs(idToken);
    if (!user) return res.status(401).json({ error: 'signin' });

    if (action === 'check') {
      const l = readLicense(license);
      return res.json({ ok: !!l && l.uid === user.uid });
    }
    if (action === 'checkout') {
      const cur = currency === 'clp' ? 'clp' : 'usd';
      const n = Number(amount);
      if (!amountOk(cur, n)) return res.status(400).json({ error: 'amount' });
      const via = cur === 'clp' ? 'mp' : 'stripe';
      const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
      const url = await checkout(user, origin, via, n);
      return url ? res.json({ url, provider: via }) : res.status(502).json({ error: 'provider' });
    }
    if (action === 'confirm') {
      if (!(await paid(user, provider, String(ref || '')))) return res.json({ ok: false });
      return res.json({ ok: true, license: makeLicense(user.uid, provider, String(ref)) });
    }
    res.status(400).json({ error: 'action' });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'provider' });
  }
};

// POST /api/premium/ — pay-what-you-want, one-time purchase of the full course (A2–C1). A1 stays free.
//   { action: 'checkout', idToken, currency, amount } → { url } payment page (CLP → Mercado Pago, USD → Stripe)
//   { action: 'confirm', idToken, provider, ref } → { license } once the provider says the payment went through
//   { action: 'check', idToken, license }        → { ok }    is this license genuine and for this account?
//   { action: 'restore', idToken }               → { license } looks for a paid purchase of this account (closed tab, other device…)
//   { action: 'admin', idToken }                 → { rows }  the course's payments, only for ADMIN_EMAILS
// No database and no webhooks: the payment is always checked against Stripe / Mercado Pago themselves and
// the result is a license signed with LICENSE_SECRET, stored in the learner's synced progress.
// Env: STRIPE_SECRET_KEY, MP_ACCESS_TOKEN, LICENSE_SECRET, optional ADMIN_EMAILS (comma separated).
const crypto = require('crypto');

const FIREBASE_KEY = 'AIzaSyAg-qYTPblHf6hyp7Hx2ANeffhz_QydDdk';   // public web key (same as js/core/cloud.js)
const PRODUCT = 'Doable English · Curso completo A1–C1 (aporte voluntario)';
// The learner chooses the amount; same limits as js/core/premium.js.
const LIMITS = { usd: { min: 1, max: 500 }, clp: { min: 1000, max: 500000 } };
const amountOk = (cur, n) => Number.isInteger(n) && n >= LIMITS[cur].min && n <= LIMITS[cur].max;
const TAG = 'doable-full';   // marks this course's payments: the Stripe / MP accounts are shared with other sites
const ADMINS = (process.env.ADMIN_EMAILS || 'cristobal@jeldrez.com').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// The Firebase ID token proves who is paying; Google checks it for us.
async function whoIs(idToken) {
  if (!idToken) return null;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  });
  if (!r.ok) return null;
  const u = (await r.json()).users?.[0];
  return u ? { uid: u.localId, email: u.email || '', verified: !!u.emailVerified } : null;
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
      metadata: { uid: user.uid, product: TAG },
    });
    return pref.init_point;
  }
  const s = await stripe('checkout/sessions', {
    mode: 'payment',
    success_url: `${origin}/?pay=stripe&ref={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#/premium`,
    client_reference_id: user.uid,
    customer_email: user.email || undefined,
    metadata: { uid: user.uid, product: TAG },
    // Stripe emails the receipt; Mercado Pago always sends its own.
    payment_intent_data: { receipt_email: user.email || undefined, description: PRODUCT, metadata: { uid: user.uid, product: TAG } },
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

// A paid purchase of this account, if any (the learner closed the tab, paid on another device, paid by transfer…).
async function findPurchase(user) {
  if (process.env.STRIPE_SECRET_KEY && user.email) {
    const list = await stripe(`checkout/sessions?limit=100&status=complete&customer_details[email]=${encodeURIComponent(user.email)}`);
    const s = (list.data || []).find(x => x.payment_status === 'paid' && (x.client_reference_id === user.uid || x.metadata?.uid === user.uid));
    if (s) return { provider: 'stripe', ref: s.id };
  }
  if (process.env.MP_ACCESS_TOKEN) {
    const r = await mp(`v1/payments/search?external_reference=${encodeURIComponent(user.uid)}&status=approved&limit=50`);
    const p = (r.results || []).find(x => x.external_reference === user.uid && Number(x.transaction_amount) >= LIMITS.clp.min);
    if (p) return { provider: 'mp', ref: String(p.id) };
  }
  return null;
}

// Every payment of this course, newest first (Stripe and Mercado Pago).
async function payments() {
  const rows = [];
  if (process.env.STRIPE_SECRET_KEY) {
    const list = await stripe('checkout/sessions?limit=100&status=complete');
    for (const s of list.data || []) if (s.metadata?.product === TAG && s.payment_status === 'paid')
      rows.push({ t: s.created * 1000, provider: 'stripe', email: s.customer_details?.email || s.customer_email || '', amount: s.amount_total / 100, currency: 'USD' });
  }
  if (process.env.MP_ACCESS_TOKEN) {
    const r = await mp('v1/payments/search?sort=date_created&criteria=desc&limit=100&status=approved');
    for (const p of r.results || []) if (p.metadata?.product === TAG || String(p.description || '').startsWith('Doable English'))
      rows.push({ t: Date.parse(p.date_approved || p.date_created), provider: 'mp', email: p.payer?.email || '', amount: Number(p.transaction_amount), currency: 'CLP' });
  }
  return rows.sort((a, b) => b.t - a.t);
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
    if (action === 'restore') {
      const found = await findPurchase(user);
      return res.json(found ? { ok: true, license: makeLicense(user.uid, found.provider, found.ref) } : { ok: false });
    }
    if (action === 'admin') {
      if (!user.verified || !ADMINS.includes(user.email.toLowerCase())) return res.status(403).json({ error: 'forbidden' });
      return res.json({ rows: await payments() });
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

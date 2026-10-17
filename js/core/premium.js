// Full course = one-time, pay-what-you-want purchase. A1 is free; A2–C1 need a license tied to the learner's Google account.
//
//  canAccess(level)   may the learner open content of this CEFR level?
//  isPremium()        has this account bought the full course?
//  checkout(cur, n)   go to the payment page for an amount the learner chose (clp → Mercado Pago, usd → Stripe)
//  initPremium()      call once at startup: finishes a payment the learner just came back from
//
// The license is signed by /api/premium/ after it checks the payment with Stripe / Mercado Pago, saved in the
// learner state (so it syncs to every device) and re-checked with the server once per visit.
import { S, save } from './store.js';
import { cloudState, onCloud, idToken } from './cloud.js';

export const FREE = 'a1';
// Voluntary amount: the learner picks or types it. The server enforces the same min / max.
export const AMOUNTS = {
  clp: { min: 1000, max: 500000, picks: [5000, 10000, 15000, 25000], def: 10000 },
  usd: { min: 1, max: 500, picks: [5, 10, 15, 25], def: 10 },
};
// Chile → CLP with Mercado Pago; anywhere else → USD with a card. The learner can switch.
export const guessCurrency = () => { try { return /Santiago|Punta_Arenas|Easter/.test(Intl.DateTimeFormat().resolvedOptions().timeZone) || /-CL$/i.test(navigator.language) ? 'clp' : 'usd'; } catch (_) { return 'usd'; } };
const PENDING = 'doable:pay';
const API = '/api/premium/';

const licenseUid = lic => { try { return JSON.parse(atob(lic.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).uid; } catch (_) { return null; } };
export function isPremium() {
  if (!S.license) return false;
  const st = cloudState();
  const uid = st.user?.uid || (st.status === 'loading' ? S.owner : null);   // no paywall flash while the session loads
  return !!uid && licenseUid(S.license) === uid;
}
export const canAccess = level => !level || level === FREE || isPremium();

async function call(body) {
  const token = await idToken();
  if (!token) throw Object.assign(new Error('signin'), { code: 'signin' });
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, idToken: token }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'error'), { code: data.error || 'error' });
  return data;
}

export async function checkout(currency, amount) {
  const { url } = await call({ action: 'checkout', currency, amount });
  location.href = url;
}

const subs = new Set();
export const onPremium = fn => { subs.add(fn); return () => subs.delete(fn); };
const emit = ev => subs.forEach(f => { try { f(ev); } catch (_) {} });

const readPending = () => { try { return JSON.parse(localStorage.getItem(PENDING) || 'null'); } catch (_) { return null; } };
const writePending = p => { try { p ? localStorage.setItem(PENDING, JSON.stringify(p)) : localStorage.removeItem(PENDING); } catch (_) {} };

let confirming = false;
async function confirmPending() {
  const p = readPending();
  if (!p || confirming || !cloudState().user) return;
  confirming = true;
  try {
    const r = await call({ action: 'confirm', provider: p.provider, ref: p.ref });
    if (r.ok && r.license) { S.license = r.license; save(); writePending(null); emit('unlocked'); }
    else if (Date.now() - p.ts > 7 * 864e5) writePending(null);   // pending payments (cash, transfer) get a week
    else emit('pending');
  } catch (_) { emit('error'); }
  confirming = false;
}

let checked = false;
async function recheck() {
  if (checked || !S.license || !cloudState().user) return;
  checked = true;
  try { const r = await call({ action: 'check', license: S.license }); if (r.ok === false) { delete S.license; save(); } } catch (_) {}
}

export function initPremium() {
  // Back from the payment page: Stripe → ?pay=stripe&ref=<session>; Mercado Pago → ?pay=mp&payment_id=<id>&status=…
  const q = new URLSearchParams(location.search);
  const pay = q.get('pay');
  if (pay) {
    const ref = pay === 'stripe' ? q.get('ref') : q.get('payment_id') || q.get('collection_id');
    if ((pay === 'stripe' || pay === 'mp') && ref && ref !== 'null') writePending({ provider: pay, ref, ts: Date.now() });
    history.replaceState(null, '', `${location.pathname}#/premium${pay === 'fail' ? '/fail' : ''}`);
  }
  onCloud(st => { if (st.user) { confirmPending(); if (st.status === 'synced') recheck(); } });
  if (cloudState().user) confirmPending();
}
export const hasPending = () => !!readPending();

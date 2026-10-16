// Learner accounts: "Sign in with Google" (Firebase Auth) + progress synced to Firestore.
// The app keeps working offline from localStorage; this module mirrors that state to
// users/{uid} so the learner finds the same progress on any device.
//
//  initCloud()          call once at startup (loads Firebase only if the learner signed in before)
//  prepare()            preload Firebase (call when a sign-in button is shown, so the popup opens instantly)
//  signIn() signOut()
//  cloudState()         { status: 'off'|'loading'|'syncing'|'synced'|'error', user, last }
//  onCloud(fn)          subscribe to changes of cloudState()
//
// Firestore is used through its REST API (with the user's ID token) to avoid loading the big SDK.
import { S, onChange, replaceState } from './store.js';
import { debounce } from './util.js';

const CFG = {
  apiKey: 'AIzaSyAg-qYTPblHf6hyp7Hx2ANeffhz_QydDdk',
  authDomain: 'estudiar-ingles-2fbbc.firebaseapp.com',
  projectId: 'estudiar-ingles-2fbbc',
  appId: '1:1004311524875:web:d6aaf75ca3a07f0ee6b90e',
};
const SDK = 'https://www.gstatic.com/firebasejs/12.19.0';
const FLAG = 'doable:cloud';            // remembers that this device has a signed-in learner
const DOC = uid => `https://firestore.googleapis.com/v1/projects/${CFG.projectId}/databases/(default)/documents/users/${uid}`;

let fb = null, auth = null, loading = null;
let state = { status: 'off', user: null, last: 0 };
const subs = new Set();
const set = next => { state = { ...state, ...next }; subs.forEach(f => { try { f(state); } catch (_) {} }); };
export const cloudState = () => state;
export const onCloud = fn => { subs.add(fn); return () => subs.delete(fn); };
const flag = on => { try { on ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG); } catch (_) {} };

export function prepare() {
  return loading ||= (async () => {
    const [app, a] = await Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`)]);
    fb = a;
    auth = a.getAuth(app.initializeApp(CFG));
    auth.languageCode = 'es';
    a.getRedirectResult(auth).catch(() => {});
    a.onAuthStateChanged(auth, user => {
      if (user) { flag(true); set({ user: pick(user) }); sync(); }
      else { flag(false); set({ user: null, status: 'off' }); }
    });
  })().catch(err => { loading = null; set({ status: 'error' }); throw err; });
}
const pick = u => ({ uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' });

export function initCloud() {
  let had = false; try { had = !!localStorage.getItem(FLAG); } catch (_) {}
  if (had) { set({ status: 'loading' }); prepare().catch(() => {}); }
  onChange(() => { if (state.user && !applying) pushSoon(); });
  addEventListener('visibilitychange', () => {
    if (!state.user) return;
    if (document.visibilityState === 'hidden') push();
    else sync();
  });
}

export async function signIn() {
  await prepare();
  const p = new fb.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  try { await fb.signInWithPopup(auth, p); }
  catch (e) {
    // Popups blocked or unsupported (some in-app browsers / installed PWAs): use a full-page redirect.
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) return fb.signInWithRedirect(auth, p);
    if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) return;
    throw e;
  }
}
// Signing out leaves this device clean (the progress is safe in the account), so the next
// person who uses it does not inherit or mix in someone else's progress.
export async function signOut() {
  await push();
  await fb?.signOut(auth);
  lastPushed = '';
  applying = true; replaceState({}); applying = false;
  location.hash = '#/welcome';
}

// ——— Sync ———
async function request(method, body) {
  const token = await auth.currentUser.getIdToken();
  const r = await fetch(DOC(auth.currentUser.uid), {
    method, body: body && JSON.stringify(body),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`firestore ${r.status}`);
  return r.json();
}

let applying = false, pushing = null;
async function push() {
  if (!auth?.currentUser) return;
  const json = JSON.stringify(S);
  if (json === lastPushed) return;
  try {
    set({ status: 'syncing' });
    await (pushing = request('PATCH', { fields: {
      state: { stringValue: json },
      updated: { integerValue: String(S.updated || Date.now()) },
      email: { stringValue: auth.currentUser.email || '' },
    } }));
    lastPushed = json;
    set({ status: 'synced', last: Date.now() });
  } catch (_) { set({ status: 'error' }); }
}
let lastPushed = '';
const pushSoon = debounce(push, 4000);

async function sync() {
  if (!auth?.currentUser) return;
  try {
    set({ status: 'syncing' });
    const uid = auth.currentUser.uid;
    const doc = await request('GET');
    const remoteJson = doc?.fields?.state?.stringValue || '';
    const remote = remoteJson ? JSON.parse(remoteJson) : null;
    // Progress on this device that belongs to another account is never mixed in.
    const mine = !S.owner || S.owner === uid;
    const next = { ...(mine ? (remote ? merge(S, remote) : S) : (remote || {})), owner: uid };
    const json = JSON.stringify(next);
    if (json !== JSON.stringify(S)) {
      applying = true; replaceState(next); applying = false;
      rerender();
    }
    if (json === remoteJson) { lastPushed = json; set({ status: 'synced', last: Date.now() }); return; }
    await push();
  } catch (_) { applying = false; set({ status: 'error' }); }
}

// Re-render the current page with the merged progress, unless the learner is mid-exercise.
function rerender() {
  const path = location.hash.replace(/^#\/?/, '');
  if (S.onboarded && path.startsWith('welcome')) { location.hash = '#/'; return; }
  if (/^(lesson|practice|review|placement|listening|reading|writing|speaking|classic)\b/.test(path) && path.includes('/')) return;
  dispatchEvent(new HashChangeEvent('hashchange'));
}

// ——— Merge two copies of the learner state without losing progress from either device ———
// Counters and scores keep the higher value, lists are combined, and settings come from
// whichever copy was edited last. A reset on one device wins over older data.
const SETTINGS = ['name', 'level', 'placed', 'onboarded', 'goal', 'lang', 'theme', 'drafts'];
export function merge(local, remote) {
  if ((local.resetAt || 0) > (remote.updated || 0)) return local;
  if ((remote.resetAt || 0) > (local.updated || 0)) return remote;
  const remoteNewer = (remote.updated || 0) > (local.updated || 0);
  const out = mergeVal(local, remote, remoteNewer);
  for (const k of SETTINGS) out[k] = (remoteNewer ? remote : local)[k] ?? (remoteNewer ? local : remote)[k];
  out.updated = Math.max(local.updated || 0, remote.updated || 0);
  out.created = Math.min(local.created || Date.now(), remote.created || Date.now());
  if (out.mistakes?.log) out.mistakes.log = out.mistakes.log.sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 300);
  return out;
}
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function mergeVal(a, b, preferB) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
  if (Array.isArray(a) && Array.isArray(b)) {
    const id = v => isObj(v) && v.key != null ? `k:${v.key}:${v.fixed ? 'f' : 'o'}` : JSON.stringify(v);
    const map = new Map(a.map(v => [id(v), v]));
    for (const v of b) map.set(id(v), map.has(id(v)) ? mergeVal(map.get(id(v)), v, preferB) : v);
    return [...map.values()];
  }
  if (isObj(a) && isObj(b)) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = mergeVal(a[k], b[k], preferB);
    return o;
  }
  return preferB ? b : a;
}

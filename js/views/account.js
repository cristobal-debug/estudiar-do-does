// Account UI: "Continue with Google" buttons, the profile's account panel and the dashboard nudge.
// Any element with [data-signin] / [data-signout] works anywhere, through one delegated listener.
import { esc } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S } from '../core/store.js';
import * as cloud from '../core/cloud.js';
import { toast } from './ui.js';

const G = '<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

export const googleBtn = (label = L('Continue with Google', 'Continuar con Google'), cls = '') =>
  `<button type="button" class="btn google-btn ${cls}" data-signin>${G}<span>${esc(label)}</span></button>`;

let wired = false;
export function initAccountUI() {
  if (wired) return; wired = true;
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-signin]')) {
      e.preventDefault();
      try { await cloud.signIn(); }
      catch (err) { console.error(err); toast(L('Could not sign in. Please try again.', 'No se pudo iniciar sesión. Inténtalo de nuevo.'), { icon: 'alert' }); }
    } else if (e.target.closest('[data-signout]')) {
      e.preventDefault();
      await cloud.signOut();
      toast(L('Signed out. Your progress is saved in your account.', 'Sesión cerrada. Tu avance queda guardado en tu cuenta.'), { icon: 'check' });
    }
  });
  // Greet the learner once, right after signing in.
  let prev = cloud.cloudState().user;
  cloud.onCloud(st => {
    if (st.user && !prev) { const who = esc(st.user.name || st.user.email); toast(L(`Signed in as ${who}. Your progress is synced.`, `Has entrado como ${who}. Tu avance se sincroniza.`), { icon: 'check' }); }
    prev = st.user;
  });
}

const ago = ts => {
  const s = Math.round((Date.now() - ts) / 1000);
  return s < 60 ? L('just now', 'ahora mismo') : s < 3600 ? L(`${Math.round(s / 60)} min ago`, `hace ${Math.round(s / 60)} min`) : L('a while ago', 'hace un rato');
};
const statusText = st => ({
  loading: L('Connecting…', 'Conectando…'),
  syncing: L('Syncing…', 'Sincronizando…'),
  synced: `${icon('check')} ${L('Progress saved', 'Avance guardado')} · ${ago(st.last)}`,
  error: `${icon('alert')} ${L('Not synced right now (no connection?). It will retry automatically.', 'Ahora no se pudo sincronizar (¿sin conexión?). Se reintentará solo.')}`,
}[st.status] || '');

// Profile: who is signed in, sync status, sign out — or the invitation to sign in.
export function accountPanel(box) {
  cloud.prepare().catch(() => {});   // so the Google popup opens instantly on tap
  const paint = st => {
    if (!box.isConnected) return off();
    const u = st.user;
    box.innerHTML = `<h2>${icon('profile')} ${L('Your account', 'Tu cuenta')}</h2>
      ${u ? `<div class="acct">
          ${u.photo ? `<img class="acct-photo" src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer" width="44" height="44">` : `<span class="avatar sm" aria-hidden="true">${esc((u.name || u.email || '?').slice(0, 1).toUpperCase())}</span>`}
          <div class="grow"><b>${esc(u.name || '')}</b><span class="muted small">${esc(u.email)}</span></div>
        </div>
        <p class="small acct-status" aria-live="polite">${statusText(st)}</p>
        <p class="small muted">${L('Sign in with this Google account on any device to continue where you left off.', 'Entra con esta cuenta de Google en cualquier dispositivo para seguir donde lo dejaste.')}</p>
        <button type="button" class="btn" data-signout>${L('Sign out', 'Cerrar sesión')}</button>`
      : `<p>${L('Save your progress and continue on any device: phone, tablet or computer.', 'Guarda tu avance y continúa en cualquier dispositivo: móvil, tablet u ordenador.')}</p>
        ${st.status === 'loading' ? `<p class="small muted">${statusText(st)}</p>` : googleBtn()}
        <p class="small muted">${L('Without an account, progress is only saved on this device.', 'Sin cuenta, el avance solo se guarda en este dispositivo.')}</p>`}`;
  };
  const off = cloud.onCloud(paint);
  paint(cloud.cloudState());
}

// Dashboard: a gentle reminder once the learner has something worth saving.
export const accountNudge = () => (!cloud.cloudState().user && cloud.cloudState().status !== 'loading' && S.xp > 0)
  ? `<section class="panel acct-nudge">${icon('profile')}<p class="grow"><b>${L('Save your progress', 'Guarda tu avance')}</b><span class="small muted">${L('Sign in to keep it on all your devices.', 'Entra para tenerlo en todos tus dispositivos.')}</span></p>${googleBtn(L('Sign in', 'Entrar'), 'sm')}</section>`
  : '';

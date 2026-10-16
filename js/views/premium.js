// The full course: what A2–C1 includes, the one-time price and the payment buttons.
// Also shown in place of any A2–C1 page the learner opens without having bought the course.
import { esc } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { cloudState, onCloud, prepare } from '../core/cloud.js';
import { isPremium, checkout, onPremium, hasPending, PRICE, FREE } from '../core/premium.js';
import { LEVELS, LEVEL, unitsOf, topicsOf, wordsOf } from '../data/index.js';
import { googleBtn } from './account.js';
import { toast } from './ui.js';

const paid = () => LEVELS.filter(l => !l.soon && l.id !== FREE);
const fmt = n => n.toLocaleString('es-CL');

export default function premium(root, { level, state } = {}) {
  prepare().catch(() => {});
  const paint = () => {
    if (!root.isConnected) return stop();
    const user = cloudState().user;
    const lv = level && LEVEL[level];
    const units = paid().flatMap(l => unitsOf(l.id));
    const lessons = units.reduce((n, u) => n + u.lessons.length, 0);
    const topics = paid().reduce((n, l) => n + topicsOf(l.id).length, 0);
    const words = paid().reduce((n, l) => n + wordsOf(l.id).length, 0);

    if (isPremium()) {
      root.innerHTML = `<section class="prem prem-done">
        <p class="eyebrow">${L('Full course', 'Curso completo')}</p>
        <h1 tabindex="-1">${L('You have the full course.', 'Tienes el curso completo.')}</h1>
        <p class="lead">${L('A1 to C1, on every device where you sign in with this Google account.', 'De A1 a C1, en todos los dispositivos donde entres con esta cuenta de Google.')}</p>
        <div class="lh-ctas"><a class="btn primary lg" href="${lv ? location.hash : '#/'}">${lv ? L('Continue', 'Continuar') : L('Go to my course', 'Ir a mi curso')} ${icon('arrow')}</a>
        <a class="btn ghost lg" href="#/learn">${L('See all levels', 'Ver todos los niveles')}</a></div></section>`;
      return;
    }

    const note = state === 'fail'
      ? `<p class="fb-line no" role="status">${icon('x')} <b>${L('The payment did not go through.', 'El pago no se completó.')}</b> ${L('Nothing was charged. You can try again.', 'No se hizo ningún cobro. Puedes intentarlo otra vez.')}</p>`
      : hasPending()
        ? `<p class="fb-line ok" role="status">${icon('clock')} <b>${L('Confirming your payment…', 'Confirmando tu pago…')}</b> ${user ? L('This takes a few seconds.', 'Tarda unos segundos.') : L('Sign in with the same Google account you used to pay.', 'Entra con la misma cuenta de Google con la que pagaste.')}</p>`
        : '';

    root.innerHTML = `<section class="prem">
      <div class="prem-text">
        <p class="eyebrow">${lv ? `${lv.code} · ${L('Full course', 'Curso completo')}` : L('Full course', 'Curso completo')}</p>
        <h1 tabindex="-1">${lv ? L(`${lv.code} is part of the full course.`, `${lv.code} es parte del curso completo.`) : L('Unlock A2 to C1.', 'Desbloquea de A2 a C1.')}</h1>
        <p class="lead">${L('A1 is free. With one payment you unlock the rest of the course for good, on all your devices.', 'El A1 es gratis. Con un solo pago desbloqueas el resto del curso para siempre, en todos tus dispositivos.')}</p>
        ${note}
        <ul class="prem-levels">${paid().map(l => `<li><span class="stop-code">${l.code}</span><span><b>${esc(L(l.name, l.es))}</b><span class="muted small">${unitsOf(l.id).length} ${L('units', 'unidades')} · ${unitsOf(l.id).reduce((n, u) => n + u.lessons.length, 0)} ${L('lessons', 'lecciones')}</span></span></li>`).join('')}</ul>
      </div>
      <aside class="prem-card" aria-labelledby="prem-price">
        <p class="eyebrow">${L('One-time payment', 'Pago único')}</p>
        <p class="prem-price" id="prem-price"><b>${PRICE.usd} USD</b><span>${L('no subscription', 'sin suscripción')}</span></p>
        <p class="small muted">${L(`In Chile: ${fmt(PRICE.clp)} CLP with Mercado Pago.`, `En Chile: ${fmt(PRICE.clp)} CLP con Mercado Pago.`)}</p>
        <ul class="can">
          <li>${icon('check')} ${lessons} ${L('lessons in', 'lecciones en')} ${units.length} ${L('units', 'unidades')}</li>
          <li>${icon('check')} ${topics} ${L('grammar topics explained in Spanish', 'temas de gramática explicados en español')}</li>
          <li>${icon('check')} ${fmt(words)} ${L('words with audio by Ana', 'palabras con el audio de Ana')}</li>
          <li>${icon('check')} ${L('Listening, reading, writing and speaking for every unit', 'Listening, lectura, escritura y speaking en cada unidad')}</li>
          <li>${icon('check')} ${L('Your progress synced on every device', 'Tu avance sincronizado en todos tus dispositivos')}</li>
        </ul>
        ${user
          ? `<button type="button" class="btn primary lg block" data-buy>${icon('lock')} ${L('Unlock the full course', 'Desbloquear el curso completo')}</button>
             <p class="small muted prem-alt">${L('Pay with', 'Pagar con')} <button type="button" class="linkish" data-buy="mp">Mercado Pago (CLP)</button> · <button type="button" class="linkish" data-buy="stripe">${L('international card', 'tarjeta internacional')} (USD)</button></p>
             <p class="small muted">${L('Signed in as', 'Comprarás con la cuenta')} <b>${esc(user.email)}</b></p>`
          : `<p class="small"><b>${L('First, sign in', 'Primero, entra con tu cuenta')}</b> ${L('so the course is saved to your account.', 'para que el curso quede guardado en ella.')}</p>${googleBtn(L('Continue with Google', 'Continuar con Google'), 'block')}`}
        <p class="small muted prem-safe">${icon('lock')} ${L('Secure payment by Stripe or Mercado Pago. We never see your card.', 'Pago seguro con Stripe o Mercado Pago. Nunca vemos los datos de tu tarjeta.')}</p>
      </aside>
    </section>
    ${lv ? `<p class="prem-free small muted">${L('Meanwhile, A1 is all yours:', 'Mientras tanto, el A1 es todo tuyo:')} <a href="#/learn/a1">${L('go to A1', 'ir al A1')}</a></p>` : ''}`;
  };

  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-buy]'); if (!b || b.disabled) return;
    b.disabled = true; const was = b.innerHTML; b.innerHTML = L('Opening payment…', 'Abriendo el pago…');
    try { await checkout(b.dataset.buy || undefined); }
    catch (err) {
      b.disabled = false; b.innerHTML = was;
      toast(err.code === 'signin' ? L('Sign in first.', 'Primero entra con tu cuenta.') : L('Could not open the payment. Please try again.', 'No se pudo abrir el pago. Inténtalo de nuevo.'), { icon: 'alert' });
    }
  });
  const offCloud = onCloud(() => { if (isPremium()) rerouteSoon(); else paint(); });
  const offPrem = onPremium(ev => {
    if (ev === 'unlocked') { toast(L('Done! You have the full course.', '¡Listo! Ya tienes el curso completo.'), { icon: 'check' }); rerouteSoon(); }
    else paint();
  });
  const stop = () => { offCloud(); offPrem(); };
  // When the course gets unlocked while a locked page is showing, open that page.
  const rerouteSoon = () => { stop(); if (level) dispatchEvent(new HashChangeEvent('hashchange')); else paint(); };
  paint();
}

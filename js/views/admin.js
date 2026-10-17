// #/admin — the course's voluntary payments (Stripe + Mercado Pago), for the owner only.
// The server decides who may see it (ADMIN_EMAILS); this page just shows what it answers.
import { esc } from '../core/util.js';
import { icon } from '../core/icons.js';
import { cloudState, onCloud, prepare } from '../core/cloud.js';
import { adminPayments } from '../core/premium.js';
import { googleBtn } from './account.js';

const fmt = (n, cur) => cur === 'CLP' ? `$${Math.round(n).toLocaleString('es-CL')}` : `${n.toLocaleString('es-CL', { maximumFractionDigits: 2 })} USD`;
const day = t => { const d = new Date(t); return `${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}${d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`}`; };

export default function admin(root) {
  prepare().catch(() => {});
  let loaded = false;
  const head = '<p class="eyebrow">Administración</p><h1 tabindex="-1">Aportes al curso</h1>';
  const paint = async () => {
    if (!root.isConnected) return off();
    const user = cloudState().user;
    if (!user) { root.innerHTML = `<section class="sect">${head}<p class="lead">Entra con tu cuenta de administrador para ver los aportes.</p>${googleBtn('Continuar con Google')}</section>`; return; }
    if (loaded) return;
    loaded = true;
    root.innerHTML = `<section class="sect">${head}<p class="muted">Cargando los pagos de Stripe y Mercado Pago…</p></section>`;
    let rows;
    try { rows = await adminPayments(); }
    catch (err) {
      root.innerHTML = `<section class="sect">${head}<p class="fb-line no">${icon('alert')} ${err.code === 'forbidden' ? `Esta página es solo para el administrador. Entraste como <b>${esc(user.email)}</b>.`
        : err.code === 'not configured' ? 'Los pagos todavía no están configurados en Vercel.' : 'No se pudieron cargar los pagos. Recarga la página para intentarlo de nuevo.'}</p></section>`;
      loaded = false;
      return;
    }
    const sum = cur => { const r = rows.filter(x => x.currency === cur); const t = r.reduce((n, x) => n + x.amount, 0); return { n: r.length, t, avg: r.length ? t / r.length : 0 }; };
    const clp = sum('CLP'), usd = sum('USD');
    root.innerHTML = `<section class="sect">${head}
      <p class="lead">${rows.length ? `${rows.length} ${rows.length === 1 ? 'aporte' : 'aportes'} en total. Se muestran los últimos 100 de cada proveedor.` : 'Todavía no hay aportes.'}</p>
      <dl class="admin-sum">
        <div><dt>Chile · Mercado Pago</dt><dd><b>${fmt(clp.t, 'CLP')}</b> <span class="muted">${clp.n} ${clp.n === 1 ? 'aporte' : 'aportes'}${clp.n ? ` · promedio ${fmt(clp.avg, 'CLP')}` : ''}</span></dd></div>
        <div><dt>Otros países · Stripe</dt><dd><b>${fmt(usd.t, 'USD')}</b> <span class="muted">${usd.n} ${usd.n === 1 ? 'aporte' : 'aportes'}${usd.n ? ` · promedio ${fmt(usd.avg, 'USD')}` : ''}</span></dd></div>
      </dl>
      ${rows.length ? `<div class="tbl"><table><thead><tr><th>Fecha</th><th>Correo</th><th>Monto</th><th>Vía</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td class="nowrap">${esc(day(r.t))}</td><td>${esc(r.email || '—')}</td><td class="nowrap"><b>${fmt(r.amount, r.currency)}</b></td><td>${r.provider === 'mp' ? 'Mercado Pago' : 'Stripe'}</td></tr>`).join('')}
      </tbody></table></div>` : ''}
      <p class="small muted">Los montos son brutos: Stripe y Mercado Pago descuentan su comisión antes de depositarte.</p></section>`;
  };
  const off = onCloud(paint);
  paint();
}

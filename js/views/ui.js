// Shared view helpers: headers, progress bars, skill meters, toasts.
import { esc } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { SKILL_META } from '../core/path.js';

export const h1 = (title, { eyebrow = '', lead = '', back = '' } = {}) => `<header class="page-head">
  ${back ? `<a class="back" href="${back}">${icon('back')} ${L('Back', 'Volver')}</a>` : ''}
  ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
  <h1 tabindex="-1">${esc(title)}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</header>`;

export const bar = (ratio, label = '', cls = '') => {
  const p = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return `<div class="bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}" aria-label="${esc(label || `${p}%`)}"><i style="width:${p}%"></i></div>`;
};

export function skillMeters(prog, { compact = false } = {}) {
  return `<ul class="meters${compact ? ' compact' : ''}">${Object.entries(prog).map(([k, v]) => {
    const m = SKILL_META[k]; const p = Math.round(v * 100);
    return `<li><a href="${m.href}" class="meter" title="${esc(L(m.en, m.es))}: ${p}%">
      <span class="m-name">${icon(m.icon)} ${esc(L(m.en, m.es))}</span>
      ${bar(v, `${L(m.en, m.es)} ${p}%`, `skill-${k}`)}<span class="m-val">${p}%</span></a></li>`;
  }).join('')}</ul>`;
}

export const empty = (ic, text, cta = '') => `<div class="empty">${icon(ic)}<p>${text}</p>${cta}</div>`;

let toastT;
export function toast(html, { icon: ic = 'sparkle', ms = 3800 } = {}) {
  const box = document.getElementById('toasts'); if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = `${icon(ic)}<span>${html}</span>`;
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  clearTimeout(toastT);
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, ms);
}

export const levelChip = (code, name) => `<span class="level-chip"><b>${esc(code)}</b> ${esc(name)}</span>`;
export const minutesLabel = sec => `${Math.round(sec / 60)} min`;

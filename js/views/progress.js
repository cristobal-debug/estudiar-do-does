import { esc, dayKey, addDays } from '../core/util.js';
import { L, lang } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S, streak, bestStreak } from '../core/store.js';
import { learnedIds, isMastered } from '../core/srs.js';
import { skillProgress, levelRatio, areas, SKILL_META, wordsLearned } from '../core/path.js';
import { ACHIEVEMENTS } from '../core/gamification.js';
import { LEVELS, LEVEL } from '../data/index.js';
import { h1, bar, skillMeters } from './ui.js';

// Minutes per day for the last 14 days: one series, one hue, values labelled, table fallback.
function minutesChart() {
  const days = Array.from({ length: 14 }, (_, i) => { const d = addDays(new Date(), i - 13); const k = dayKey(d); return { d, k, m: Math.round((S.days[k]?.sec || 0) / 60) }; });
  const max = Math.max(S.goal, ...days.map(x => x.m));
  const W = 560, H = 180, pad = 24, bw = (W - pad) / days.length;
  const y = m => H - 22 - (m / max) * (H - 44);
  const goalY = y(S.goal);
  const fmt = d => d.toLocaleDateString(lang() === 'es' ? 'es-ES' : 'en-GB', { weekday: 'narrow' });
  return `<figure class="chart">
    <div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="mc-t mc-d">
      <title id="mc-t">${L('Minutes studied per day', 'Minutos de estudio por día')}</title><desc id="mc-d">${L('Last 14 days', 'Últimos 14 días')}</desc>
      <line x1="${pad}" x2="${W}" y1="${H - 22}" y2="${H - 22}" class="axis"/>
      <line x1="${pad}" x2="${W}" y1="${goalY}" y2="${goalY}" class="goal-line"/>
      <text x="${W - 2}" y="${goalY - 5}" class="goal-lbl" text-anchor="end">${L('goal', 'objetivo')} ${S.goal} min</text>
      ${days.map((x, i) => { const bx = pad + i * bw + bw * 0.22, h = Math.max(0, H - 22 - y(x.m)); return `<g class="bar-g"><title>${x.d.toLocaleDateString()}: ${x.m} min</title>
        <rect x="${pad + i * bw}" y="0" width="${bw}" height="${H}" class="hit"/>
        ${x.m ? `<rect x="${bx}" y="${y(x.m)}" width="${bw * 0.56}" height="${h}" rx="4" class="bar-r${x.m >= S.goal ? ' met' : ''}"/>` : ''}
        ${x.m ? `<text x="${bx + bw * 0.28}" y="${y(x.m) - 5}" text-anchor="middle" class="val">${x.m}</text>` : ''}
        <text x="${bx + bw * 0.28}" y="${H - 6}" text-anchor="middle" class="tick${x.k === dayKey() ? ' today' : ''}">${fmt(x.d)}</text></g>`; }).join('')}
    </svg></div>
    <details class="tbl-toggle"><summary>${L('Show as table', 'Ver como tabla')}</summary><table class="tbl"><thead><tr><th scope="col">${L('Day', 'Día')}</th><th scope="col">min</th></tr></thead><tbody>${days.map(x => `<tr><th scope="row">${x.d.toLocaleDateString()}</th><td>${x.m}</td></tr>`).join('')}</tbody></table></details>
  </figure>`;
}

export default function progress(root) {
  const lv = LEVEL[S.level];
  const ar = areas();
  const got = ACHIEVEMENTS.filter(a => S.ach[a.id]);
  const lessons = Object.keys(S.lessons).length;
  const totalMin = Math.round(Object.values(S.days).reduce((a, d) => a + d.sec, 0) / 60);
  root.innerHTML = `${h1(L('Your progress', 'Tu progreso'), { lead: L('What you have learned and what to work on next.', 'Lo que has aprendido y en qué trabajar a continuación.') })}
  <div class="grid kpis">
    <div class="panel kpi">${icon('compass')}<b>${lv.code}</b><span>${esc(L(lv.name, lv.es))}${S.placed ? ` · ${L('estimated', 'estimado')}` : ''}</span></div>
    <div class="panel kpi">${icon('flame', 'flame')}<b>${streak()}</b><span>${L('day streak', 'días de racha')} · ${L('best', 'récord')} ${bestStreak()}</span></div>
    <div class="panel kpi">${icon('learn')}<b>${lessons}</b><span>${L('lessons completed', 'lecciones completadas')}</span></div>
    <div class="panel kpi">${icon('vocab')}<b>${wordsLearned()}</b><span>${L('words learned', 'palabras aprendidas')} · ${Object.keys(S.cards).filter(isMastered).length} ${L('mastered', 'dominadas')}</span></div>
    <div class="panel kpi">${icon('clock')}<b>${totalMin}</b><span>${L('minutes in total', 'minutos en total')}</span></div>
    <div class="panel kpi">${icon('bolt', 'bolt')}<b>${S.xp.toLocaleString()}</b><span>XP</span></div>
  </div>

  <div class="dash-cols">
    <div class="col-main">
      <section class="panel"><div class="panel-head"><h2>${L('Skills', 'Destrezas')} · ${lv.code}</h2><span class="small muted">${L('Progress within your current level', 'Progreso dentro de tu nivel actual')}</span></div>${skillMeters(skillProgress())}</section>
      <section class="panel"><h2>${L('Study time', 'Tiempo de estudio')}</h2>${minutesChart()}</section>
      <section class="panel"><h2>${L('Levels', 'Niveles')}</h2>
        <ul class="level-bars">${LEVELS.filter(l => !l.soon).map(l => `<li class="${l.id === S.level ? 'cur' : ''}"><a href="#/learn/${l.id}"><b>${l.code}</b><span>${esc(L(l.name, l.es))}</span>${bar(levelRatio(l.id), `${l.code} ${Math.round(levelRatio(l.id) * 100)}%`)}<span class="small">${Math.round(levelRatio(l.id) * 100)}%</span></a></li>`).join('')}</ul></section>
    </div>
    <aside class="col-side">
      <section class="panel"><h2>${L('Strengths & weaknesses', 'Puntos fuertes y débiles')}</h2>
        ${ar.weak.length || ar.strong.length ? `
        ${ar.strong.length ? `<p class="small muted">${L('Strong', 'Fuertes')}</p><ul class="links">${ar.strong.map(r => `<li>${icon('check')} ${esc(L(SKILL_META[r.s].en, SKILL_META[r.s].es))} · ${Math.round(r.acc * 100)}%</li>`).join('')}</ul>` : ''}
        ${ar.weak.length ? `<p class="small muted">${L('To improve', 'A mejorar')}</p><ul class="links">${ar.weak.map(r => `<li><a href="${SKILL_META[r.s].href}">${icon('alert')} ${esc(L(SKILL_META[r.s].en, SKILL_META[r.s].es))} · ${Math.round(r.acc * 100)}%</a></li>`).join('')}</ul>` : ''}`
        : `<p class="muted">${L('Answer a few more exercises and we will show your strong and weak areas here.', 'Responde algunos ejercicios más y aquí verás tus puntos fuertes y débiles.')}</p>`}
        <a class="btn ghost" href="#/mistakes">${icon('mistakes')} ${L('My mistakes', 'Mis errores')}</a>
      </section>
      <section class="panel"><div class="panel-head"><h2>${L('Achievements', 'Logros')}</h2><span class="small muted">${got.length}/${ACHIEVEMENTS.length}</span></div>
        <ul class="achs">${[...ACHIEVEMENTS].sort((a, b) => !!S.ach[b.id] - !!S.ach[a.id]).map(a => `<li class="${S.ach[a.id] ? 'got' : ''}" title="${esc(L(a.den, a.des))}">${icon(S.ach[a.id] ? a.icon : 'lock')}<span><b>${esc(L(a.en, a.es))}</b><small>${esc(L(a.den, a.des))}</small></span></li>`).join('')}</ul></section>
    </aside>
  </div>`;
}

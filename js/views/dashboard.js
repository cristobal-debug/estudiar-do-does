import { esc, md, seeded, dayKey, weekStart, addDays } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S, day, doneToday } from '../core/store.js';
import { dueCount } from '../core/srs.js';
import { currentUnit, nextLesson, todayPlan, skillProgress, topMistakes, levelRatio, SKILL_META, lessonDone, wordsLearned } from '../core/path.js';
import { LEVEL, WORDS, TIPS, UNITS } from '../data/index.js';
import { audioBtn } from '../core/audio.js';
import { accountNudge } from './account.js';
import { bar, skillMeters } from './ui.js';

function greeting() {
  const h = new Date().getHours();
  const [en, es] = h < 12 ? ['Good morning', 'Buenos días'] : h < 20 ? ['Good afternoon', 'Buenas tardes'] : ['Good evening', 'Buenas noches'];
  return L(en, es) + (S.name ? `, ${S.name}` : '');
}

export function primaryAction() {
  const due = dueCount();
  const u = currentUnit(); const l = nextLesson(u);
  if (due >= 15 && !doneToday('vocabulary'))
    return { href: '#/review', eyebrow: L('Before anything else', 'Antes de nada'), title: L(`Review ${due} words`, `Repasa ${due} palabras`), sub: L('They are about to be forgotten. It takes ~5 minutes.', 'Están a punto de olvidarse. Te llevará unos 5 minutos.'), cta: L('Start review', 'Empezar repaso'), icon: 'review' };
  if (l) {
    const started = u.lessons.some(x => lessonDone(x.id));
    return { href: `#/lesson/${l.id}`, eyebrow: `${LEVEL[u.level].code} · ${L('Unit', 'Unidad')} ${u.n} · ${esc(L(u.title, u.es || u.title))}`, title: L(l.title, l.es), sub: `${icon('clock')} ~${l.min} min · ${L('Lesson', 'Lección')} ${u.lessons.indexOf(l) + 1} / ${u.lessons.length}`, cta: started ? L('Continue lesson', 'Continuar lección') : L('Start lesson', 'Empezar lección'), icon: 'learn' };
  }
  return { href: '#/practice/quick', eyebrow: L('You finished every unit!', '¡Has terminado todas las unidades!'), title: L('Keep your English sharp', 'Mantén tu inglés en forma'), sub: L('Mixed practice across all skills.', 'Práctica mixta de todas las destrezas.'), cta: L('Quick practice', 'Práctica rápida'), icon: 'practice' };
}

export function wordOfDay() {
  const lv = S.level === 'c1' ? 'c1' : S.level;
  const pool = WORDS.filter(w => w.level === lv && w.ex);
  return pool[Math.floor(seeded('wod' + dayKey())() * pool.length)];
}

function week() {
  const start = weekStart();
  let sec = 0, lessons = 0, reviews = 0;
  for (let i = 0; i < 7; i++) { const d = S.days[dayKey(addDays(start, i))]; if (d) { sec += d.sec; lessons += d.lessons; reviews += d.reviews; } }
  return { sec, lessons, reviews };
}

export default function dashboard(root) {
  const d = day();
  const goalSec = S.goal * 60;
  const ratio = Math.min(1, d.sec / goalSec);
  const pa = primaryAction();
  const due = dueCount();
  const plan = todayPlan();
  const prog = skillProgress();
  const lv = LEVEL[S.level];
  const mist = topMistakes(2);
  const w = wordOfDay();
  const tip = TIPS[Math.floor(seeded('tip' + dayKey())() * TIPS.length)];
  const wk = week();
  const dailyDone = !!S.challenges[dayKey()];
  const C = 2 * Math.PI * 34;
  const u = currentUnit();

  const where = u ? L(`You are on unit ${u.n} of ${LEVEL[u.level].code}: ${u.title}.`, `Vas por la unidad ${u.n} del ${LEVEL[u.level].code}: ${u.es || u.title}.`) : '';
  root.innerHTML = `
  <header class="dash-head">
    <div><p class="eyebrow">${new Date().toLocaleDateString(L('en-GB', 'es-ES'), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    <h1 tabindex="-1">${esc(greeting())}</h1>
    <p class="lead">${esc(where)}${due ? ` ${L(`${due} words are waiting for review.`, `Tienes ${due} ${due === 1 ? 'palabra' : 'palabras'} para repasar.`)}` : ''}</p></div>
    <a class="level-card" href="#/learn/${S.level}" aria-label="${L('Your level', 'Tu nivel')}: ${lv.code} ${lv.name}">
      <span class="lc-code">${lv.code}</span><span class="lc-txt"><small>${L('Your level', 'Tu nivel')}</small><b>${esc(L(lv.name, lv.es))}</b>${bar(levelRatio(), L('Level progress', 'Progreso del nivel'))}</span>
    </a>
  </header>
  ${accountNudge()}

  <section class="panel hero" aria-labelledby="pa-title">
    <div class="hero-main">
      <p class="eyebrow">${pa.eyebrow}</p>
      <h2 id="pa-title">${esc(pa.title)}</h2>
      <p class="muted">${pa.sub}</p>
      <a class="btn primary lg" href="${pa.href}">${esc(pa.cta)} ${icon('arrow')}</a>
    </div>
    <div class="goal">
      <div class="goal-ring" role="img" aria-label="${L('Today\'s goal', 'Objetivo de hoy')}: ${Math.round(ratio * 100)}%">
        <svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="ring-bg"/><circle cx="40" cy="40" r="34" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - ratio)}"/></svg>
        <span>${Math.round(ratio * 100)}%</span>
      </div>
      <p><b>${Math.round(d.sec / 60)} / ${S.goal} min</b><br><span class="muted small">${L('studied today', 'estudiados hoy')}</span></p>
    </div>
  </section>

  <div class="dash-cols">
    <div class="col-main">
      <section class="dash-sect" aria-labelledby="plan-t">
        <div class="panel-head"><h2 id="plan-t">${L('Today\'s practice', 'Tu práctica de hoy')}</h2><span class="muted small">${plan.filter(p => p.done).length} ${L('of', 'de')} ${plan.length} ${L('done', 'hechas')}</span></div>
        <ul class="plan">${plan.map(p => `<li><a class="plan-item${p.done ? ' done' : ''}" href="${p.href}">
          <span class="pi-ico skill-${p.skill}">${icon(SKILL_META[p.skill].icon)}</span>
          <span class="pi-txt"><small>${esc(L(SKILL_META[p.skill].en, SKILL_META[p.skill].es))}</small><b>${esc(L(p.en, p.es))}</b></span>
          <span class="pi-min">${p.done ? `${icon('check')}<span class="sr">${L('done', 'hecho')}</span>` : `${p.min} min`}</span></a></li>`).join('')}</ul>
      </section>

      <section class="dash-sect" aria-labelledby="prog-t">
        <div class="panel-head"><h2 id="prog-t">${L('Your progress', 'Tu progreso')} <span class="muted">· ${lv.code}</span></h2><a class="link" href="#/progress">${L('Details', 'Detalles')} ${icon('chevron')}</a></div>
        ${skillMeters(prog)}
        <p class="weekly-inline"><span class="muted">${L('This week', 'Esta semana')}:</span> <b>${wk.lessons}</b>/5 ${L('lessons', 'lecciones')} · <b>${wk.reviews}</b>/100 ${L('words reviewed', 'palabras repasadas')} · <b>${Math.round(wk.sec / 60)}</b>/${S.goal * 5} min <span class="muted">· ${L('resets on Monday', 'se reinicia el lunes')}</span></p>
      </section>
    </div>

    <aside class="col-side">
      <section class="panel review-card" aria-labelledby="rev-t">
        <h2 id="rev-t">${icon('review')} ${L('Review', 'Repaso')}</h2>
        ${due ? `<p><b class="big">${due}</b> ${L(due === 1 ? 'word to review' : 'words to review', due === 1 ? 'palabra para repasar' : 'palabras para repasar')}</p><a class="btn primary" href="#/review">${L('Review now', 'Repasar ahora')}</a>`
          : `<p class="muted">${L('Nothing due. Words come back here when they are about to be forgotten.', 'Nada pendiente. Las palabras vuelven aquí cuando están a punto de olvidarse.')}</p><a class="btn ghost" href="#/review/new">${L('Learn new words', 'Aprender palabras nuevas')}</a>`}
      </section>

      ${mist.length ? `<section class="panel mistakes-card" aria-labelledby="mk-t">
        <h2 id="mk-t">${icon('mistakes')} ${L('Your frequent mistakes', 'Tus errores frecuentes')}</h2>
        <ul>${mist.map(m => `<li><s>${esc(m.wrong)}</s><span>${icon('check')} ${esc(m.right)}</span></li>`).join('')}</ul>
        <a class="btn ghost" href="#/practice/mistakes">${L('Practise my mistakes', 'Practicar mis errores')}</a>
      </section>` : ''}

      ${w ? `<section class="wod" aria-labelledby="wod-t">
        <p class="eyebrow" id="wod-t">${L('Word of the day', 'Palabra del día')}</p>
        <div class="wod-word"><h2 lang="en">${esc(w.en)}</h2>${audioBtn(w.en)}</div>
        <p class="ipa">/${esc(w.ipa)}/ · ${esc(w.pos)} · <b>${esc(w.es)}</b></p>
        <p class="wc-ex"><span lang="en">“${esc(w.ex)}”</span> ${audioBtn(w.ex, { kind: 'example' })}</p>
      </section>` : ''}

      <section class="tip" aria-labelledby="tip-t">
        <p class="eyebrow" id="tip-t">${{ dont: L('Don\'t say…', 'No digas…'), false: L('False friend', 'Falso amigo'), know: L('Did you know?', '¿Sabías que…?'), tip: L('Tip', 'Consejo') }[tip.k]}</p>
        <p><b>${esc(tip.t)}</b></p><p class="muted">${md(tip.es)}</p>
      </section>
    </aside>
  </div>

  <section class="modes" aria-labelledby="modes-t">
    <h2 id="modes-t">${L('Short on time?', '¿Tienes poco tiempo?')}</h2>
    <div class="grid">
      <a class="link-card" href="#/practice/quick">${icon('timer')}<b>${L('I only have 5 minutes', 'Solo tengo 5 minutos')}</b><span>${L('Vocabulary, grammar and listening, mixed', 'Vocabulario, gramática y listening, mezclados')}</span></a>
      <a class="link-card" href="#/practice/20">${icon('clock')}<b>${L('I have 20 minutes', 'Tengo 20 minutos')}</b><span>${L('Every skill plus your review', 'Todas las destrezas y tu repaso')}</span></a>
      <a class="link-card${dailyDone ? ' done' : ''}" href="#/practice/daily">${icon('flame')}<b>${L('Daily challenge', 'Reto diario')}</b><span>${dailyDone ? L('Done today', 'Hecho hoy') : L('5 words, 3 grammar questions, listening, reading and writing', '5 palabras, 3 de gramática, listening, lectura y escritura')}</span></a>
      <a class="link-card" href="#/practice/exam">${icon('flag')}<b>${L('Exam mode', 'Modo examen')}</b><span>${L('10, 20 or 50 questions, corrected at the end', '10, 20 o 50 preguntas, corregidas al final')}</span></a>
    </div>
  </section>`;
}

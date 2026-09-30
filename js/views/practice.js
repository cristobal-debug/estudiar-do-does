import { esc, dayKey } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S, save, addXP, markDone, openMistakes, topicScore } from '../core/store.js';
import { runSession } from '../core/session.js';
import { quickSession, longSession, dailyChallenge, examSession, mistakeItems } from '../core/generate.js';
import { SKILL_META } from '../core/path.js';
import { TOPICS } from '../data/index.js';
import { h1, empty } from './ui.js';

export function hub(root) {
  const open = mistakeItems(50).length;
  const dailyDone = !!S.challenges[dayKey()];
  root.innerHTML = `${h1(L('Practice', 'Práctica'), { lead: L('Short, focused sessions that mix skills. Pick the one that fits your time.', 'Sesiones cortas que mezclan destrezas. Elige la que encaje con tu tiempo.') })}
  <div class="grid practice-grid">
    <a class="link-card big" href="#/practice/quick">${icon('timer')}<b>${L('I only have 5 minutes', 'Solo tengo 5 minutos')}</b><span>${L('Vocabulary · grammar · listening · reading', 'Vocabulario · gramática · listening · lectura')}</span></a>
    <a class="link-card big" href="#/practice/20">${icon('clock')}<b>${L('20-minute session', 'Sesión de 20 minutos')}</b><span>${L('Every skill plus your mistakes, in a balanced order', 'Todas las destrezas y tus errores, en un orden equilibrado')}</span></a>
    <a class="link-card big${dailyDone ? ' done' : ''}" href="#/practice/daily">${icon('flame')}<b>${L('Daily challenge', 'Reto diario')}</b><span>${dailyDone ? `${icon('check')} ${L('Completed today', 'Completado hoy')}` : L('11 questions · +100 XP', '11 preguntas · +100 XP')}</span></a>
    <a class="link-card big" href="#/practice/exam">${icon('flag')}<b>${L('Exam mode', 'Modo examen')}</b><span>${L('No hints, timed, with a report of weak areas', 'Sin pistas, cronometrado, con informe de puntos débiles')}</span></a>
    <a class="link-card big" href="#/practice/mistakes">${icon('mistakes')}<b>${L('My mistakes', 'Mis errores')}</b><span>${open ? L(`${open} to practise`, `${open} para practicar`) : L('Nothing pending', 'Nada pendiente')}</span></a>
    <a class="link-card big" href="#/classic">${icon('classic')}<b>${L('Class exercises', 'Ejercicios de clase')}</b><span>${L('The original Present Simple, to be and can practice', 'La práctica original de Present Simple, to be y can')}</span></a>
  </div>
  <h2>${L('Practise one skill', 'Practica una destreza')}</h2>
  <div class="grid skills-grid">${Object.entries(SKILL_META).map(([k, m]) => `<a class="link-card skill-${k}" href="${m.href}">${icon(m.icon)}<b>${esc(L(m.en, m.es))}</b></a>`).join('')}</div>`;
}

const finishMarks = s => { const skills = new Set(s.results.map(r => r.it.skill)); skills.forEach(k => markDone(k)); };

export function quick(root) {
  runSession(root, {
    title: L('5-minute practice', 'Práctica de 5 minutos'), items: quickSession(), exitHref: '#/practice',
    onFinish(s) { finishMarks(s); return { title: L('5 minutes well spent.', '5 minutos bien aprovechados.'), sub: L('Small, frequent sessions are the fastest way to learn.', 'Las sesiones cortas y frecuentes son la forma más rápida de aprender.'), nextHref: '#/' }; },
  });
}
export function long(root) {
  runSession(root, {
    title: L('20-minute session', 'Sesión de 20 minutos'), items: longSession(), exitHref: '#/practice',
    onFinish(s) { finishMarks(s); markDone('review'); return { title: L('Great session!', '¡Gran sesión!'), sub: L('You practised every skill today.', 'Hoy has practicado todas las destrezas.'), nextHref: '#/' }; },
  });
}
export function daily(root) {
  const k = dayKey();
  runSession(root, {
    title: L('Daily challenge', 'Reto diario'), items: dailyChallenge(k), exitHref: '#/', requeue: false,
    onFinish(s) {
      finishMarks(s);
      const first = !S.challenges[k];
      if (first) { S.challenges[k] = true; save(); addXP(100); }
      return { title: L('Daily challenge completed!', '¡Reto diario completado!'), sub: first ? L('Come back tomorrow for a new one.', 'Vuelve mañana para un reto nuevo.') : L('You had already completed today\'s challenge.', 'Ya habías completado el reto de hoy.'), icon: 'flame', bonus: first ? 100 : 0, nextHref: '#/' };
    },
  });
}

export function mistakes(root) {
  const items = mistakeItems(15);
  if (!items.length) {
    root.innerHTML = `${h1(L('Practise my mistakes', 'Practicar mis errores'), { back: '#/practice' })}${empty('check', L('No pending mistakes. Keep practising and we will collect them here.', 'No tienes errores pendientes. Sigue practicando y los iremos reuniendo aquí.'), `<a class="btn primary" href="#/practice/quick">${L('Quick practice', 'Práctica rápida')}</a>`)}`;
    return;
  }
  runSession(root, {
    title: L('My mistakes', 'Mis errores'), items, exitHref: '#/mistakes', fixMode: true,
    onFinish(s) { finishMarks(s); return { title: L('Mistakes reviewed', 'Errores repasados'), sub: L(`${s.correct} fixed. The rest stay on your list.`, `${s.correct} corregidos. El resto siguen en tu lista.`), nextHref: '#/mistakes', nextLabel: L('See my mistakes', 'Ver mis errores') }; },
  });
}

export function exam(root, { n }) {
  if (!n) {
    root.innerHTML = `${h1(L('Exam mode', 'Modo examen'), { back: '#/practice', lead: L('Questions from all the units you have reached. No hints and no feedback until the end — like a real exam.', 'Preguntas de todas las unidades que has alcanzado. Sin pistas ni correcciones hasta el final, como en un examen real.') })}
    <div class="grid">${[10, 20, 50].map(k => `<a class="link-card big center" href="#/practice/exam/${k}"><b class="huge">${k}</b><span>${L('questions', 'preguntas')} · ~${Math.round(k * 0.6)} min</span></a>`).join('')}</div>`;
    return;
  }
  runSession(root, {
    title: L('Exam', 'Examen'), items: examSession(+n), exitHref: '#/practice/exam', exam: true, noRepeat: false,
    onFinish(s) {
      finishMarks(s);
      const bySkill = {}, byTopic = {};
      s.results.forEach(r => {
        const k = r.it.skill || 'grammar'; (bySkill[k] ||= { c: 0, t: 0 }); bySkill[k].t++; if (r.ok) bySkill[k].c++;
        if (r.it.topic) { (byTopic[r.it.topic] ||= { c: 0, t: 0 }); byTopic[r.it.topic].t++; if (r.ok) byTopic[r.it.topic].c++; }
      });
      Object.entries(byTopic).forEach(([id, v]) => { if (v.t >= 2) topicScore(id, v.c / v.t); });
      const weak = Object.entries(byTopic).filter(([, v]) => v.c / v.t < 0.7).sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t).slice(0, 4);
      const mm = Math.floor(s.sec / 60), ss = String(s.sec % 60).padStart(2, '0');
      return {
        title: L('Exam finished', 'Examen terminado'), icon: 'flag',
        sub: `${L('Time', 'Tiempo')}: ${mm}:${ss}`,
        extra: `<div class="panel exam-report"><h2>${L('Score by skill', 'Resultado por destreza')}</h2>
          <table class="tbl"><thead><tr><th scope="col">${L('Skill', 'Destreza')}</th><th scope="col">${L('Correct', 'Aciertos')}</th><th scope="col">%</th></tr></thead><tbody>
          ${Object.entries(bySkill).map(([k, v]) => `<tr><th scope="row">${icon(SKILL_META[k].icon)} ${esc(L(SKILL_META[k].en, SKILL_META[k].es))}</th><td>${v.c}/${v.t}</td><td>${Math.round(v.c / v.t * 100)}%</td></tr>`).join('')}</tbody></table>
          ${weak.length ? `<h2>${L('Weak areas — study next', 'Puntos débiles: estudia esto')}</h2><ul class="links">${weak.map(([id]) => `<li><a href="#/grammar/${id}">${icon('grammar')} ${esc(TOPICS[id].title)}</a></li>`).join('')}</ul>` : `<p>${icon('check')} ${L('No weak grammar areas detected. Excellent!', 'No se detectan puntos débiles de gramática. ¡Excelente!')}</p>`}</div>`,
        nextHref: '#/practice', nextLabel: L('Back to practice', 'Volver a práctica'),
      };
    },
  });
}

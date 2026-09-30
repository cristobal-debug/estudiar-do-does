import { esc } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S, addXP, completeLesson, topicScore, itemScore, markDone } from '../core/store.js';
import { addCards, grade } from '../core/srs.js';
import { runSession } from '../core/session.js';
import { buildLesson } from '../core/generate.js';
import { skillProgress, nextLesson, syncLevel, unitState, currentUnit, SKILL_META } from '../core/path.js';
import { LESSON, UNIT, UNITS, LEVEL } from '../data/index.js';

export function deltas(before, after) {
  return Object.keys(after).map(k => ({ k, d: Math.round((after[k] - before[k]) * 100) })).filter(x => x.d > 0);
}
export const deltaHtml = ds => ds.length ? `<ul class="deltas">${ds.map(({ k, d }) => `<li class="skill-${k}">${icon(SKILL_META[k].icon)} ${esc(L(SKILL_META[k].en, SKILL_META[k].es))} <b>+${d}%</b></li>`).join('')}</ul>` : '';

export default function lesson(root, { id }) {
  const l = LESSON[id]; if (!l) { location.hash = '#/learn'; return; }
  const u = UNIT[l.unit];
  if (unitState(u) === 'locked') { location.hash = `#/unit/${u.id}`; return; }
  const before = skillProgress(u.level);
  const already = !!S.lessons[id];

  runSession(root, {
    title: L(l.title, l.es),
    items: buildLesson(id),
    exitHref: `#/unit/${u.id}`,
    onFinish(s) {
      const test = s.results.filter(r => r.it.phase === 'test');
      const score = test.length ? test.filter(r => r.ok).length / test.length : s.score;
      if (l.kind === 'vocab') {
        const seen = new Map();
        s.results.forEach(r => { if (r.it.word) seen.set(r.it.word, (seen.get(r.it.word) ?? true) && r.ok); });
        addCards(u.words.map(w => w.id));
        seen.forEach((ok, w) => { if (S.cards[w]?.n) grade(w, ok ? 2 : 0); });
        markDone('vocabulary');
      } else if (l.kind === 'grammar') {
        topicScore(l.topic, score);
        markDone('grammar');
      } else {
        const part = sk => { const rs = s.results.filter(r => r.it.skill === sk && r.it.unit === u.id); return rs.length ? rs.filter(r => r.ok).length / rs.length : 0; };
        itemScore(`listening:${u.id}`, part('listening'));
        itemScore(`reading:${u.id}`, part('reading'));
        markDone('listening'); markDone('reading');
      }
      completeLesson(id, score);
      const bonus = already ? 10 : 50;
      addXP(bonus);
      const up = syncLevel();
      const after = skillProgress(u.level);
      const nl = nextLesson(u) || nextLesson(currentUnit());
      const nu = nl && UNIT[nl.unit];
      const unitFinished = !nextLesson(u) && !already;
      return {
        title: up ? L(`Welcome to ${LEVEL[up.to].code}!`, `¡Bienvenido/a a ${LEVEL[up.to].code}!`) : unitFinished ? L('Unit completed!', '¡Unidad completada!') : L('Lesson completed!', '¡Lección completada!'),
        sub: up ? L(`You finished ${LEVEL[up.from].code}. A new level starts now.`, `Has terminado ${LEVEL[up.from].code}. Empieza un nuevo nivel.`)
          : score >= 0.8 ? L('Excellent. You now know a bit more than before.', 'Excelente. Ahora sabes un poco más que antes.')
          : score >= 0.5 ? L('Good work. Your mistakes will come back in your review.', 'Buen trabajo. Tus fallos volverán en el repaso.')
          : L('Done! Repeat the lesson whenever you want — mistakes are how we learn.', '¡Hecho! Repite la lección cuando quieras: de los errores se aprende.'),
        icon: up || unitFinished ? 'trophy' : 'sparkle',
        bonus,
        extra: `${deltaHtml(deltas(before, after))}
          ${nl ? `<div class="next-up"><small>${L('Next', 'Siguiente')}</small><b>${esc(L(nl.title, nl.es))}</b><span class="muted small">${LEVEL[nu.level].code} · ${esc(nu.title)}</span></div>` : ''}`,
        nextHref: nl ? `#/lesson/${nl.id}` : '#/',
        nextLabel: nl ? L('Continue', 'Continuar') : L('Back to dashboard', 'Volver al inicio'),
      };
    },
  });
}

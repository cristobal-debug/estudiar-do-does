// Builds sessions from content: lessons (teach → practise → check) and practice modes.
import { esc, md, shuffle, sample, seeded, dayKey, uid, canon } from './util.js';
import { L, lang } from './i18n.js';
import { icon } from './icons.js';
import { sayBtn } from './session.js';
import { canSpeak } from './speech.js';
import { S } from './store.js';
import { strength, dueIds } from './srs.js';
import { UNIT, UNITS, TOPICS, WORDS, WORD, LESSON, LEVEL_IDS, unitsOf, topicsOf, MISTAKES } from '../data/index.js';
import { currentUnit, unitState } from './path.js';

// ——— Vocabulary exercises generated from word data ———
function distractors(w, field, n, rnd) {
  const same = WORDS.filter(x => x.id !== w.id && x[field] !== w[field] && x.level === w.level);
  const cat = same.filter(x => x.cat === w.cat);
  return sample(cat.length >= n ? cat : same, n, rnd).map(x => x[field]);
}
export function wordItem(w, kind, rnd = Math.random) {
  const key = uid(['w', w.id, kind]);
  const base = { skill: 'vocabulary', word: w.id, key };
  if (kind === 'meaning') return { ...base, t: 'mc', q: L(`What does **${w.en}** mean?`, `¿Qué significa **${w.en}**?`), o: [w.es, ...distractors(w, 'es', 3, rnd)], say: canSpeak ? w.en : null, e: w.ex ? `_${w.ex}_` : '' };
  if (kind === 'reverse') return { ...base, t: 'mc', q: L(`How do you say **${w.es}** in English?`, `¿Cómo se dice **${w.es}** en inglés?`), o: [w.en, ...distractors(w, 'en', 3, rnd)], e: w.ex ? `_${w.ex}_` : '' };
  if (kind === 'listen') return { ...base, t: 'listen', say: w.en, q: L('Which word do you hear?', '¿Qué palabra oyes?'), o: [w.en, ...distractors(w, 'en', 3, rnd)], e: `**${w.en}** /${w.ipa}/ = ${w.es}` };
  if (kind === 'spell') return { ...base, t: 'tr', q: `${w.es}`, ins: L('Write it in English', 'Escríbelo en inglés'), a: [w.en], e: `/${w.ipa}/ · _${w.ex}_` };
  if (kind === 'context' && w.ex && new RegExp(`\\b${w.en.split(' ')[0]}`, 'i').test(w.ex)) {
    const re = new RegExp(`\\b${w.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'i');
    const m = w.ex.match(re);
    if (m) return { ...base, t: 'mc', q: w.ex.replace(m[0], '___'), o: [m[0], ...distractors(w, 'en', 3, rnd)], ins: L('Complete with the right word', 'Completa con la palabra adecuada'), e: `${w.en} = ${w.es}` };
  }
  return wordItem(w, 'meaning', rnd);
}
// Pick exercise types that fit how well the word is known: recognition first, recall later.
export function vocabItems(words, rnd = Math.random) {
  return words.map(w => {
    const s = strength(w.id);
    const kinds = s < 0.3 ? ['meaning', 'meaning', 'context', ...(canSpeak ? ['listen'] : [])] : ['reverse', 'spell', 'context', ...(canSpeak ? ['listen'] : [])];
    return wordItem(w, kinds[Math.floor(rnd() * kinds.length)], rnd);
  });
}

const gItems = (ids, n, rnd = Math.random) => sample(ids.flatMap(id => TOPICS[id].ex), n, rnd);
const withPhase = (items, phase) => items.map(x => ({ ...x, phase }));

// ——— Content cards (teaching before testing) ———
const wordCard = w => `<article class="word-card">
  <div class="wc-top"><h3 lang="en">${esc(w.en)}</h3>${sayBtn(w.en, L('Listen', 'Escuchar'))}</div>
  <p class="ipa">/${esc(w.ipa)}/ · <span>${esc(w.pos)}</span></p>
  <p class="wc-es">${esc(w.es)}</p>
  ${w.ex ? `<p class="wc-ex" lang="en">${esc(w.ex)} ${sayBtn(w.ex, L('Listen to the example', 'Escuchar el ejemplo'))}</p>` : ''}
</article>`;

export function topicBody(t, { compact = false } = {}) {
  const tbl = t.table ? `<div class="tw"><table><thead><tr>${t.table.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.table.rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  return `${t.explain.map(p => `<p>${md(p)}</p>`).join('')}${compact ? '' : tbl}`;
}
export function contrastBlock(t) {
  if (!t.contrast?.length) return '';
  return `<div class="contrast"><h3>${icon('alert')} ${L('Watch out, Spanish speakers', '¡Ojo! Español → inglés')}</h3>${t.contrast.map(c => `
    <div class="ct-row">${c.es ? `<p class="ct-es"><span class="flag-es">ES</span> ${esc(c.es)}</p>` : ''}
    <p class="ct-no"><span class="tag no">${icon('x')} NO</span> <s>${esc(c.wrong)}</s></p>
    <p class="ct-ok"><span class="tag ok">${icon('check')} ${L('YES', 'SÍ')}</span> <strong>${esc(c.right)}</strong> ${sayBtn(c.right)}</p>
    <p class="small">${md(c.why)}</p></div>`).join('')}</div>`;
}
export function examplesBlock(rows) {
  return `<ul class="examples">${rows.map(([en, es]) => `<li><span lang="en">${md(en)}</span> ${sayBtn(en)}${es ? `<span class="tr">${esc(es)}</span>` : ''}</li>`).join('')}</ul>`;
}

// ——— Lessons: intro → explanation → examples → guided → exercise → challenge → review → mini test ———
export function buildLesson(lessonId) {
  const l = LESSON[lessonId]; const u = UNIT[l.unit];
  const rnd = Math.random;
  const card = (phase, html) => ({ t: 'card', phase, html });
  const intro = (title, lines, extra = '') => card('intro', `<p class="eyebrow">${esc(u.level.toUpperCase())} · Unit ${u.n} · ${esc(u.title)}</p><h2>${esc(title)}</h2>
    <p class="lead">${L('By the end of this lesson you will be able to:', 'Al terminar esta lección podrás:')}</p><ul class="can">${lines.map(x => `<li>${icon('check')} ${esc(x)}</li>`).join('')}</ul>${extra}
    <p class="small">${icon('clock')} ~${l.min} min · ${L('Learn first, then practise, then check.', 'Primero aprendes, luego practicas y al final compruebas.')}</p>`);

  if (l.kind === 'vocab') {
    const ws = u.words;
    const groups = []; for (let i = 0; i < ws.length; i += 4) groups.push(ws.slice(i, i + 4));
    const pairs = sample(ws, Math.min(5, ws.length), rnd);
    return [
      intro(L(`${ws.length} words for "${u.title}"`, `${ws.length} palabras para «${u.es || u.title}»`), [L(`Understand and say ${ws.length} key words`, `Entender y pronunciar ${ws.length} palabras clave`), L('Use them in real sentences', 'Usarlas en frases reales')], `<p>${L('Tap', 'Pulsa')} ${icon('volume')} ${L('to hear each word. Say it out loud!', 'para oír cada palabra. ¡Repítela en voz alta!')}</p>`),
      ...groups.map((g, i) => card('explain', `<h2>${L('New words', 'Palabras nuevas')} <span class="muted">${i + 1}/${groups.length}</span></h2><div class="word-grid">${g.map(wordCard).join('')}</div>`)),
      card('examples', `<h2>${L('In context', 'En contexto')}</h2><p class="lead">${L('Read and listen. Can you remember what each word means?', 'Lee y escucha. ¿Recuerdas qué significa cada palabra?')}</p>${examplesBlock(ws.filter(w => w.ex).map(w => [w.ex.replace(new RegExp(`\\b(${w.en.split(' ')[0]}\\w*)`, 'i'), '**$1**'), '']))}`),
      { t: 'match', phase: 'guided', skill: 'vocabulary', p: pairs.map(w => [w.en, w.es]), key: uid(['match', u.id]), noScore: true },
      ...withPhase(sample(ws, 4, rnd).map(w => wordItem(w, 'meaning', rnd)), 'exercise'),
      ...withPhase(sample(ws, 2, rnd).map(w => wordItem(w, canSpeak ? 'listen' : 'context', rnd)), 'exercise'),
      ...withPhase(sample(ws, 3, rnd).map(w => wordItem(w, 'spell', rnd)), 'challenge'),
      card('review', `<h2>${L('Remember', 'Recuerda')}</h2><p>${L('These words are now in your review deck. You will see them again just before you forget them.', 'Estas palabras ya están en tu mazo de repaso. Volverán justo antes de que se te olviden.')}</p>
        <ul class="mini-words">${ws.map(w => `<li><b lang="en">${esc(w.en)}</b> <span>${esc(w.es)}</span></li>`).join('')}</ul>`),
      ...withPhase(sample(ws, 5, rnd).map(w => wordItem(w, sample(['reverse', 'context', 'meaning'], 1, rnd)[0], rnd)), 'test'),
    ];
  }

  if (l.kind === 'grammar') {
    const t = TOPICS[l.topic];
    const pool = shuffle(t.ex, rnd);
    const easy = pool.filter(x => ['mc', 'match'].includes(x.t));
    const hard = pool.filter(x => ['tr', 'fix', 'build', 'type'].includes(x.t));
    const guided = easy.slice(0, 2).map(x => ({ ...x, hint: x.e, e: '' }));
    const used = new Set(guided.map(x => x.key));
    // Challenge = production (translate, correct, build). Spanish→English contrasts fill any gap.
    const fromContrast = (t.contrast || []).filter(c => !/[/…]/.test(c.wrong + c.right))
      .map(c => canon(c.wrong) === canon(c.right)
        ? { t: 'fix', q: c.wrong, a: [c.right], cs: true, e: c.why, skill: 'grammar', topic: t.id, key: uid(['ct', t.id, c.wrong]) }
        : { t: 'fix', q: c.wrong, a: [c.right.replace(/[.!?]$/, '')], e: c.why, skill: 'grammar', topic: t.id, key: uid(['ct', t.id, c.wrong]) });
    const challenge = [...hard.filter(x => !used.has(x.key)), ...fromContrast].slice(0, 2); challenge.forEach(x => used.add(x.key));
    const exercise = pool.filter(x => !used.has(x.key)).slice(0, 4); exercise.forEach(x => used.add(x.key));
    let test = pool.filter(x => !used.has(x.key)).slice(0, 5);
    if (test.length < 4) test = [...test, ...sample(t.ex.filter(x => !test.includes(x)), 4 - test.length, rnd)];
    return [
      intro(t.title, [t.sum], `<p class="muted">${esc(t.es)}</p>`),
      card('explain', `<h2>${esc(t.title)}</h2>${topicBody(t)}`),
      ...(t.contrast?.length ? [card('explain', contrastBlock(t))] : []),
      card('examples', `<h2>${L('Examples', 'Ejemplos')}</h2>${examplesBlock(t.examples)}`),
      ...withPhase(guided.map(x => ({ ...x, hint: x.hint ? `${L('Hint', 'Pista')}: ${x.hint}` : '' })), 'guided'),
      ...withPhase(exercise, 'exercise'),
      ...withPhase(challenge, 'challenge'),
      card('review', `<h2>${L('Key points', 'Lo esencial')}</h2><p class="lead">${md(t.sum)}</p>${topicBody(t, { compact: true })}`),
      ...withPhase(test, 'test'),
    ];
  }

  // skills lesson
  const phr = u.phrases.map(([en, es]) => [en, es]);
  const li = u.listening;
  const clean = u.phrases.filter(p => !/[/…]/.test(p[0]));
  const withEs = clean.filter(p => p[1]);
  return [
    intro(L('Real English', 'Inglés real'), u.can),
    card('explain', `<h2>${L('Useful phrases', 'Frases útiles')}</h2>${examplesBlock(phr)}`),
    card('examples', `<h2>${L('Dialogue', 'Diálogo')}</h2>${sayBtn(u.dialogue.map(d => d[1]).join(' '), L('Play the whole dialogue', 'Escuchar todo el diálogo'))}<dl class="dialogue">${u.dialogue.map(([who, line]) => `<div><dt>${esc(who)}</dt><dd lang="en">${esc(line)} ${sayBtn(line)}</dd></div>`).join('')}</dl>`),
    ...withPhase(li.q.map((q, i) => ({ t: 'listen', say: li.say, q: q.q, o: q.o, skill: 'listening', key: q.key, unit: u.id, noAuto: i > 0 })), 'guided'),
    ...withPhase(u.reading.q.map(q => ({ t: 'mc', q: q.q, o: q.o, skill: 'reading', key: q.key, unit: u.id, ctx: { title: u.reading.title, text: u.reading.text } })), 'exercise'),
    ...withPhase([
      { t: 'dict', say: sample(u.dialogue, 1, rnd)[0][1], skill: 'listening', key: uid(['dict', u.id, rnd()]) },
      ...(withEs.length && lang() === 'es' ? [(([en, es]) => ({ t: 'tr', q: es, a: [en.replace(/[.!?]$/, '')], skill: 'writing', e: en }))(sample(withEs, 1, rnd)[0])] : [{ t: 'build', q: L('Put the words in order', 'Ordena las palabras'), a: sample(clean.length ? clean : u.phrases, 1, rnd)[0][0].replace(/[.!?]$/, ''), skill: 'writing' }]),
    ], 'challenge'),
    ...withPhase(sample(u.words, 2, rnd).map(w => wordItem(w, 'reverse', rnd)), 'review'),
    ...withPhase([...gItems(u.grammar, 3, rnd), ...sample(u.words, 2, rnd).map(w => wordItem(w, 'context', rnd))], 'test'),
  ];
}

// ——— Practice pools for the learner's reachable content ———
function reachUnits() {
  const cur = currentUnit();
  const upTo = UNITS.slice(0, UNITS.indexOf(cur) + 1).filter(u => unitState(u) !== 'locked');
  return upTo.length ? upTo : [cur];
}
const reachTopics = () => [...new Set(reachUnits().flatMap(u => u.grammar))];
const reachWords = () => {
  const seen = WORDS.filter(w => S.cards[w.id]);
  return seen.length >= 8 ? seen : reachUnits().flatMap(u => u.words);
};
const listenQ = (u, rnd) => { const q = sample(u.listening.q, 1, rnd)[0]; return { t: 'listen', say: u.listening.say, q: q.q, o: q.o, skill: 'listening', key: q.key, unit: u.id }; };
const readQ = (u, rnd, n = 1) => sample(u.reading.q, n, rnd).map(q => ({ t: 'mc', q: q.q, o: q.o, skill: 'reading', key: q.key, unit: u.id, ctx: { title: u.reading.title, text: u.reading.text } }));

export function quickSession(rnd = Math.random) {
  const units = reachUnits(); const u = sample(units, 1, rnd)[0];
  const weakWords = reachWords().sort((a, b) => strength(a.id) - strength(b.id)).slice(0, 12);
  return [
    ...vocabItems(sample(weakWords, 3, rnd), rnd),
    ...gItems(reachTopics(), 3, rnd),
    listenQ(u, rnd),
    ...readQ(u, rnd, 1),
    ...gItems(reachTopics(), 1, rnd).map(x => x.t === 'mc' ? x : { ...x, phase: 'challenge' }),
  ];
}
export function longSession(rnd = Math.random) {
  const units = reachUnits(); const [u1, u2] = sample(units, 2, rnd).concat(units);
  const due = dueIds().slice(0, 6).map(id => WORD[id]).filter(Boolean);
  const vocab = due.length >= 4 ? due : sample(reachWords(), 6, rnd);
  return [
    { t: 'card', html: `<h2>${icon('vocab')} ${L('Vocabulary', 'Vocabulario')}</h2><p>${L('Warm up with words you are learning.', 'Calienta con palabras que estás aprendiendo.')}</p>` },
    ...vocabItems(vocab, rnd),
    { t: 'card', html: `<h2>${icon('grammar')} ${L('Grammar', 'Gramática')}</h2><p>${L('Mixed grammar from your units.', 'Gramática mezclada de tus unidades.')}</p>` },
    ...gItems(reachTopics(), 7, rnd),
    { t: 'card', html: `<h2>${icon('listen')} Listening</h2><p>${L('Listen as many times as you need.', 'Escucha tantas veces como necesites.')}</p>` },
    listenQ(u1, rnd), listenQ(u2, rnd),
    { t: 'card', html: `<h2>${icon('read')} Reading</h2><p>${L('Read the text, then answer.', 'Lee el texto y responde.')}</p>` },
    ...readQ(u1, rnd, 3),
    { t: 'card', html: `<h2>${icon('mistakes')} ${L('Review', 'Repaso')}</h2><p>${L('Finally, items you got wrong before.', 'Por último, cosas que fallaste antes.')}</p>` },
    ...mistakeItems(4),
  ].filter(Boolean);
}

export function dailyChallenge(date = dayKey()) {
  const rnd = seeded('daily' + date + S.level);
  const units = reachUnits(); const u = units[Math.floor(rnd() * units.length)];
  const clean = u.phrases.filter(p => !/[/…]/.test(p[0]));
  const writeP = clean.filter(p => p[1]);
  return [
    { t: 'card', html: `<p class="eyebrow">${icon('flame')} ${L('Daily challenge', 'Reto diario')} · ${date}</p><h2>${L('11 questions, all skills', '11 preguntas, todas las destrezas')}</h2><ul class="can"><li>5 × ${L('vocabulary', 'vocabulario')}</li><li>3 × ${L('grammar', 'gramática')}</li><li>1 × listening</li><li>1 × reading</li><li>1 × ${L('writing challenge', 'reto de escritura')}</li></ul><p class="small">${L('Same challenge all day: come back if you leave.', 'Es el mismo reto todo el día: puedes volver si sales.')}</p>` },
    ...vocabItems(sample(reachWords(), 5, rnd), rnd),
    ...gItems(reachTopics(), 3, rnd),
    listenQ(u, rnd),
    ...readQ(u, rnd, 1),
    writeP.length && lang() === 'es'
      ? (([en, es]) => ({ t: 'tr', q: es, a: [en.replace(/[.!?]$/, '')], skill: 'writing', e: en }))(writeP[Math.floor(rnd() * writeP.length)])
      : { t: 'build', q: L('Put the words in order', 'Ordena las palabras'), a: (clean.length ? clean : u.phrases)[Math.floor(rnd() * (clean.length || u.phrases.length))][0].replace(/[.!?]$/, ''), skill: 'writing' },
  ];
}

export function examSession(n, rnd = Math.random) {
  const units = reachUnits(); const topics = reachTopics();
  const g = Math.round(n * 0.5), v = Math.round(n * 0.25), r = Math.max(1, Math.round(n * 0.15)), li = Math.max(1, n - g - v - r);
  const items = [
    ...gItems(topics, g, rnd).filter(x => x.t !== 'match'),
    ...vocabItems(sample(reachWords(), v, rnd), rnd).map(x => x.t === 'listen' ? wordItem(WORD[x.word], 'reverse', rnd) : x),
    ...sample(units, r, rnd).flatMap(u => readQ(u, rnd, 1)),
    ...(canSpeak ? Array.from({ length: li }, () => listenQ(sample(units, 1, rnd)[0], rnd)) : gItems(topics, li, rnd)),
  ];
  if (items.length < n) items.push(...gItems(topics, n - items.length, rnd).filter(x => x.t !== 'match'));
  return shuffle(items, rnd).slice(0, n);
}

export function mistakeItems(n = 20) {
  const seen = new Set();
  return S.mistakes.log.filter(m => !m.fixed && m.item && !seen.has(m.key) && seen.add(m.key)).slice(0, n).map(m => ({ ...m.item, key: m.key }));
}
export function topicItems(id, n = 10) { return sample(TOPICS[id].ex, n); }
export const levelTopics = lv => topicsOf(lv);
export { reachUnits };

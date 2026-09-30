import { esc, md, canon, debounce } from '../core/util.js';
import { L, lang } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S, save, itemScore, markDone, addXP, answer } from '../core/store.js';
import { runSession, sayBtn } from '../core/session.js';
import { canSpeak, canRecognize, canRecord, speak, recognize, startRecording, stopSpeaking } from '../core/speech.js';
import { checkWriting, writingScore, MECH_TEXT } from '../core/writing-check.js';
import { ai } from '../core/ai.js';
import { unitState } from '../core/path.js';
import { LEVELS, LEVEL, UNIT, unitsOf } from '../data/index.js';
import { h1, bar, toast } from './ui.js';

const META = {
  listening: { icon: 'listen', en: 'Listening', es: 'Listening', lead: ['Short recordings at every level. Listen, answer, then check the transcript.', 'Audios cortos de todos los niveles. Escucha, responde y luego revisa la transcripción.'] },
  reading: { icon: 'read', en: 'Reading', es: 'Lectura', lead: ['Texts that grow in length and difficulty, with vocabulary help and comprehension questions.', 'Textos que crecen en longitud y dificultad, con ayuda de vocabulario y preguntas de comprensión.'] },
  writing: { icon: 'write', en: 'Writing', es: 'Escritura', lead: ['Guided writing tasks with instant feedback on typical mistakes and a model answer.', 'Tareas guiadas con corrección inmediata de errores típicos y un texto modelo.'] },
  speaking: { icon: 'speak', en: 'Speaking', es: 'Speaking', lead: ['Repeat after the model and answer open questions out loud.', 'Repite después del modelo y responde preguntas en voz alta.'] },
};

// ——— Lists ———
export function skillList(root, { skill }) {
  const m = META[skill];
  root.innerHTML = `${h1(L(m.en, m.es), { lead: L(...m.lead) })}
  ${skill === 'speaking' ? capNote() : ''}
  ${skill === 'writing' ? `<a class="link-card wide" href="#/classic/tareas">${icon('classic')}<b>${L('Class tasks (A1): 10 sentences with automatic checking', 'Tareas de clase (A1): 10 frases con corrección automática')}</b><span>Present Simple · can · to be</span></a>` : ''}
  ${LEVELS.filter(l => !l.soon).map(lv => `<section class="g-level"><h2><span class="level-chip"><b>${lv.code}</b> ${esc(L(lv.name, lv.es))}</span></h2>
    <div class="grid">${unitsOf(lv.id).map(u => {
      const sc = S.items[`${skill}:${u.id}`]; const locked = unitState(u) === 'locked';
      const t = skill === 'reading' ? u.reading.title : skill === 'writing' ? L(u.writing.p, u.writing.es || u.writing.p) : skill === 'speaking' ? L(u.speaking.p, u.speaking.es || u.speaking.p) : u.title;
      return `<a class="link-card${sc ? ' done' : ''}${locked ? ' dim' : ''}" href="#/${skill}/${u.id}"><small>${lv.code} · ${L('Unit', 'Unidad')} ${u.n}${locked ? ` · ${icon('lock')}` : ''}</small><b>${esc(t)}</b>${sc != null ? `${bar(sc)}<span class="small">${Math.round(sc * 100)}%</span>` : `<span class="small muted">${L('Not started', 'Sin empezar')}</span>`}</a>`;
    }).join('')}</div></section>`).join('')}`;
}

function capNote() {
  if (canRecognize) return `<p class="panel note">${icon('info')} ${L('Your browser can recognise speech. Recognition is approximate: use it as a guide, not a grade.', 'Tu navegador puede reconocer la voz. El reconocimiento es aproximado: úsalo como guía, no como nota.')}</p>`;
  if (canRecord) return `<p class="panel note">${icon('info')} ${L('Your browser cannot transcribe speech, but you can record yourself and compare with the model. For automatic feedback, use Chrome, Edge or Safari.', 'Tu navegador no transcribe la voz, pero puedes grabarte y compararte con el modelo. Para corrección automática usa Chrome, Edge o Safari.')}</p>`;
  return `<p class="panel note">${icon('info')} ${L('Microphone features are not available in this browser. You can still listen to the models and practise out loud.', 'Tu navegador no permite usar el micrófono. Aun así puedes escuchar los modelos y practicar en voz alta.')}</p>`;
}

// ——— Listening ———
export function listening(root, { id }) {
  const u = UNIT[id]; if (!u) { location.hash = '#/listening'; return; }
  const li = u.listening;
  const sentences = li.say.split(/(?<=[.!?])\s+/).filter(s => s.split(' ').length >= 4 && s.split(' ').length <= 14);
  runSession(root, {
    title: `Listening · ${u.title}`, exitHref: '#/listening',
    items: [
      { t: 'card', html: `<p class="eyebrow">${LEVEL[u.level].code} · ${esc(u.title)}</p><h2>${icon('listen')} ${L('Listen and answer', 'Escucha y responde')}</h2>
        <p>${L('Listen as many times as you need. Use the slow button if it is too fast. The transcript appears after you answer.', 'Escucha tantas veces como necesites. Usa el botón lento si va muy rápido. La transcripción aparece al responder.')}</p>
        ${canSpeak ? `<div class="listen-row"><button type="button" class="play-big" data-say="${esc(li.say)}" aria-label="${L('Play audio', 'Reproducir audio')}">${icon('volume')}</button><button type="button" class="play-slow" data-say="${esc(li.say)}" data-rate="0.7">${icon('slow')}<span>${L('Slow', 'Lento')}</span></button></div>` : `<p class="note">${L('Audio is not available in this browser; the questions will show the transcript.', 'Tu navegador no reproduce audio; las preguntas mostrarán la transcripción.')}</p>`}` },
      ...li.q.map((q, i) => ({ t: 'listen', say: li.say, q: q.q, o: q.o, skill: 'listening', key: q.key, noAuto: true })),
      ...(sentences.length ? [{ t: 'dict', say: sentences[Math.floor(Math.random() * sentences.length)], skill: 'listening', noScore: false }] : []),
    ],
    onFinish(s) {
      itemScore(`listening:${u.id}`, s.score); markDone('listening');
      return { title: L('Listening complete', 'Listening completado'), extra: `<details class="panel transcript" open><summary>${L('Transcript', 'Transcripción')}</summary><p lang="en">${esc(li.say)}</p>${sayBtn(li.say)}</details>`, nextHref: '#/listening', nextLabel: L('More listening', 'Más listening') };
    },
  });
}

// ——— Reading: text → vocabulary → questions → score ———
export function reading(root, { id }) {
  const u = UNIT[id]; if (!u) { location.hash = '#/reading'; return; }
  const r = u.reading;
  const words = r.text.split(/\s+/).length;
  let html = esc(r.text);
  Object.entries(r.gloss).sort((a, b) => b[0].length - a[0].length).forEach(([w, m]) => {
    html = html.replace(new RegExp(`\\b(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i'), `<button type="button" class="gloss" aria-expanded="false" data-m="${esc(m)}">$1</button>`);
  });
  root.innerHTML = `${h1(r.title, { eyebrow: `${LEVEL[u.level].code} · ${L('Reading', 'Lectura')} · ${words} ${L('words', 'palabras')} · ~${Math.max(1, Math.round(words / 120))} min`, back: '#/reading' })}
  <article class="panel reading-text" lang="en"><p>${html.replace(/\n+/g, '</p><p>')}</p>
    <div class="row">${sayBtn(r.text, L('Listen to the text', 'Escuchar el texto'))}<span class="small muted">${L('Tap the underlined words to see what they mean.', 'Toca las palabras subrayadas para ver su significado.')}</span></div></article>
  <section class="panel"><h2>${L('Key vocabulary', 'Vocabulario clave')}</h2><dl class="glossary">${Object.entries(r.gloss).map(([w, m]) => `<div><dt lang="en">${esc(w)}</dt><dd>${esc(m)}</dd></div>`).join('')}</dl></section>
  <div class="center"><button type="button" class="btn primary lg" id="go">${L('Answer the questions', 'Responder las preguntas')} ${icon('arrow')}</button></div>`;
  root.querySelectorAll('.gloss').forEach(b => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') === 'true';
    root.querySelectorAll('.gloss[aria-expanded=true]').forEach(x => { x.setAttribute('aria-expanded', 'false'); x.querySelector('.gl-pop')?.remove(); });
    if (!open) { b.setAttribute('aria-expanded', 'true'); b.insertAdjacentHTML('beforeend', `<span class="gl-pop" role="tooltip">${esc(b.dataset.m)}</span>`); }
  }));
  root.querySelector('#go').addEventListener('click', () => {
    const g = Object.entries(r.gloss);
    runSession(root, {
      title: r.title, exitHref: `#/reading/${id}`,
      items: [
        ...(g.length >= 3 ? [{ t: 'match', p: g.slice(0, 5), skill: 'vocabulary', q: L('Vocabulary from the text', 'Vocabulario del texto'), noScore: true }] : []),
        ...r.q.map(q => ({ t: 'mc', q: q.q, o: q.o, skill: 'reading', key: q.key, ctx: { title: r.title, text: r.text } })),
      ],
      onFinish(s) { itemScore(`reading:${u.id}`, s.score); markDone('reading'); return { title: L('Reading complete', 'Lectura completada'), nextHref: '#/reading', nextLabel: L('More reading', 'Más lecturas') }; },
    });
  });
}

// ——— Writing ———
export function writing(root, { id }) {
  const u = UNIT[id]; if (!u) { location.hash = '#/writing'; return; }
  const w = u.writing;
  const key = `w:${u.id}`;
  root.innerHTML = `${h1(L('Writing', 'Escritura'), { eyebrow: `${LEVEL[u.level].code} · ${esc(u.title)}`, back: '#/writing' })}
  <section class="panel task">
    <h2 lang="en">${esc(w.p)}</h2>${w.es && lang() === 'es' ? `<p class="muted">${esc(w.es)}</p>` : ''}
    <ul class="reqs" id="reqs">${w.need.map(n => `<li data-l="${esc(n.l)}">${icon('check')} ${esc(n.l)}</li>`).join('')}<li>${icon('check')} ${L(`At least ${w.min} words`, `Al menos ${w.min} palabras`)}</li></ul>
    <label class="field" for="txt"><span class="sr">${L('Your text', 'Tu texto')}</span></label>
    <textarea id="txt" rows="8" lang="en" spellcheck="false" placeholder="${L('Write here…', 'Escribe aquí…')}">${esc(S.drafts[key] || '')}</textarea>
    <div class="row between"><span class="small muted" id="wc" aria-live="polite"></span><span class="small muted" id="saved"></span></div>
    <div class="row"><button type="button" class="btn primary" id="check">${icon('check')} ${L('Check my writing', 'Revisar mi texto')}</button>
      ${ai.can('writingFeedback') ? `<button type="button" class="btn ghost" id="ai">${icon('sparkle')} ${L('AI feedback', 'Corrección con IA')}</button>` : ''}</div>
  </section>
  <section id="fb" aria-live="polite"></section>
  <details class="panel model"><summary>${L('See a model answer', 'Ver un texto modelo')}</summary><p lang="en">${esc(w.model).replace(/\n/g, '<br>')}</p>${sayBtn(w.model.replace(/\n/g, ' '), L('Listen', 'Escuchar'))}</details>`;
  const ta = root.querySelector('#txt'), wc = root.querySelector('#wc');
  const persist = debounce(() => { S.drafts[key] = ta.value; save(); root.querySelector('#saved').textContent = L('Draft saved', 'Borrador guardado'); }, 600);
  const count = () => { const n = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; wc.textContent = `${n} / ${w.min} ${L('words', 'palabras')}`; };
  ta.addEventListener('input', () => { count(); persist(); });
  count();
  root.querySelector('#check').addEventListener('click', () => {
    const r = checkWriting(ta.value, { need: w.need, min: w.min, level: u.level });
    if (!r.words) { root.querySelector('#fb').innerHTML = `<p class="panel note">${L('Write something first!', '¡Primero escribe algo!')}</p>`; return; }
    const sc = writingScore(r);
    const firstTime = !(S.items[`writing:${u.id}`] > 0);
    itemScore(`writing:${u.id}`, sc); markDone('writing'); answer('writing', sc >= 0.6);
    if (firstTime) addXP(30);
    root.querySelectorAll('#reqs li[data-l]').forEach(li => { const n = r.needs.find(x => x.l === li.dataset.l); li.className = n?.ok ? 'ok' : 'no'; li.innerHTML = `${icon(n?.ok ? 'check' : 'x')} ${esc(li.dataset.l)}`; });
    root.querySelector('#reqs li:last-child').className = r.minOk ? 'ok' : 'no';
    root.querySelector('#fb').innerHTML = `<div class="panel feedback">
      <h2>${L('Feedback', 'Corrección')}</h2>
      <p>${r.words} ${L('words', 'palabras')} · ${r.sentences} ${L('sentences', 'frases')} ${r.minOk ? '' : `· <span class="warn-txt">${L(`write at least ${w.min}`, `escribe al menos ${w.min}`)}</span>`}</p>
      ${r.issues.length ? `<h3>${L('Mistakes to fix', 'Errores que corregir')}</h3><ul class="issues">${r.issues.map(i => `<li><p><span class="tag no">${icon('x')}</span> <s>${esc(i.found.join(' · '))}</s></p><p><span class="tag ok">${icon('check')}</span> <strong>${esc(i.right)}</strong></p><p class="small">${md(i.es)}</p></li>`).join('')}</ul>` : ''}
      ${r.mech.length ? `<h3>${L('Punctuation & capitals', 'Puntuación y mayúsculas')}</h3><ul class="issues">${r.mech.map(m => `<li><p>${icon('alert')} ${esc(L(...MECH_TEXT[m.k]))}${m.found ? ` <span class="muted">(${esc(m.found.join(', '))})</span>` : ''}</p></li>`).join('')}</ul>` : ''}
      ${!r.issues.length && !r.mech.length ? `<p class="ok-txt">${icon('check')} ${L('No typical mistakes found. Compare with the model answer to improve style and vocabulary.', 'No se detectan errores típicos. Compara con el texto modelo para mejorar estilo y vocabulario.')}</p>` : ''}
      <p class="small muted">${L('This automatic check looks for common learner mistakes and task requirements. It cannot catch every error.', 'Esta revisión automática busca errores frecuentes y requisitos de la tarea. No detecta todos los errores.')}</p>
      <p><b>${L('Task score', 'Puntuación de la tarea')}: ${Math.round(sc * 100)}%</b></p></div>`;
    root.querySelector('#fb').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  root.querySelector('#ai')?.addEventListener('click', async e => {
    e.target.disabled = true;
    try { const res = await ai.call('writingFeedback', ta.value, { prompt: w.p, level: u.level }); root.querySelector('#fb').insertAdjacentHTML('beforeend', `<div class="panel"><h2>AI</h2><p>${esc(res.summary || '')}</p></div>`); }
    catch (err) { toast(esc(err.message), { icon: 'alert' }); }
    e.target.disabled = false;
  });
}

// ——— Speaking ———
export function speaking(root, { id }) {
  const u = UNIT[id]; if (!u) { location.hash = '#/speaking'; return; }
  const sp = u.speaking;
  const scores = {};
  root.innerHTML = `${h1(L('Speaking', 'Speaking'), { eyebrow: `${LEVEL[u.level].code} · ${esc(u.title)}`, back: '#/speaking' })}
  ${capNote()}
  <section class="panel"><h2>1. ${L('Repeat after me', 'Repite después de mí')}</h2>
    <p class="muted">${L('Listen, then say the sentence. Focus on rhythm and the stressed words.', 'Escucha y repite la frase. Fíjate en el ritmo y en las palabras acentuadas.')}</p>
    <ol class="repeat">${sp.repeat.map((t, i) => `<li data-i="${i}"><p lang="en" class="rp-target">${esc(t)}</p>
      <div class="row">${sayBtn(t, L('Listen', 'Escuchar'))}${sayBtn(t, L('Listen slowly', 'Escuchar despacio'), true)}${micBtn(`rp-${i}`)}</div><div class="rp-out" aria-live="polite"></div></li>`).join('')}</ol>
  </section>
  <section class="panel"><h2>2. ${L('Your turn', 'Tu turno')}</h2>
    <p class="task-p" lang="en"><b>${esc(sp.p)}</b></p>${sp.es && lang() === 'es' ? `<p class="muted">${esc(sp.es)}</p>` : ''}
    <p class="small">${L('Try to use', 'Intenta usar')}: ${sp.use.map(x => `<span class="chip">${esc(x.split('|')[0])}</span>`).join(' ')}</p>
    <div class="row">${micBtn('free', true)}</div>
    <div id="free-out" aria-live="polite"></div>
    <details class="model"><summary>${L('Listen to a model answer', 'Escuchar una respuesta modelo')}</summary><p lang="en">${esc(sp.model)}</p>${sayBtn(sp.model)}</details>
  </section>
  <div class="center"><button type="button" class="btn primary lg" id="done">${icon('check')} ${L('Finish speaking practice', 'Terminar la práctica')}</button></div>`;

  let active = null;
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-mic]'); if (!b) return;
    const k = b.dataset.mic;
    if (active) { active.stop(); return; }
    stopSpeaking();
    const out = k === 'free' ? root.querySelector('#free-out') : b.closest('li').querySelector('.rp-out');
    const target = k === 'free' ? null : sp.repeat[+k.split('-')[1]];
    if (canRecognize) {
      const t0 = Date.now();
      setMic(b, true);
      active = recognize({
        continuous: k === 'free',
        onresult: txt => { out.innerHTML = `<p class="transcript-live">“${esc(txt)}”</p>`; },
        onerror: err => { out.innerHTML = `<p class="note">${icon('alert')} ${err === 'not-allowed' ? L('Microphone permission was denied.', 'Se ha denegado el permiso del micrófono.') : L('Could not hear you. Try again.', 'No te he oído bien. Inténtalo de nuevo.')}</p>`; },
        onend: txt => {
          setMic(b, false); active = null;
          if (!txt) return;
          if (target) { const r = compare(target, txt); scores[k] = r.score; out.innerHTML = r.html; }
          else { const r = freeFeedback(txt, (Date.now() - t0) / 1000, sp, u.level); scores.free = r.score; out.innerHTML = r.html; }
        },
      });
      if (!active) setMic(b, false);
    } else if (canRecord) {
      try {
        setMic(b, true);
        const rec = await startRecording();
        active = { stop: async () => { const url = await rec.stop(); setMic(b, false); active = null; scores[k] = 0.6;
          out.innerHTML = `<div class="rec-play"><p class="small">${L('Your recording', 'Tu grabación')}:</p><audio controls src="${url}"></audio>${target ? `<p class="small">${L('Compare with the model', 'Compárala con el modelo')}: ${sayBtn(target)}</p>` : ''}</div>`; } };
      } catch (_) { setMic(b, false); out.innerHTML = `<p class="note">${icon('alert')} ${L('Microphone permission was denied.', 'Se ha denegado el permiso del micrófono.')}</p>`; }
    }
  });
  root.querySelector('#done').addEventListener('click', () => {
    const vals = Object.values(scores);
    const sc = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.3;
    const first = !(S.items[`speaking:${u.id}`] > 0);
    itemScore(`speaking:${u.id}`, sc); markDone('speaking'); answer('speaking', sc >= 0.6);
    if (first) addXP(30);
    toast(L('Speaking practice saved', 'Práctica de speaking guardada'), { icon: 'check' });
    location.hash = `#/unit/${u.id}`;
  });
}

const micBtn = (k, big) => (canRecognize || canRecord)
  ? `<button type="button" class="btn ${big ? 'primary' : 'ghost'} mic" data-mic="${k}" aria-pressed="false">${icon('speak')} <span>${canRecognize ? L('Speak', 'Hablar') : L('Record', 'Grabar')}</span></button>` : '';
function setMic(b, on) {
  b.classList.toggle('rec', on); b.setAttribute('aria-pressed', on);
  b.querySelector('span').textContent = on ? L('Stop', 'Parar') : (canRecognize ? L('Speak', 'Hablar') : L('Record', 'Grabar'));
}

// Word-level comparison between the target sentence and what the browser recognised.
function compare(target, said) {
  const heard = new Set(canon(said).split(' '));
  const words = target.split(/\s+/);
  const marks = words.map(w => ({ w, ok: heard.has(canon(w)) || canon(w).split(' ').every(p => heard.has(p)) }));
  const score = marks.filter(m => m.ok).length / marks.length;
  return { score, html: `<p class="said">${L('I heard', 'He oído')}: “${esc(said)}”</p>
    <p class="diff" lang="en">${marks.map(m => `<span class="${m.ok ? 'hit' : 'miss'}">${esc(m.w)}${m.ok ? '' : `<span class="sr"> (${L('not recognised', 'no reconocida')})</span>`}</span>`).join(' ')}</p>
    <p><b>${Math.round(score * 100)}%</b> ${L('of the words recognised', 'de las palabras reconocidas')}. ${score >= 0.85 ? L('Very clear!', '¡Muy claro!') : L('Listen again to the words marked and repeat.', 'Escucha otra vez las palabras marcadas y repite.')}</p>` };
}

function freeFeedback(txt, sec, sp, level) {
  const words = txt.split(/\s+/).filter(Boolean).length;
  const wpm = Math.round(words / Math.max(1, sec) * 60);
  const low = txt.toLowerCase();
  const used = sp.use.map(u => ({ label: u.split('|')[0], ok: u.split('|').some(x => low.includes(x.toLowerCase())) }));
  const gram = checkWriting(txt, { level }).issues;
  const vocab = used.filter(x => x.ok).length / used.length;
  const fluency = Math.min(1, words / 25) * (wpm > 40 ? 1 : 0.7);
  const grammar = gram.length ? Math.max(0.3, 1 - gram.length * 0.25) : 1;
  const score = (vocab + fluency + grammar) / 3;
  const row = (en, es, v, note) => `<li><span>${L(en, es)}</span>${bar(v)}<span class="small">${note}</span></li>`;
  return { score, html: `<p class="said">${L('I heard', 'He oído')}: “${esc(txt)}”</p>
    <ul class="speak-fb">
      ${row('Fluency', 'Fluidez', fluency, `${words} ${L('words', 'palabras')} · ~${wpm} ${L('words/min', 'palabras/min')}`)}
      ${row('Vocabulary', 'Vocabulario', vocab, used.map(x => `${x.ok ? '✓' : '✗'} ${esc(x.label)}`).join(' · '))}
      ${row('Grammar', 'Gramática', grammar, gram.length ? gram.map(g => `${esc(g.wrong)} → <b>${esc(g.right)}</b>`).join('; ') : L('No typical mistakes detected', 'Sin errores típicos detectados'))}
    </ul>
    <p class="small muted">${L('Pronunciation is estimated in part 1 (repeat after me): the browser only reports what it understood.', 'La pronunciación se estima en la parte 1 (repite después de mí): el navegador solo indica lo que entendió.')}</p>` };
}

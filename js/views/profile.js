import { esc } from '../core/util.js';
import { L } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { S, save, streak, reset, exportState, importState } from '../core/store.js';
import { englishVoices, canSpeak, speak } from '../core/speech.js';
import { areas, skillProgress, SKILL_META, currentUnit, nextLesson, wordsLearned } from '../core/path.js';
import { LEVELS, LEVEL } from '../data/index.js';
import { h1 } from './ui.js';
import { applyTheme } from '../core/theme.js';

export default function profile(root) {
  const lv = LEVEL[S.level];
  const ar = areas();
  const prog = skillProgress();
  const sorted = Object.entries(prog).sort((a, b) => a[1] - b[1]);
  const u = currentUnit(); const nl = nextLesson(u);
  const voices = englishVoices();
  root.innerHTML = `${h1(L('Profile', 'Perfil'))}
  <section class="panel profile-top">
    <div class="avatar" aria-hidden="true">${esc((S.name || '?').slice(0, 1).toUpperCase())}</div>
    <div class="grow"><label class="field"><span>${L('Your name', 'Tu nombre')}</span><input id="name" value="${esc(S.name)}" maxlength="30" autocomplete="given-name"></label>
      <p class="muted">${lv.code} · ${esc(L(lv.name, lv.es))} · ${streak()} ${L('day streak', 'días de racha')} · ${S.xp} XP · ${Object.keys(S.lessons).length} ${L('lessons', 'lecciones')} · ${wordsLearned()} ${L('words', 'palabras')}</p></div>
  </section>

  <div class="dash-cols">
    <div class="col-main">
      <section class="panel"><h2>${L('Your next goal', 'Tu próximo objetivo')}</h2>
        <p>${nl ? L(`Finish Unit ${u.n}: ${u.title}`, `Terminar la unidad ${u.n}: ${u.es || u.title}`) : L('Keep practising every day', 'Seguir practicando cada día')}</p>
        ${nl ? `<a class="btn primary" href="#/lesson/${nl.id}">${esc(L(nl.title, nl.es))} ${icon('arrow')}</a>` : ''}
        <h3>${L('Strong areas', 'Puntos fuertes')}</h3><p>${(ar.strong.length ? ar.strong.map(r => L(SKILL_META[r.s].en, SKILL_META[r.s].es)) : sorted.slice(-2).reverse().filter(x => x[1] > 0).map(([k]) => L(SKILL_META[k].en, SKILL_META[k].es))).join(', ') || L('Not enough data yet', 'Aún no hay datos suficientes')}</p>
        <h3>${L('Areas to improve', 'Áreas a mejorar')}</h3><p>${(ar.weak.length ? ar.weak.map(r => L(SKILL_META[r.s].en, SKILL_META[r.s].es)) : sorted.slice(0, 2).map(([k]) => L(SKILL_META[k].en, SKILL_META[k].es))).join(', ')}</p>
      </section>

      <section class="panel settings"><h2>${icon('settings')} ${L('Settings', 'Ajustes')}</h2>
        <fieldset><legend>${L('Daily goal', 'Objetivo diario')}</legend><div class="seg">${[5, 10, 15, 20, 30].map(m => `<label><input type="radio" name="goal" value="${m}" ${S.goal === m ? 'checked' : ''}><span>${m} min</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>${L('Interface language', 'Idioma de la interfaz')}</legend><div class="seg">${[['auto', L('Automatic (by level)', 'Automático (según nivel)')], ['es', 'Español'], ['en', 'English']].map(([v, t]) => `<label><input type="radio" name="lang" value="${v}" ${S.lang === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
          <p class="small muted">${L('Automatic: Spanish support in A1–A2, English from B1, so you stop depending on translation.', 'Automático: apoyo en español en A1–A2 e inglés desde B1, para que dejes de depender de la traducción.')}</p></fieldset>
        <fieldset><legend>${L('Theme', 'Tema')}</legend><div class="seg">${[['system', L('System', 'Sistema')], ['light', L('Light', 'Claro')], ['dark', L('Dark', 'Oscuro')]].map(([v, t]) => `<label><input type="radio" name="theme" value="${v}" ${S.theme === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>${L('Level', 'Nivel')}</legend><div class="seg">${LEVELS.filter(l => !l.soon).map(l => `<label><input type="radio" name="level" value="${l.id}" ${S.level === l.id ? 'checked' : ''}><span>${l.code}</span></label>`).join('')}</div>
          <p class="small muted">${L('Not sure?', '¿No estás seguro?')} <a href="#/placement">${L('Take the level test', 'Haz el test de nivel')}</a></p></fieldset>
        ${canSpeak ? `<fieldset><legend>${L('Voice', 'Voz')}</legend>
          <label class="field"><span class="sr">${L('English voice', 'Voz en inglés')}</span><select id="voice"><option value="">${L('Automatic', 'Automática')}</option>${voices.map(v => `<option value="${esc(v.name)}" ${S.voice === v.name ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></label>
          <label class="field"><span>${L('Speed', 'Velocidad')}: <output id="rate-o">${S.rate}</output></span><input type="range" id="rate" min="0.6" max="1.2" step="0.05" value="${S.rate}"></label>
          <button type="button" class="btn ghost sm" id="test-voice">${icon('volume')} ${L('Test voice', 'Probar voz')}</button></fieldset>` : ''}
      </section>
    </div>
    <aside class="col-side">
      <section class="panel"><h2>${L('Your data', 'Tus datos')}</h2>
        <p class="small muted">${L('Your progress is saved on this device. Export it to keep a copy or move it to another device.', 'Tu progreso se guarda en este dispositivo. Expórtalo para tener una copia o pasarlo a otro dispositivo.')}</p>
        <button type="button" class="btn ghost" id="export">${icon('download')} ${L('Export progress', 'Exportar progreso')}</button>
        <label class="btn ghost file-btn">${icon('upload')} ${L('Import progress', 'Importar progreso')}<input type="file" id="import" accept="application/json,.json" class="sr"></label>
        <textarea id="export-box" class="export-box" rows="4" readonly hidden aria-label="${L('Exported data', 'Datos exportados')}"></textarea>
        <p id="data-msg" class="small" aria-live="polite"></p>
        <hr><button type="button" class="btn danger" id="reset">${L('Reset all progress', 'Borrar todo el progreso')}</button>
        <div id="reset-confirm" hidden><p><b>${L('Are you sure? This cannot be undone.', '¿Seguro? No se puede deshacer.')}</b></p><div class="row"><button type="button" class="btn ghost" id="reset-no">${L('Cancel', 'Cancelar')}</button><button type="button" class="btn danger" id="reset-yes">${L('Yes, reset', 'Sí, borrar')}</button></div></div>
      </section>
    </aside>
  </div>`;

  const $ = s => root.querySelector(s);
  $('#name').addEventListener('change', e => { S.name = e.target.value.trim(); save(); });
  root.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', () => {
    const v = r.name === 'goal' ? +r.value : r.value;
    S[r.name] = v;
    if (r.name === 'level') S.placed = { ...(S.placed || {}), start: v, manual: true };
    save();
    if (r.name === 'theme') applyTheme();
    if (r.name === 'lang' || r.name === 'level') profile(root);
  }));
  $('#voice')?.addEventListener('change', e => { S.voice = e.target.value; save(); speak('Hello! This is my voice.'); });
  $('#rate')?.addEventListener('input', e => { S.rate = +e.target.value; $('#rate-o').textContent = S.rate; save(); });
  $('#test-voice')?.addEventListener('click', () => speak('Hello! Nice to meet you. How are you today?'));
  $('#export').addEventListener('click', () => {
    const box = $('#export-box'); box.hidden = false; box.value = exportState(); box.select();
    navigator.clipboard?.writeText(box.value).then(() => { $('#data-msg').textContent = L('Copied to the clipboard. Save it somewhere safe.', 'Copiado al portapapeles. Guárdalo en un lugar seguro.'); }, () => { $('#data-msg').textContent = L('Copy the text above and save it.', 'Copia el texto de arriba y guárdalo.'); });
  });
  $('#import').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { importState(await f.text()); $('#data-msg').textContent = L('Progress imported.', 'Progreso importado.'); setTimeout(() => location.reload(), 600); }
    catch (_) { $('#data-msg').textContent = L('That file is not a valid progress export.', 'Ese archivo no es una exportación válida.'); }
  });
  $('#reset').addEventListener('click', () => { $('#reset-confirm').hidden = false; $('#reset-no').focus(); });
  $('#reset-no').addEventListener('click', () => { $('#reset-confirm').hidden = true; });
  $('#reset-yes').addEventListener('click', () => { reset(); location.hash = '#/welcome'; location.reload(); });
}

// Single entry point for learning content. Adding a unit = add it to units-*.js (+ its words in
// vocab.js); lessons, the path, search and practice pools are derived from it automatically.
import GA from './grammar-a.js';
import GB from './grammar-b.js';
import UA from './units-a.js';
import UB from './units-b.js';
import { VOCAB, CATEGORIES } from './vocab.js';
import { CONVERTED } from './classic.js';
import { MISTAKES, TIPS } from './mistakes.js';
import { uid } from '../core/util.js';

export { CATEGORIES, MISTAKES, TIPS };

export const LEVELS = [
  { id: 'a1', code: 'A1', name: 'Beginner', es: 'Principiante',
    focus: 'Frases completas con sujeto y verbo: be, el presente simple, there is y can. Aquí se fijan los hábitos que luego cuesta corregir, así que cada lección insiste en la estructura antes que en la cantidad de vocabulario.',
    trap: { wrong: 'Does she works here?', right: "Does she work here?", why: 'La -s de tercera persona ya está en **does**; el verbo principal vuelve a su forma base.' },
    goals: ['Presentarte y hablar de ti y tu familia', 'Describir tu rutina y tu entorno', 'Pedir comida y preguntar direcciones', 'Entender frases y textos muy sencillos'] },
  { id: 'a2', code: 'A2', name: 'Elementary', es: 'Elemental',
    focus: 'Salir del presente: contar lo que pasó, lo que está pasando y lo que vas a hacer, y comparar opciones. El reto es elegir el tiempo verbal, no solo conjugarlo.',
    trap: { wrong: 'Did you saw the film?', right: "Did you see the film?", why: '**Did** ya marca el pasado. El verbo principal va en forma base, igual que después de does.' },
    goals: ['Contar experiencias pasadas', 'Hablar de planes y del futuro', 'Desenvolverte en viajes, tiendas y en el médico', 'Comparar lugares y opciones'] },
  { id: 'b1', code: 'B1', name: 'Intermediate', es: 'Intermedio',
    focus: 'Conectar el pasado con el presente y razonar: present perfect, condicionales, pasiva y opiniones justificadas. Es el nivel donde el inglés deja de ser una traducción palabra por palabra.',
    trap: { wrong: 'I live here since 2020.', right: "I've lived here since 2020.", why: 'El español usa presente (_vivo aquí desde…_), pero en inglés una situación que empezó antes y sigue va en **present perfect**.' },
    goals: ['Contar experiencias e historias', 'Desenvolverte en entrevistas y situaciones de trabajo', 'Dar opiniones y justificarlas', 'Entender las ideas principales de textos claros'] },
  { id: 'b2', code: 'B2', name: 'Upper Intermediate', es: 'Intermedio alto',
    focus: 'Matizar: deducir sobre el pasado, contar lo que dijo otra persona, plantear hipótesis y cambiar de registro. Desde B2 la teoría de gramática se lee en inglés; los contrastes con el español siguen en español.',
    trap: { wrong: 'He said me the truth.', right: "He told me the truth.", why: 'Con la persona a quien hablas se usa **tell**. _Say_ no admite la persona justo detrás.' },
    goals: ['Conversar con fluidez con hablantes nativos', 'Escribir correos profesionales y ensayos claros', 'Entender noticias, argumentos y textos complejos', 'Hacer deducciones y argumentar sobre hipótesis'] },
  { id: 'c1', code: 'C1', name: 'Advanced', es: 'Avanzado',
    focus: 'Precisión y registro: escribir con cautela, adaptar el tono a cada destinatario y entender lo que un texto da a entender sin decirlo.',
    trap: { wrong: 'Although it was late, but we stayed.', right: "Although it was late, we stayed.", why: 'En español se oye _aunque…, pero_. En inglés, un solo conector por contraste: **although** o **but**.' },
    goals: ['Escribir textos académicos y profesionales con prudencia', 'Adaptar el tono y el registro a cada destinatario', 'Captar lo implícito en textos exigentes', 'Expresar ideas con precisión y matices'] },
  { id: 'c2', code: 'C2', name: 'Proficiency', es: 'Maestría', soon: true, goals: [] },
];
export const LEVEL = Object.fromEntries(LEVELS.map(l => [l.id, l]));
export const LEVEL_IDS = LEVELS.filter(l => !l.soon).map(l => l.id);

// ——— Grammar topics (+ the original class exercises merged in) ———
export const TOPICS = Object.fromEntries([...GA, ...GB].map(t => [t.id, t]));
for (const { topic, ...ex } of CONVERTED) TOPICS[topic].ex.push({ ...ex, src: 'classic' });
for (const t of Object.values(TOPICS)) t.ex.forEach(e => { e.skill = 'grammar'; e.topic = t.id; e.key = uid([t.id, e.q, e.a, e.o]); });
export const TOPIC_LIST = Object.values(TOPICS);

// ——— Words ———
export const WORDS = [];
export const WORD = {};
for (const [unit, rows] of Object.entries(VOCAB)) {
  for (const [en, es, ipa, ex, cat, pos] of rows) {
    const w = { id: en, en, es, ipa, ex, cat, pos, unit, level: unit.slice(0, 2) };
    WORDS.push(w); WORD[en] = w;
  }
}

// ——— Units and lessons ———
export const UNITS = [...UA, ...UB];
export const UNIT = Object.fromEntries(UNITS.map(u => [u.id, u]));
export const LESSONS = [];
export const LESSON = {};
for (const u of UNITS) {
  u.words = WORDS.filter(w => w.unit === u.id);
  u.lessons = [
    { id: `${u.id}-v`, unit: u.id, kind: 'vocab', title: `Words: ${u.title}`, es: `Vocabulario: ${u.es || u.title}`, min: 8 },
    ...u.grammar.map(g => ({ id: `${u.id}-g-${g}`, unit: u.id, kind: 'grammar', topic: g, title: TOPICS[g].title, es: TOPICS[g].es, min: 10 })),
    { id: `${u.id}-s`, unit: u.id, kind: 'skills', title: 'Real English: listen & read', es: 'Inglés real: escucha y lee', min: 12 },
  ];
  u.lessons.forEach(l => { LESSONS.push(l); LESSON[l.id] = l; });
  [u.listening, u.reading].forEach((block, k) => block.q.forEach(q => {
    q.skill = k ? 'reading' : 'listening'; q.key = uid([u.id, q.q]);
  }));
}
export const unitsOf = level => UNITS.filter(u => u.level === level);
export const topicsOf = level => TOPIC_LIST.filter(t => t.level === level);
export const wordsOf = level => WORDS.filter(w => w.level === level);
export const levelIndex = id => LEVEL_IDS.indexOf(id);

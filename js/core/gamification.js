// Achievements reward learning behaviour (consistency, breadth, accuracy), not speed or rank.
import { S, save, streak } from './store.js';
import { learnedIds, isMastered } from './srs.js';
import { unitsOf, TOPICS, LEVEL_IDS } from '../data/index.js';
import { unitDone } from './path.js';

const lessonsDone = () => Object.keys(S.lessons).length;
const itemCount = k => Object.keys(S.items).filter(x => x.startsWith(k + ':')).length;

export const ACHIEVEMENTS = [
  { id: 'first-lesson', icon: 'flag', en: 'First step', es: 'Primer paso', den: 'Complete your first lesson', des: 'Completa tu primera lección', ok: () => lessonsDone() >= 1 },
  { id: 'lessons-10', icon: 'learn', en: '10 lessons completed', es: '10 lecciones', den: 'Complete 10 lessons', des: 'Completa 10 lecciones', ok: () => lessonsDone() >= 10 },
  { id: 'lessons-30', icon: 'layers', en: 'Dedicated learner', es: 'Constancia', den: 'Complete 30 lessons', des: 'Completa 30 lecciones', ok: () => lessonsDone() >= 30 },
  { id: 'words-50', icon: 'vocab', en: 'First 50 words', es: 'Primeras 50 palabras', den: 'Learn 50 words', des: 'Aprende 50 palabras', ok: () => learnedIds().length >= 50 },
  { id: 'words-100', icon: 'vocab', en: 'First 100 words', es: 'Primeras 100 palabras', den: 'Learn 100 words', des: 'Aprende 100 palabras', ok: () => learnedIds().length >= 100 },
  { id: 'mastered-25', icon: 'star', en: 'Long-term memory', es: 'Memoria a largo plazo', den: 'Master 25 words (3-week interval)', des: 'Domina 25 palabras (intervalo de 3 semanas)', ok: () => Object.keys(S.cards).filter(isMastered).length >= 25 },
  { id: 'streak-3', icon: 'flame', en: '3-day streak', es: 'Racha de 3 días', den: 'Study 3 days in a row', des: 'Estudia 3 días seguidos', ok: () => streak() >= 3 },
  { id: 'streak-7', icon: 'flame', en: '7-day streak', es: 'Racha de 7 días', den: 'Study 7 days in a row', des: 'Estudia 7 días seguidos', ok: () => streak() >= 7 },
  { id: 'streak-30', icon: 'flame', en: '30-day streak', es: 'Racha de 30 días', den: 'Study 30 days in a row', des: 'Estudia 30 días seguidos', ok: () => streak() >= 30 },
  { id: 'grammar-master', icon: 'grammar', en: 'Grammar Master', es: 'Maestro de la gramática', den: 'Score 80%+ in every grammar topic of a level', des: 'Saca 80 %+ en todos los temas de gramática de un nivel', ok: () => LEVEL_IDS.some(lv => Object.values(TOPICS).filter(t => t.level === lv).every(t => (S.topics[t.id]?.best || 0) >= 0.8)) },
  { id: 'listening-starter', icon: 'listen', en: 'Listening Starter', es: 'Buen oído', den: 'Complete 5 listening activities', des: 'Completa 5 actividades de listening', ok: () => itemCount('listening') >= 5 },
  { id: 'reader', icon: 'read', en: 'Bookworm', es: 'Ratón de biblioteca', den: 'Read 5 texts', des: 'Lee 5 textos', ok: () => itemCount('reading') >= 5 },
  { id: 'writer', icon: 'write', en: 'First draft', es: 'Primer texto', den: 'Complete a writing task', des: 'Completa una tarea de writing', ok: () => itemCount('writing') >= 1 },
  { id: 'speaker', icon: 'speak', en: 'Breaking the silence', es: 'Rompiendo el hielo', den: 'Complete a speaking task', des: 'Completa una tarea de speaking', ok: () => itemCount('speaking') >= 1 },
  { id: 'placement', icon: 'compass', en: 'Know your level', es: 'Conoce tu nivel', den: 'Take the level test', des: 'Haz el test de nivel', ok: () => !!S.placed },
  { id: 'daily', icon: 'bolt', en: 'Challenge accepted', es: 'Reto aceptado', den: 'Complete a daily challenge', des: 'Completa un reto diario', ok: () => Object.keys(S.challenges).length >= 1 },
  { id: 'fixer', icon: 'mistakes', en: 'Learning from mistakes', es: 'Aprender de los errores', den: 'Fix 10 of your mistakes', des: 'Corrige 10 de tus errores', ok: () => S.mistakes.log.filter(m => m.fixed).length >= 10 },
  { id: 'unit-a1', icon: 'trophy', en: 'A1 complete', es: 'A1 completado', den: 'Finish every A1 unit', des: 'Termina todas las unidades de A1', ok: () => unitsOf('a1').every(unitDone) },
  { id: 'xp-1000', icon: 'bolt', en: '1,000 XP', es: '1.000 XP', den: 'Earn 1,000 XP', des: 'Consigue 1.000 XP', ok: () => S.xp >= 1000 },
];

// Returns newly unlocked achievements (and stores them).
export function checkAchievements() {
  const fresh = ACHIEVEMENTS.filter(a => !S.ach[a.id] && safe(a.ok));
  if (fresh.length) { fresh.forEach(a => { S.ach[a.id] = Date.now(); }); save(); }
  return fresh;
}
const safe = f => { try { return f(); } catch (_) { return false; } };

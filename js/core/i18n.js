// Interface language follows the learner: Spanish support for A1–A2, English from B1 up,
// unless the learner picks one in the profile. Views write both strings inline: L('Review', 'Repasar').
import { S } from './store.js';

export const lang = () => (S.lang !== 'auto' ? S.lang : ['a1', 'a2'].includes(S.level) ? 'es' : 'en');
export const L = (en, es) => (lang() === 'es' && es != null ? es : en);
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

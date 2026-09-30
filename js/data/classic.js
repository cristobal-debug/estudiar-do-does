// The original "Inglés: guía y práctica" content, kept verbatim. It is converted to the
// shared exercise format below and merged into the A1 grammar topics, and it still powers
// the "Ejercicios de clase" section (tables and writing tasks) exactly as before.
export const LAB = { aff: 'Afirmativa', neg: 'Negativa', q: 'Pregunta Yes/No', wh: 'Pregunta Wh-', be: 'Verbo to be', can: 'Verbo can' };
export const TIPS = { aff: 'He, she, it: verbo + s.', neg: 'Sujeto + do / does + not + verbo base.', q: 'Do / Does + sujeto + verbo base.', wh: 'Palabra interrogativa + do / does + sujeto + verbo base.', be: 'Am / is / are; en la negativa + not; en la pregunta el verbo va antes del sujeto.', can: "Sujeto + can + verbo base, sin -s con he, she, it. Negativa: can't. Pregunta: Can + sujeto + verbo." };
export const B = [
  ['Ella tiene un ordenador nuevo.', 'aff', 'She has a new computer', 'have'],
  ['Ella no tiene un ordenador nuevo.', 'neg', "She doesn't have a new computer", 'has'],
  ['¿Ella tiene un ordenador nuevo?', 'q', 'Does she have a new computer', 'has'],
  ['Ellos no usan guantes.', 'neg', "They don't use gloves", "doesn't"],
  ['¿Ellos usan guantes?', 'q', 'Do they use gloves', 'does'],
  ['Mi hermana envía muchos emails.', 'aff', 'My sister sends a lot of emails', 'send'],
  ['¿Cómo funciona?', 'wh', 'How does it work', 'works'],
  ['¿Qué conducen?', 'wh', 'What do they drive', 'does'],
  ['Él no canta en un grupo.', 'neg', "He doesn't sing in a band", 'sings'],
  ['Ella compra pan todos los días.', 'aff', 'She buys bread every day', 'buy'],
  ['Nosotros pagamos con tarjeta.', 'aff', 'We pay by credit card', 'pays'],
  ['¿Dónde vivo?', 'wh', 'Where do I live', 'does'],
  ['¿Por qué canta él en un grupo?', 'wh', 'Why does he sing in a band', 'sings'],
  ['Mi madre no comete errores.', 'neg', "My mother doesn't make mistakes", 'do'],
  ['Estoy en casa.', 'be', "I'm at home", 'is'], ['Él es mi primo.', 'be', 'He is my cousin', 'are'],
  ['Ellos no son diferentes.', 'be', "They aren't different", "isn't"], ['¿Dónde estamos?', 'be', 'Where are we', 'is'],
  ['¿Ella es bailarina?', 'be', 'Is she a dancer', 'are'], ['Puedo ir.', 'can', 'I can go', 'cans'],
  ['Él sabe montar en bicicleta.', 'can', 'He can ride a bike', 'rides'], ['Ella no sabe esquiar.', 'can', "She can't ski", "doesn't"],
  ['¿Puedes quedarte?', 'can', 'Can you stay', 'Do'], ['Sara sabe hacer galletas.', 'can', 'Sara can make cookies', 'makes'],
  ['Sabemos escribir informes.', 'can', 'We can write reports', 'writes']];
export const F = [
  ['He ___ sing in a band.', ["don't", "doesn't"], 1, "Con he, she, it se usa doesn't."],
  ['___ she run a company?', ['Do', 'Does'], 1, 'Con he, she, it se usa does.'],
  ['They ___ a 4x4.', ['drive', 'drives'], 0, 'Con they no se añade -s.'],
  ['It ___ from China.', ['come', 'comes'], 1, 'Con it el verbo lleva -s.'],
  ["She doesn't ___ bread.", ['buy', 'buys'], 0, "Después de doesn't el verbo va en forma base."],
  ['___ you work for a big company?', ['Do', 'Does'], 0, 'Con you se usa do.'],
  ['My sister ___ more than 100 emails a day.', ['send', 'sends'], 1, 'My sister equivale a she: verbo + s.'],
  ['Does he ___ in NY?', ['live', 'lives'], 0, 'Después de does el verbo va en forma base.'],
  ['We ___ pay by credit card.', ["don't", "doesn't"], 0, "Con we se usa don't."],
  ['She ___ in the library.', ['study', 'studies'], 1, 'Consonante + y: la y cambia a -ies.'],
  ['The boy ___ bad.', ['smell', 'smells'], 1, 'The boy equivale a he: verbo + s.'],
  ['What ___ they drive?', ['do', 'does'], 0, 'Con they se usa do.'],
  ['She ___ a new computer.', ['have', 'has'], 1, 'Con she, have cambia a has.'],
  ['He ___ his homework every day.', ['do', 'does'], 1, 'Con he, do se convierte en does.'],
  ['She ___ a dancer.', ['is', 'are'], 0, 'She usa is.'], ['We ___ friends.', ['is', 'are'], 1, 'We usa are.'],
  ['___ they colleagues?', ['Is', 'Are'], 1, 'They usa are.'], ['He ___ sing opera.', ['cans', 'can'], 1, 'Can no cambia: sin -s con he, she, it.'],
  ['She ___ ski.', ["can't", "doesn't can"], 0, 'Con can no se usa do / does.'], ['___ you speak many languages?', ['Can', 'Do'], 0, 'Con can la pregunta empieza por Can.']];
export const DM = [['___ homework', 0, 'hacer los deberes'], ['___ a cake', 1, 'hacer una tarta'], ['___ a mistake', 1, 'cometer un error'], ['___ the dishes', 0, 'fregar los platos'], ['___ the bed', 1, 'hacer la cama'], ['___ exercise', 0, 'hacer ejercicio'], ['___ a decision', 1, 'tomar una decisión'], ['___ friends', 1, 'hacer amigos'], ['___ business', 0, 'hacer negocios'], ['___ a phone call', 1, 'hacer una llamada'], ['___ noise', 1, 'hacer ruido'], ['___ housework', 0, 'hacer las tareas del hogar']];
export const RV = 'accept arrive ask call change cheat clap clean close cook cry dance dream enjoy enter fail finish hate help hope jump kill kiss laugh learn like listen live look love need open pass play remember share smile start stay stop study talk text travel try use wait walk want work'.split(' ');
export const RU = { s: 'Regla general: se añade -s.', es: 'Acaba en -s, -sh, -ch, -x, -z u -o: se añade -es.', ies: 'Consonante + y: la y cambia a -ies.', ys: 'Vocal + y: se añade -s.', has: 'have es irregular: has.' };
export const t3 = v => v == 'have' ? ['has', 'has'] : /(s|sh|ch|x|z|o)$/.test(v) ? [v + 'es', 'es'] : /[^aeiou]y$/.test(v) ? [v.slice(0, -1) + 'ies', 'ies'] : [v + 's', /y$/.test(v) ? 'ys' : 's'];
export const TH = RV.concat('fly go do watch teach fix carry have'.split(' ')).map(v => { const [a, r] = t3(v); return [v, a, RU[r]]; });
export const IRR = 'be,was/were,been,ser/estar;become,became,become,convertirse;begin,began,begun,empezar;bring,brought,brought,traer;build,built,built,construir;buy,bought,bought,comprar;catch,caught,caught,atrapar;choose,chose,chosen,elegir;come,came,come,venir;cost,cost,cost,costar;do,did,done,hacer;drink,drank,drunk,beber;drive,drove,driven,conducir;eat,ate,eaten,comer;fall,fell,fallen,caer;feed,fed,fed,alimentar;find,found,found,encontrar;fly,flew,flown,volar;get,got,got,obtener;give,gave,given,dar;go,went,gone,ir;have,had,had,tener;hear,heard,heard,oír;keep,kept,kept,guardar;leave,left,left,salir / dejar;lend,lent,lent,prestar;lose,lost,lost,perder;make,made,made,hacer;meet,met,met,conocer;know,knew,known,saber;put,put,put,poner;read,read,read,leer;run,ran,run,correr;say,said,said,decir;see,saw,seen,ver;sell,sold,sold,vender;send,sent,sent,enviar;shoot,shot,shot,disparar;sleep,slept,slept,dormir;speak,spoke,spoken,hablar;spell,spelled,spelled,deletrear;spend,spent,spent,gastar;take,took,taken,tomar;tell,told,told,contar;think,thought,thought,pensar;understand,understood,understood,entender;wear,wore,worn,llevar puesto;win,won,won,ganar;write,wrote,written,escribir'.split(';').map(r => r.split(','));
export const CL = [
  ['Pasa a negativa: My English teacher is a professional.', 'be', "My English teacher isn't a professional", "aren't"],
  ['Pasa a pregunta: The dog is soft.', 'be', 'Is the dog soft', 'Are'],
  ['Pasa a negativa: We are a good class.', 'be', "We aren't a good class", "isn't"],
  ['Pasa a pregunta: She is a singer.', 'be', 'Is she a singer', 'Are'],
  ['Pasa a negativa: Spain is a world champion.', 'be', "Spain isn't a world champion", "aren't"],
  ['Pasa a afirmativa: You are not beautiful.', 'be', 'You are beautiful', 'is'],
  ['Pasa a pregunta: She is not jealous.', 'be', 'Is she jealous', 'Are'],
  ['Pasa a afirmativa: They are not bad people.', 'be', 'They are bad people', 'is'],
  ['Pasa a pregunta: My dad is not an old man.', 'be', 'Is my dad an old man', 'Are'],
  ['Pasa a negativa: She plays guitar.', 'neg', "She doesn't play guitar", 'plays'],
  ['Pasa a pregunta: They work very hard.', 'q', 'Do they work very hard', 'Does'],
  ['Pasa a negativa: My mom remembers me.', 'neg', "My mom doesn't remember me", 'remembers'],
  ['Pasa a pregunta: Charles pays the bill.', 'q', 'Does Charles pay the bill', 'pays'],
  ['Pasa a negativa: My dad runs every day.', 'neg', "My dad doesn't run every day", 'do'],
  ['Pasa a pregunta: We wait for you.', 'q', 'Do we wait for you', 'Does'],
  ['Pasa a negativa: Juan smiles when he sees Alejandra.', 'neg', "Juan doesn't smile when he sees Alejandra", 'smiles']];
export const MY = [
  ['My friends speak ___.', ['spanish', 'Spanish'], 1, 'Los idiomas llevan mayúscula.'],
  ['She is ___.', ['british', 'British'], 1, 'Las nacionalidades llevan mayúscula.'],
  ['My teacher is ___.', ['american', 'American'], 1, 'Las nacionalidades llevan mayúscula.'],
  ['They study ___ at school.', ['english', 'English'], 1, 'Los idiomas llevan mayúscula.'],
  ['We have class on ___.', ['monday', 'Monday'], 1, 'Los días de la semana llevan mayúscula.'],
  ['My birthday is in ___.', ['september', 'September'], 1, 'Los meses llevan mayúscula.'],
  ['The course starts in ___.', ['january', 'January'], 1, 'Los meses llevan mayúscula.'],
  ['Yesterday ___ went to the park.', ['i', 'I'], 1, 'El pronombre I siempre lleva mayúscula.'],
  ['We watch ___ every night.', ['tv', 'TV'], 1, 'Las siglas van en mayúsculas.'],
  ['He loves the ___.', ['nba', 'NBA'], 1, 'Las siglas van en mayúsculas.'],
  ['Send me the file ___.', ['asap', 'ASAP'], 1, 'Las siglas van en mayúsculas.'],
  ['I live in Spain___', ['.', '?'], 0, 'Una frase afirmativa termina en punto.'],
  ['Where do you live___', ['.', '?'], 1, 'Una pregunta termina en signo de interrogación, no en punto.']];

// Writing tasks with their rule-based checker (unchanged behaviour, same localStorage key 'tareas').
export const TK = [
  { t: '10 preguntas en Present Simple', n: 'No uses be ni can. Cada frase con un sujeto distinto y un verbo distinto. Cuatro deben ser preguntas Wh-.', h: ['Yes/No: Do / Does + sujeto + verbo base ?', 'Wh-: palabra interrogativa + do / does + sujeto + verbo base ?'], ex: 'Does she run a company? / Where do I live?', k: 'q', w: 4 },
  { t: '10 frases negativas en Present Simple', n: 'No uses be ni can. Cada frase con un sujeto distinto y un verbo distinto.', h: ['Sujeto + do / does + not + verbo base', "Forma corta: don't / doesn't"], ex: "She doesn't run a company.", k: 'neg' },
  { t: '10 frases afirmativas en Present Simple', n: 'No uses be ni can. Cada frase con un sujeto distinto y un verbo distinto.', h: ['Sujeto + verbo (he, she, it: verbo + s / es / ies)'], ex: 'She runs a company.', k: 'aff' },
  { t: '10 preguntas con can', n: 'Cada frase con un sujeto distinto. No repitas el verbo que va después de can. Cuatro deben ser preguntas Wh-.', h: ['Yes/No: Can + sujeto + verbo base ?', 'Wh-: palabra interrogativa + can + sujeto + verbo base ?'], ex: 'Can he sing opera? / When can I go?', k: 'can', w: 4 },
  { t: '10 frases negativas con can', n: 'Cada frase con un sujeto distinto. No repitas el verbo que va después de can.', h: ["Sujeto + can't (o cannot) + verbo base"], ex: "She can't skate.", k: 'cn' },
  { t: '10 frases afirmativas con can', n: 'Cada frase con un sujeto distinto. No repitas el verbo que va después de can.', h: ['Sujeto + can + verbo base (sin -s con he, she, it)'], ex: 'He can sing opera.', k: 'ca' },
  { t: '10 preguntas con el verbo to be', n: 'Cada frase con un sujeto distinto. Cuatro deben ser preguntas Wh-.', h: ['Yes/No: Am / Is / Are + sujeto ... ?', 'Wh-: palabra interrogativa + am / is / are + sujeto ... ?'], ex: 'Is she married? / Where are we?', k: 'bq', w: 4 }];
const BEN = /\b(am|is|are|isn't|aren't)\b/i, CAN = /\bcan(not|'t)?\b/i, WHR = /^(what|where|when|why|who|how|which|whose)\b/i;
export function chk(k, x) {
  x = x.trim().replace(/’/g, "'"); if (!x) return ['', ''];
  if (!/^[A-Z]/.test(x)) return ['no', 'Empieza con mayúscula.'];
  if (k !== 'bq' && BEN.test(x)) return ['no', 'No uses be.'];
  if (k[0] !== 'c' && CAN.test(x)) return ['no', 'No uses can.'];
  const wh = WHR.test(x);
  if (k === 'aff') { if (/\b(don't|doesn't|not)\b/i.test(x)) return ['no', 'Es afirmativa: sin not.']; return /\.$/.test(x) ? ['ok', ''] : ['no', 'Falta el punto final.']; }
  if (k === 'neg') { if (!/\b(don't|doesn't|do not|does not)\b/i.test(x)) return ['no', "Falta don't / doesn't (o do not / does not)."]; return /\.$/.test(x) ? ['ok', ''] : ['no', 'Falta el punto final.']; }
  if (k === 'cn') { if (/\b(don't|doesn't)\b/i.test(x)) return ['no', "Con can no se usa don't / doesn't."]; if (!/\b(can't|cannot|can not)\b/i.test(x)) return ['no', "Falta can't o cannot."]; return /\.$/.test(x) ? ['ok', ''] : ['no', 'Falta el punto final.']; }
  if (k === 'ca') { if (/\b(can't|cannot|not)\b/i.test(x)) return ['no', 'Es afirmativa: sin not.']; if (!/\bcan\b/i.test(x)) return ['no', 'Falta can.']; return /\.$/.test(x) ? ['ok', ''] : ['no', 'Falta el punto final.']; }
  if (!/\?$/.test(x)) return ['no', 'Falta el signo ?.'];
  if (k === 'q') return /^(do|does)\b/i.test(x) || wh && /\b(do|does)\b/i.test(x) ? ['ok', wh ? 'Wh-' : 'Yes/No'] : ['no', 'Empieza con Do / Does, o con una palabra Wh- y luego do / does.'];
  if (k === 'bq') return /^(am|is|are)\b/i.test(x) || wh && /\b(am|is|are)\b/i.test(x) ? ['ok', wh ? 'Wh-' : 'Yes/No'] : ['no', 'Empieza con Am / Is / Are, o con una palabra Wh- y luego am / is / are.'];
  return /^can\b/i.test(x) || wh && /\bcan\b/i.test(x) ? ['ok', wh ? 'Wh-' : 'Yes/No'] : ['no', 'Empieza con Can, o con una palabra Wh- y luego can.'];
}

// ——— Conversion to the shared exercise format ———
const topicOfB = t => (t === 'be' ? 'be' : t === 'can' ? 'can' : 'present-simple');
const tagOfF = e => /doesn't|does\b|-s|-ies|has/.test(e) ? (/Después de/.test(e) ? 'doesS' : 'third') : undefined;
export const CONVERTED = [
  ...B.map(([es, t, a, d]) => ({ topic: topicOfB(t), t: 'build', q: es, a, x: [d], e: TIPS[t], label: LAB[t] })),
  ...CL.map(([es, t, a, d]) => ({ topic: topicOfB(t), t: 'build', q: es, a, x: [d], e: TIPS[t], label: LAB[t] })),
  ...F.map(([q, o, c, e]) => ({ topic: /\b(is|are|Is|Are)\b/.test(o.join()) ? 'be' : /can/i.test(o.join() + q) ? 'can' : 'present-simple', t: 'mc', q, o: [o[c], ...o.filter((_, k) => k !== c)], e, m: tagOfF(e) })),
  ...DM.map(([s, c, es]) => ({ topic: 'do-make', t: 'mc', q: s, o: [['do', 'make'][c], ['do', 'make'][1 - c]], e: `${s.replace('___', ['do', 'make'][c])}: ${es}. Do es para actividades, make para crear algo.`, m: c ? 'makeDo' : undefined })),
  ...MY.map(([q, o, c, e]) => ({ topic: 'capitals', t: 'mc', q, o: [o[c], o[1 - c]], e, cs: true })),
  ...TH.slice(0, 20).map(([v, a, r]) => ({ topic: 'present-simple', t: 'type', q: `He / she / it: ${v} → ___`, a: [a], e: r })),
];

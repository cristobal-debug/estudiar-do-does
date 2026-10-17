// Generates indexable static pages per level (/english-a1/ … /english-c1/) and sitemap.xml
// from the same content the app uses. Run after editing content:  node scripts/build-seo.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { LEVELS, unitsOf, topicsOf, wordsOf } from '../js/data/index.js';

const SITE = 'https://estudiar-do-does.vercel.app';
const FREE = 'a1';                       // same rule as js/core/premium.js
const PRICE_USD = 15;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const strip = s => String(s).replace(/\*\*|_/g, '');
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(¿¡«])_(.+?)_(?=[\s.,;:!?)»]|$)/g, '$1<em>$2</em>');
const levels = LEVELS.filter(l => !l.soon);

for (const lv of levels) {
  const slug = `english-${lv.id}`;
  const free = lv.id === FREE;
  const units = unitsOf(lv.id), topics = topicsOf(lv.id), words = wordsOf(lv.id);
  const lessons = units.reduce((n, u) => n + u.lessons.length, 0);
  const title = `Inglés ${lv.code} (${lv.es}) para hispanohablantes: gramática, vocabulario y práctica | Doable English`;
  const desc = `Nivel ${lv.code} de inglés: ${units.length} unidades, ${topics.length} temas de gramática explicados para hispanohablantes y ${words.length} palabras con audio y ejemplos.${free ? ' Gratis.' : ''}`;
  const cta = free ? 'Empezar el A1 gratis' : `Ver el ${lv.code}`;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/${slug}/">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}/assets/og.png"><meta property="og:url" content="${SITE}/${slug}/">
<link rel="icon" href="../assets/icon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@1&family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/app.css">
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Course', name: `Inglés ${lv.code} · ${lv.es}`, description: desc, inLanguage: 'en', educationalLevel: `${lv.code} (MCER)`,
    isAccessibleForFree: free, ...(free ? {} : { offers: { '@type': 'Offer', category: 'Paid', price: PRICE_USD, priceCurrency: 'USD' } }),
    provider: { '@type': 'Organization', name: 'Doable English', url: SITE },
  })}</script>
</head><body class="seo">
<header class="topbar"><a class="brand" href="../"><span class="wm-d">doable</span><span class="wm-e">english</span></a>
<a class="btn primary sm" href="../#/learn/${lv.id}">${free ? 'Empezar gratis' : 'Abrir la app'}</a></header>
<main><div class="view-inner seo-page">
<nav class="level-tabs" aria-label="Niveles">${levels.map(l => `<a class="lt${l.id === lv.id ? ' on' : ''}" href="../english-${l.id}/"${l.id === lv.id ? ' aria-current="page"' : ''}><b>${l.code}</b><small>${esc(l.es)}</small></a>`).join('')}</nav>

<header class="seo-head">
  <p class="eyebrow">Nivel ${lv.code} · ${esc(lv.es)}</p>
  <h1>Inglés ${lv.code}</h1>
  <p class="seo-focus">${esc(lv.focus)}</p>
  <p class="seo-facts">${units.length} unidades · ${lessons} lecciones · ${topics.length} temas de gramática · ${words.length} palabras con audio${free ? ' · <b>gratis</b>' : ` · incluido en el curso completo (pago único de ${PRICE_USD} USD)`}</p>
  <p class="seo-ctas"><a class="btn primary lg" href="../#/learn/${lv.id}">${cta}</a> <a class="btn ghost lg" href="../#/placement">Hacer el test de nivel</a></p>
</header>

<section class="seo-split">
  <div><h2 class="kicker">Al terminar el ${lv.code} podrás</h2><ul class="can">${lv.goals.map(g => `<li>✓ ${esc(g)}</li>`).join('')}</ul></div>
  <figure class="li-trap"><figcaption>La trampa del ${lv.code}</figcaption><p lang="en"><s>${esc(lv.trap.wrong)}</s></p><p lang="en"><b>${esc(lv.trap.right)}</b></p><p class="small">${md(lv.trap.why)}</p></figure>
</section>

<section class="sect"><h2>Unidades</h2>
<ol class="seo-units">${units.map(u => `<li><span class="su-n">${String(u.n).padStart(2, '0')}</span><div>
  <h3><span lang="en">${esc(u.title)}</span>${u.es ? ` <small>${esc(u.es)}</small>` : ''}</h3>
  <p>${u.can.map(esc).join('. ')}.</p>
  <p class="small muted">Gramática: ${u.grammar.map(g => esc(topics.find(t => t.id === g)?.title || g)).join(', ')} · Lectura: <span lang="en">${esc(u.reading.title)}</span> · ${u.words.length} palabras</p>
</div></li>`).join('')}</ol></section>

<section class="sect"><h2>Gramática del ${lv.code}</h2>
<dl class="seo-topics">${topics.map(t => `<div><dt><span lang="en">${esc(t.title)}</span></dt><dd>${esc(strip(t.sum))}${t.contrast?.[0] ? `<span class="seo-ct"><s lang="en">${esc(t.contrast[0].wrong)}</s> → <b lang="en">${esc(t.contrast[0].right)}</b></span>` : ''}</dd></div>`).join('')}</dl></section>

<section class="sect"><h2>Algunas palabras del ${lv.code}</h2>
<ul class="seo-words">${units.flatMap(u => u.words.slice(0, 6)).map(w => `<li><b lang="en">${esc(w.en)}</b> <span>${esc(w.es)}</span></li>`).join('')}</ul></section>

<p class="seo-note small muted">Este nivel trabaja los contenidos centrales del ${lv.code} del Marco Común Europeo (MCER) con ${units.length} unidades. No sustituye la preparación específica de un examen oficial.</p>
<p class="center"><a class="btn primary lg" href="../#/learn/${lv.id}">${cta}</a></p>
</div><footer class="site-footer">Desarrollado por <a href="https://cristobaljeldrez.com" target="_blank" rel="noopener">cristobaljeldrez.com</a></footer></main></body></html>`;
  mkdirSync(slug, { recursive: true });
  writeFileSync(`${slug}/index.html`, html);
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
${levels.map(l => `  <url><loc>${SITE}/english-${l.id}/</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>`).join('\n')}
</urlset>
`);
console.log('SEO pages:', levels.map(l => `english-${l.id}/`).join(' '), '+ sitemap.xml');

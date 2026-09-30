// Generates indexable static pages per level (/english-a1/ … /english-c1/) and sitemap.xml
// from the same content the app uses. Run after editing content:  node scripts/build-seo.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { LEVELS, unitsOf, topicsOf, wordsOf } from '../js/data/index.js';

const SITE = 'https://estudiar-do-does.vercel.app';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const strip = s => String(s).replace(/\*\*|_/g, '');
const levels = LEVELS.filter(l => !l.soon);

for (const lv of levels) {
  const slug = `english-${lv.id}`;
  const units = unitsOf(lv.id), topics = topicsOf(lv.id), words = wordsOf(lv.id);
  const title = `Inglés ${lv.code} (${lv.es}) · Curso gratis con gramática y vocabulario | Doable English`;
  const desc = `Aprende inglés nivel ${lv.code} ${lv.name}: ${units.length} unidades, ${topics.length} temas de gramática explicados para hispanohablantes y ${words.length} palabras con pronunciación y ejemplos.`;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/${slug}/">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}/assets/og.png"><meta property="og:url" content="${SITE}/${slug}/">
<link rel="icon" href="../assets/icon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Fraunces:opsz,wght@9..144,650&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/app.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Course', name: `Inglés ${lv.code} · ${lv.name}`, description: desc, inLanguage: 'en', educationalLevel: `${lv.code} (CEFR)`, isAccessibleForFree: true, provider: { '@type': 'Organization', name: 'Doable English', url: SITE } })}</script>
</head><body>
<header class="topbar"><a class="brand" href="../"><svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--brand)"/><path d="M9 21.5c3.5 0 4-11 7.5-11s3.5 11 7 11" fill="none" stroke="var(--on-brand)" stroke-width="2.6" stroke-linecap="round"/><circle cx="9" cy="21.5" r="2.2" fill="var(--accent)"/></svg><span>Doable <b>English</b></span></a>
<a class="btn primary sm" href="../#/learn/${lv.id}">Empezar gratis</a></header>
<main><div class="view-inner">
<nav class="level-tabs" aria-label="Niveles">${levels.map(l => `<a class="lt${l.id === lv.id ? ' on' : ''}" href="../english-${l.id}/"${l.id === lv.id ? ' aria-current="page"' : ''}><b>${l.code}</b><small>${esc(l.es)}</small></a>`).join('')}</nav>
<header class="page-head"><p class="eyebrow">Nivel ${lv.code} del MCER</p><h1>Inglés ${lv.code}: ${esc(lv.name)} (${esc(lv.es)})</h1>
<p class="lead">${esc(desc)}</p><a class="btn primary lg" href="../#/learn/${lv.id}">Empezar el nivel ${lv.code}</a> <a class="btn ghost lg" href="../#/placement">Descubrir mi nivel</a></header>
<section class="panel"><h2>Al terminar el nivel ${lv.code} podrás…</h2><ul class="can">${lv.goals.map(g => `<li>✓ ${esc(g)}</li>`).join('')}</ul></section>
<h2>Unidades</h2>
${units.map(u => `<section class="panel"><h3>${u.icon} Unidad ${u.n}: ${esc(u.title)}${u.es ? ` · ${esc(u.es)}` : ''}</h3>
<ul class="can">${u.can.map(c => `<li>✓ ${esc(c)}</li>`).join('')}</ul>
<p class="small"><b>Vocabulario:</b> ${u.words.map(w => `${esc(w.en)} (${esc(w.es)})`).join(', ')}.</p>
<p class="small"><b>Lectura:</b> ${esc(u.reading.title)} · <b>Writing:</b> ${esc(u.writing.p)}</p></section>`).join('')}
<h2>Gramática ${lv.code}</h2>
<div class="grid">${topics.map(t => `<article class="link-card"><b>${esc(t.title)}</b><span>${esc(t.es)}</span><span>${esc(strip(t.sum))}</span>${t.contrast?.[0] ? `<span class="small">✗ <s>${esc(t.contrast[0].wrong)}</s> → ✓ <b>${esc(t.contrast[0].right)}</b></span>` : ''}</article>`).join('')}</div>
<p class="center"><a class="btn primary lg" href="../#/learn/${lv.id}">Practicar el nivel ${lv.code} ahora</a></p>
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

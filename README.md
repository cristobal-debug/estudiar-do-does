# Doable English

Plataforma para aprender inglés de A1 a C1, pensada para hispanohablantes.
Es un sitio estático: HTML, CSS y JavaScript con módulos ES, sin frameworks ni paso de build. Vercel lo sirve tal cual.

- **Producción:** https://estudiar-do-does.vercel.app
- **Local:** sirve la carpeta con cualquier servidor estático (XAMPP, `python3 -m http.server`). No funciona abriendo el archivo con `file://`, porque los módulos ES lo impiden.

## Qué incluye

| Área | Dónde |
|---|---|
| Dashboard con acción principal, plan de hoy, objetivo diario y semanal, repaso, reto, errores, palabra del día y consejo | `js/views/dashboard.js` |
| Ruta de aprendizaje A1–C1 (completado / actual / bloqueado; se puede abrir una unidad bloqueada) | `js/views/learn.js`, `js/core/path.js` |
| Lecciones en 8 fases: intro → explicación → ejemplos → práctica guiada → ejercicio → reto → repaso → mini test | `js/core/generate.js` (`buildLesson`) |
| Motor de ejercicios: opción múltiple, completar, traducir, corregir el error, construir la frase, emparejar, listening y dictado | `js/core/session.js` |
| Vocabulario por temas, flashcards y repetición espaciada (SM-2 simplificado) | `js/views/vocabulary.js`, `js/views/review.js`, `js/core/srs.js` |
| Gramática por nivel con contrastes español→inglés | `js/views/grammar.js`, `js/data/grammar-*.js` |
| Listening, reading, writing (corrector por reglas) y speaking (reconocimiento de voz del navegador, o grabación) | `js/views/skills.js`, `js/core/writing-check.js`, `js/core/speech.js` |
| Práctica de 5 y 20 minutos, reto diario, modo examen y "Mis errores" | `js/views/practice.js`, `js/views/mistakes.js` |
| Test de nivel adaptativo | `js/views/placement.js`, `js/data/placement.js` |
| Progreso, logros, perfil y ajustes (objetivo, idioma, tema, voz, exportar/importar) | `js/views/progress.js`, `js/views/profile.js`, `js/core/gamification.js` |
| Ejercicios de clase originales (guía, tareas, tablas de verbos, 7 modos) | `js/views/classic.js`, `js/data/classic.js` |
| Buscador global (Ctrl+K o /), PWA sin conexión y páginas SEO por nivel | `js/core/search.js`, `sw.js`, `english-*/` |

## Cómo añadir contenido

Todo el contenido vive en `js/data/`. Las lecciones, la ruta, el buscador y la práctica se derivan de él automáticamente.

- **Nueva unidad:** añade un objeto a `units-a.js` (A1–A2) o a `units-b.js` (B1–C1) con `id` (p. ej. `a1u6`), `level`, `n`, `title`, `grammar` (ids de temas), `phrases`, `dialogue`, `listening`, `reading`, `writing` y `speaking`. Después añade sus palabras en `vocab.js` con la clave del `id`.
- **Nuevo tema de gramática:** añade un objeto a `grammar-a.js` o `grammar-b.js` y referencia su `id` desde una unidad.
- **Formato de ejercicios:** en `mc`, `listen` y las preguntas de lectura, **la primera opción es la correcta** (se barajan en pantalla). `m: 'age'` enlaza el ejercicio con un error típico de `mistakes.js`, así cada fallo alimenta "Mis errores".
- **SEO:** después de cambiar contenido, ejecuta `node scripts/build-seo.mjs` para regenerar `english-a1/` … `english-c1/` y `sitemap.xml`.
- **Caché de la PWA:** sube la versión de `CACHE` en `sw.js` cuando cambie algo importante.

## Audio y pronunciación (Web Speech API)

Solo usa `speechSynthesis`, del propio navegador: es gratis, sin API externa ni backend.

- **`js/core/speech.js`:** el `speechService`, el único módulo que toca `speechSynthesis`. Ofrece `speak`, `speakSequence`, `toggle`, `pause`, `resume`, `stop`, `getVoices`, `selectVoice`, `setAccent`, `setSpeed`, `setRate`, `setPitch`, `setVolume` y `subscribe`.
  - Espera a `voiceschanged` (y además consulta varias veces, porque Safari no siempre lo emite).
  - Nunca deja sonar dos audios a la vez: cancela el anterior antes de empezar.
  - Divide los textos largos en frases.
  - Si una voz falla, reintenta con la voz por defecto del idioma.
- **`js/core/audio.js`:** los componentes (`audioBtn`, `listenPanel`, `readAlong`) y un único controlador delegado que sincroniza el estado de todos los botones (reposo, reproduciendo, en pausa) y el resaltado por frase.
- **Ajustes:** en Perfil → Audio y pronunciación (acento, voz, velocidad y volumen). Se guardan en una sola clave, `englishLearningSpeechSettings`. Solo se ofrecen los acentos que tienen voz instalada en el dispositivo.
- **Nunca suena solo:** todo audio empieza con un clic o una tecla del alumno, y se detiene al cambiar de página.
- **Sin síntesis de voz:** los botones de audio desaparecen, se muestra la transcripción con el aviso "El audio no está disponible en este navegador" y las lecciones siguen funcionando.
- **Reconocimiento de voz:** está en `js/core/recognition.js`, separado a propósito. La síntesis de voz no evalúa la pronunciación; para eso habría que conectar un proveedor en `ai.js` (`pronunciation`).

## Datos del alumno

El progreso se guarda en `localStorage` (clave `doable:v1`), y solo `js/core/store.js` lo lee y lo escribe. Para sincronizar entre dispositivos hay que sustituir `load()` y `persist()` por llamadas a un backend. El perfil ya permite exportar e importar el progreso como JSON. Las frases de las tareas originales mantienen su clave `tareas`.

## IA (preparada, no activa)

`js/core/ai.js` define el punto de extensión: corrección de writing, conversación, pronunciación y generación de ejercicios. No hay ningún proveedor conectado, así que la interfaz usa la corrección local por reglas. Para activarla, registra un proveedor que llame a **tu propio backend**; nunca pongas claves de API en el cliente.

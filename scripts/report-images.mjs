import { readFile, readdir, writeFile } from 'node:fs/promises';
const median = values => [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const summary = {};
for (const label of ['before', 'after']) {
  const groups = {};
  for (const file of await readdir(`output/lighthouse/${label}`)) {
    if (!file.endsWith('.json')) continue;
    const report = JSON.parse(await readFile(`output/lighthouse/${label}/${file}`, 'utf8'));
    if (!report.audits) continue;
    const route = new URL(report.requestedUrl).pathname;
    const a = report.audits;
    (groups[route] ??= []).push({ bytes: a['total-byte-weight'].numericValue, lcpMs: a['largest-contentful-paint'].numericValue, cls: a['cumulative-layout-shift'].numericValue, performance: report.categories.performance.score * 100 });
  }
  summary[label] = Object.fromEntries(Object.entries(groups).map(([route,runs]) => [route, { runs: runs.length, ...Object.fromEntries(Object.keys(runs[0]).map(k=>[k,median(runs.map(r=>r[k]))])) }]));
}
const visual = JSON.parse(await readFile('output/playwright/visual-results.json', 'utf8'));
const extra = JSON.parse(await readFile('output/playwright/extra-results.json', 'utf8'));
const bytes = n => `${(n/1e6).toFixed(2)} MB`;
const saving = (before,after) => `${((1-after/before)*100).toFixed(1)} %`;
let rows = '';
for (const [route,name] of [['/','Inicio'],['/ai-adoption.html','Adopción de IA']]) {
  const before=summary.before[route],after=summary.after[route];
  rows += `<tr><th>${name}</th><td>${bytes(before.bytes)}</td><td>${bytes(after.bytes)}</td><td>${saving(before.bytes,after.bytes)}</td><td>${(before.lcpMs/1000).toFixed(2)} → ${(after.lcpMs/1000).toFixed(2)} s</td><td>${before.performance} → ${after.performance}</td></tr>`;
}
let figures='';
for (const [name,label] of [['home','Inicio'],['ai','Adopción de IA']]) for (const width of [390,1440]) {
  figures+=`<h2>${label} · ${width}px</h2><div class="pair">`;
  for (const variant of ['before','after']) {
    const data=await readFile(`output/playwright/${variant}-${name}-${width}.png`);
    figures+=`<figure><figcaption>${variant==='before'?'Antes':'Después'}</figcaption><img src="data:image/png;base64,${data.toString('base64')}" alt="${label}, ${variant==='before'?'antes':'después'}, ${width}px" /></figure>`;
  }
  figures+='</div>';
}
await writeFile('output/image-comparison.json',JSON.stringify({baseline:'cd183a51f147babd7a57f0582211cc9492bd6602',profile:{viewport:[390,844],dpr:2,rttMs:150,kbps:1638.4,cpu:4,method:'Lighthouse simulated throttling',runs:3},summary,visual,extra},null,2)+'\n');
await writeFile('output/image-comparison.html',`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Neticware · Optimización de imágenes</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#07152b;color:#e8efff;margin:0;padding:clamp(20px,4vw,60px)}main{max-width:1400px;margin:auto}h1{font-size:clamp(28px,4vw,48px);line-height:1.2}h2{margin-top:48px}p{max-width:1000px}table{border-collapse:collapse;width:100%;background:#112440}th,td{padding:14px;border-bottom:1px solid #304362;text-align:left}.table{overflow:auto}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:#112440;padding:12px;border-radius:12px;text-align:center}figcaption{font-weight:700;padding:0 0 12px}img{max-width:100%;height:auto;vertical-align:middle}code{font-size:.9em}a{color:#8bcaff}@media(max-width:600px){.pair{gap:8px}figure{padding:5px}td,th{padding:8px}}</style><main><p>Neticware · rama codex/optimize-images</p><h1>Comparación de imágenes</h1><p>Referencia: commit <code>cd183a5</code>. Mediciones locales con el mismo servidor y compresión de texto, caché vacía, tres ejecuciones por página y medianas. Lighthouse: móvil 390 × 844, densidad 2, 4G simulada de 1638,4 Kbit/s, latencia 150 ms y CPU ×4. Las cifras de tiempo son de laboratorio; no describen la experiencia real de los visitantes.</p><div class="table"><table><thead><tr><th>Página</th><th>Antes</th><th>Después</th><th>Reducción</th><th>LCP simulado</th><th>Puntuación</th></tr></thead><tbody>${rows}</tbody></table></div><p>La carga inicial incluye todos los recursos solicitados por Lighthouse durante la auditoría, incluidos los que el navegador anticipa. No equivale al tamaño total de archivos en el repositorio. Ambas páginas quedan por debajo del presupuesto de 2 MB.</p><p>La revisión visual adicional recorre ambas páginas a 390 y 1440 px. No detectó imágenes rotas ni desbordamiento horizontal. En una recarga inmediata, ambas versiones reutilizan la caché de imágenes (0 bytes transferidos); la mejora de duración configurada es de cuatro horas a un año para archivos con hash. Las cabeceras públicas de Cloudflare quedan pendientes de comprobar tras un despliegue.</p><p>Las capturas conservan el diseño previo, incluido el recorte existente del título bajo la cabecera móvil. Los cambios de compresión se revisaron sobre los fondos reales. Los informes originales están en <code>output/lighthouse/before</code> y <code>output/lighthouse/after</code>.</p>${figures}</main></html>`);
console.log(JSON.stringify(summary,null,2));

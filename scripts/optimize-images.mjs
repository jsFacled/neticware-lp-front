import sharp from 'sharp';
import { optimize } from 'svgo';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { versionImageStyles } from './version-image-styles.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = path.join(root, '_image-sources');
const out = path.join(root, 'assets/images/optimized');
const manifestPath = path.join(root, 'assets/image-manifest.json');
await mkdir(out, { recursive: true });
let previous = {};
try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); } catch {}
const assets = {};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(key, width, extension, bytes, height) {
  const sha256 = digest(bytes);
  const file = `${key}${width ? '-' + width : ''}.${sha256.slice(0, 12)}.${extension}`;
  await writeFile(path.join(out, file), bytes);
  const record = { src: `assets/images/optimized/${file}`, width, height, bytes: bytes.length, sha256 };
  assets[key] ??= { variants: {} };
  assets[key].variants[`${width || 'original'}.${extension}`] = record;
  return record;
}
async function raster(key, source, widths, formats = ['webp']) {
  const input = await readFile(path.join(sources, source));
  const metadata = await sharp(input).metadata();
  assets[key] = { source, sourceBytes: input.length, sourceSha256: digest(input), variants: {} };
  for (const width of widths) {
    for (const format of formats) {
      let image = sharp(input).resize({ width, withoutEnlargement: true }).toColourspace('srgb');
      if (format === 'webp') image = image.webp({ quality: 86, alphaQuality: 100, effort: 6 });
      if (format === 'avif') image = image.avif({ quality: 70, effort: 6, chromaSubsampling: '4:4:4' });
      if (format === 'png') image = image.png({ compressionLevel: 9 });
      const result = await image.toBuffer({ resolveWithObject: true });
      await save(key, result.info.width, format, result.data, result.info.height);
    }
  }
  assets[key].originalWidth = metadata.width;
  assets[key].originalHeight = metadata.height;
}
const poses = {
  presenting: ['mascot-presenting', [480, 960], '(max-width: 640px) 275px, 480px'],
  companion: ['mascot-companion', [112, 224], '(max-width: 640px) 78px, 112px'],
  'services-intro': ['mascot', [128, 256], '(max-width: 640px) 96px, 128px'],
  thinking: ['mascot-thinking', [160, 320], '(max-width: 640px) 88px, 130px'],
  pointing: ['mascot-pointing', [230, 460], '(max-width: 640px) 150px, 230px'],
  working: ['mascot-working', [130, 260], '(max-width: 640px) 88px, 130px'],
  contact: ['mascot-contact', [160, 320], '(max-width: 640px) 88px, 130px'],
  celebrating: ['mascot-celebrating', [130, 260], '(max-width: 640px) 88px, 130px'],
  listening: ['mascot-listening', [240, 480], '225px'],
  evaluating: ['mascot-evaluating', [140, 280], '130px'],
  choosing: ['mascot-choosing', [120, 240], '105px'],
  pilot: ['mascot-pilot', [120, 240], '105px']
};
for (const [state, [key, widths]] of Object.entries(poses)) {
  await raster(key, `mascot/${key}.png`, widths, state === 'presenting' ? ['webp', 'avif'] : ['webp']);
}
await raster('logo', 'neticware-logo.png', [96, 192, 260, 520]);
await raster('favicon', 'neticware-logo.png', [16, 32, 48], ['png']);
await raster('apple-touch-icon', 'neticware-logo.png', [180], ['png']);
// ICO with PNG-compressed 16/32/48 entries; retain alpha and original artwork.
const iconEntries = Object.values(assets.favicon.variants).sort((a, b) => a.width - b.width);
const iconHeader = Buffer.alloc(6 + 16 * iconEntries.length);
iconHeader.writeUInt16LE(1, 2); iconHeader.writeUInt16LE(iconEntries.length, 4);
let offset = iconHeader.length;
const iconBuffers = [];
for (let i = 0; i < iconEntries.length; i++) {
  const entry = iconEntries[i], data = await readFile(path.join(root, entry.src)), start = 6 + 16 * i;
  iconHeader[start] = entry.width; iconHeader[start + 1] = entry.height;
  iconHeader.writeUInt16LE(1, start + 4); iconHeader.writeUInt16LE(32, start + 6);
  iconHeader.writeUInt32LE(data.length, start + 8); iconHeader.writeUInt32LE(offset, start + 12);
  offset += data.length; iconBuffers.push(data);
}
await save('favicon', null, 'ico', Buffer.concat([iconHeader, ...iconBuffers]), null);

for (const name of ['web', 'custom-software', 'mobile', 'lp', 'blog', 'saas']) {
  const key = `services-${name}`;
  // The existing 16:9 AVIF is the single master; keep its 1200px bytes unchanged.
  await raster(key, `${key}.avif`, [600, 1200]);
  const original = await readFile(path.join(sources, `${key}.avif`));
  const small = await sharp(original).resize(600).avif({ quality: 65, effort: 6 }).toBuffer();
  await save(key, 600, 'avif', small, 338);
  await save(key, 1200, 'avif', original, 675);
}
await raster('panel-metal', 'panel-metal.webp', [768, 1536]);
for (const file of ['hero-network.avif', 'hero-network.webp', 'hero-network.jpg', 'hero-modern.webp', 'about-us.webp', 'og-cover-neticware-1200x630.jpg']) {
  const key = path.parse(file).name;
  const bytes = await readFile(path.join(sources, file));
  const meta = await sharp(bytes).metadata();
  assets[key] ??= { source: file, sourceBytes: bytes.length, variants: {} };
  await save(key, meta.width, path.extname(file).slice(1), bytes, meta.height);
}
for (const file of (await readdir(path.join(sources, 'icons'))).filter(f => f.endsWith('.svg')).sort()) {
  let source = await readFile(path.join(sources, 'icons', file), 'utf8');
  // img elements do not inherit currentColor; match the previous white CDN icons.
  source = source.replaceAll('fill="currentColor"', 'fill="#fff"');
  const svg = optimize(source, { multipass: true, floatPrecision: 1, plugins: ['preset-default', 'removeDimensions'] }).data;
  const key = path.parse(file).name;
  assets[key] = { source: `icons/${file}`, sourceBytes: Buffer.byteLength(source), variants: {} };
  await save(key, null, 'svg', Buffer.from(svg), null);
}
const runtime = {};
for (const [state, [key, widths, sizes]] of Object.entries(poses)) {
  const asset = assets[key], small = asset.variants[`${widths[0]}.webp`];
  runtime[state] = { src: small.src, srcset: widths.map(w => `${asset.variants[`${w}.webp`].src} ${w}w`).join(', '), sizes, width: asset.originalWidth, height: asset.originalHeight };
  if (state === 'presenting') {
    const saving = 1 - asset.variants['960.avif'].bytes / asset.variants['960.webp'].bytes;
    if (saving >= .2) runtime[state].avif = widths.map(w => `${asset.variants[`${w}.avif`].src} ${w}w`).join(', ');
    asset.avifSaving = saving;
  }
}
const manifest = { schemaVersion: 1, encoder: sharp.versions, assets, poses: runtime };
const runtimeSource = '// Generated by npm run images.\nwindow.NETICWARE_IMAGES = ' + JSON.stringify(runtime) + ';\n';
const runtimeVersion = digest(Buffer.from(runtimeSource)).slice(0, 12);
// On regeneration, propagate new hashes through the maintained source references.
const replacements = [];
for (const [key, prior] of Object.entries(previous.assets || {})) {
  for (const [variant, record] of Object.entries(prior.variants)) {
    const next = assets[key]?.variants[variant];
    if (next && next.src !== record.src) replacements.push([record.src, next.src]);
  }
}
async function updateReferences(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isDirectory()) {
      if (directory === root && !['assets'].includes(item.name)) continue;
      if (directory !== root && !['css', 'js'].includes(item.name)) continue;
      await updateReferences(path.join(directory, item.name));
    } else if (/\.(html|css|js|xml|json)$/.test(item.name) && !['package-lock.json', 'image-manifest.json'].includes(item.name)) {
      const file = path.join(directory, item.name), original = await readFile(file, 'utf8');
      let updated = original;
      for (const [before, after] of replacements) {
        updated = updated.replaceAll(before, after).replaceAll(before.replace('assets/', '../'), after.replace('assets/', '../'));
      }
      if (item.name === 'index.html') updated = updated.replace(/assets\/js\/image-manifest\.js(?:\?[^"\s]*)?/g, `assets/js/image-manifest.js?v=${runtimeVersion}`);
      if (updated !== original) await writeFile(file, updated);
    }
  }
}
await updateReferences(root);
await versionImageStyles(root);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(root, 'assets/js/image-manifest.js'), runtimeSource);
console.log(JSON.stringify({ assets: Object.keys(assets).length, files: Object.values(assets).reduce((n, a) => n + Object.keys(a.variants).length, 0), bytes: Object.values(assets).flatMap(a => Object.values(a.variants)).reduce((n, a) => n + a.bytes, 0), heroAvifSaving: assets['mascot-presenting'].avifSaving }, null, 2));

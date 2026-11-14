import { readFile, writeFile, cp, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(root, 'assets/image-manifest.json'), 'utf8'));
// Only this known child directory is removed. No source or worktree state is moved.
if (path.dirname(dist) !== root || path.basename(dist) !== 'dist') throw new Error('Invalid output path');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const name of ['index.html', 'ai-adoption.html', '404.html', 'maintenance.html', 'integration-vaadin.html', 'robots.txt', 'sitemap.xml']) {
  await cp(path.join(root, name), path.join(dist, name));
}
for (const folder of ['assets/css', 'assets/js']) await cp(path.join(root, folder), path.join(dist, folder), { recursive: true });
for (const asset of Object.values(manifest.assets)) {
  for (const variant of Object.values(asset.variants)) {
    const bytes = await readFile(path.join(root, variant.src));
    if (createHash('sha256').update(bytes).digest('hex') !== variant.sha256) throw new Error(`Stale asset: ${variant.src}`);
    const target = path.join(dist, variant.src);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
}
const icon = manifest.assets.favicon.variants['original.ico'].src;
await cp(path.join(root, icon), path.join(dist, 'favicon.ico'));
await writeFile(path.join(dist, '.nojekyll'), '');
console.log(`Built ${dist}; image masters, tooling and tests excluded.`);

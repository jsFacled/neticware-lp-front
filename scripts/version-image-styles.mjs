import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export async function versionImageStyles(root) {
  const versions = new Map();
  for (const name of ['about', 'contact', 'ai-module', 'mascot']) {
    const bytes = await readFile(path.join(root, `assets/css/${name}.css`));
    versions.set(name, createHash('sha256').update(bytes).digest('hex').slice(0, 12));
  }
  for (const page of ['index.html', 'ai-adoption.html']) {
    const file = path.join(root, page), original = await readFile(file, 'utf8');
    let updated = original;
    for (const [name, hash] of versions) updated = updated.replace(new RegExp(`assets/css/${name}\\.css(?:\\?[^"\\s]*)?`, 'g'), `assets/css/${name}.css?v=${hash}`);
    if (updated !== original) await writeFile(file, updated);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await versionImageStyles(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

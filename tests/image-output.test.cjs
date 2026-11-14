const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/image-manifest.json')));
test('public images match their immutable content hashes and manifest', () => {
  for (const asset of Object.values(manifest.assets)) for (const image of Object.values(asset.variants)) {
    const file = path.join(dist, image.src);
    assert.ok(fs.existsSync(file), image.src);
    const bytes = fs.readFileSync(file), sha = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha, image.sha256, image.src);
    assert.ok(image.src.includes(sha.slice(0, 12)), image.src);
  }
});
test('deployment excludes masters, test data and development dependencies', () => {
  for (const name of ['_image-sources', 'node_modules', 'output', 'scripts', 'tests', 'assets/image-manifest.json']) assert.equal(fs.existsSync(path.join(dist, name)), false, name);
});
test('production pages and styles have no missing local image references', () => {
  const files = ['index.html', 'ai-adoption.html', '404.html', 'maintenance.html', ...fs.readdirSync(path.join(dist, 'assets/css')).map(f => 'assets/css/' + f)];
  for (const file of files) {
    const text = fs.readFileSync(path.join(dist, file), 'utf8');
    const refs = [...text.matchAll(/(?:assets\/images\/|\.\.\/images\/)[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif|svg|ico)/g)].map(m => m[0]);
    assert.equal(/assets\/images\/mascot\/.*\.png/.test(text), false, file);
    for (const ref of refs) assert.ok(fs.existsSync(path.resolve(dist, path.dirname(file), ref)), `${file}: ${ref}`);
  }
});
test('legacy image aliases resolve to deployed optimized files', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json')));
  for (const rule of config.rewrites.filter(r => r.source.startsWith('/assets/images/'))) assert.ok(fs.existsSync(path.join(dist, rule.destination)), rule.source);
});
test('every dynamic pose has responsive variants and a fallback', () => {
  for (const [state, pose] of Object.entries(manifest.poses)) {
    assert.ok(fs.existsSync(path.join(dist, pose.src)), state);
    assert.equal(pose.srcset.split(', ').length, 2, state);
    assert.ok(pose.sizes && pose.width > 0 && pose.height > 0, state);
  }
});

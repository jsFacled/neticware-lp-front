// Dependency-free preview of the static output and Vercel's image aliases.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = path.resolve(option('--root', 'dist'));
const port = Number(option('--port', '4174'));
const baseline = args.includes('--baseline');
let config = {};
try { config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8')); }
catch { try { config = JSON.parse(await readFile('vercel.json', 'utf8')); } catch {} }
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const requestedPath = pathname;
  pathname = config.rewrites?.find(rule => rule.source === pathname)?.destination ?? pathname;
  if (pathname === '/') pathname = '/index.html';
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  let bytes, status = 200;
  try { bytes = await readFile(file); }
  catch {
    status = 404;
    file = path.join(root, '404.html');
    try { bytes = await readFile(file); }
    catch { bytes = Buffer.from('<!doctype html><title>404</title><h1>Not found</h1>'); }
  }
  const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' };
  headers['Cache-Control'] = requestedPath.startsWith('/assets/images/optimized/') && status === 200
    ? 'public, max-age=31536000, immutable'
    : baseline && /^\/assets\/images\//.test(requestedPath) ? 'public, must-revalidate, max-age=14400'
    : requestedPath === '/favicon.ico' && status === 200 ? 'public, max-age=3600' : 'no-cache';
  if (/\.(html|js|css|json|svg|xml|txt)$/.test(file) && req.headers['accept-encoding']?.includes('gzip')) {
    bytes = gzipSync(bytes); headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding';
  }
  headers['Content-Length'] = bytes.length;
  res.writeHead(status, headers).end(req.method === 'HEAD' ? undefined : bytes);
}).listen(port, '127.0.0.1', () => console.log(`Preview http://127.0.0.1:${port} (${root})`));

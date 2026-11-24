// serve.js — tiny dependency-free static server for local preview only.
// The page itself is a purely static site (works on GitHub Pages without this).
// Serves a fixed allow-list of files; binds to 127.0.0.1 only.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const HOST = '127.0.0.1';
const PORT = 8770;
const FILES = Object.freeze({
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/contract.js': ['contract.js', 'text/javascript; charset=utf-8'],
  '/data.js': ['data.js', 'text/javascript; charset=utf-8'],
  '/format.js': ['format.js', 'text/javascript; charset=utf-8'],
  '/validation.js': ['validation.js', 'text/javascript; charset=utf-8'],
});

createServer(async (req, res) => {
  const path = new URL(req.url, `http://${HOST}`).pathname;
  const entry = Object.hasOwn(FILES, path) ? FILES[path] : null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' }).end('Method not allowed');
    return;
  }
  if (!entry) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  try {
    const body = await readFile(new URL(entry[0], import.meta.url));
    res.writeHead(200, { 'content-type': entry[1], 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end('Server error');
  }
}).listen(PORT, HOST, () => console.log(`Smart Campus preview: http://${HOST}:${PORT}/`));

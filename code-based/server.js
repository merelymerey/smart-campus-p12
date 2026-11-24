// server.js — dependency-free Node server: static files + POST /api/explain.
// Run: npm run serve  (optional: ANTHROPIC_API_KEY=... npm run serve)
// The API key is read from process.env here and is never sent to the browser.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  MAX_BODY_BYTES, DEFAULT_TIMEOUT_MS, validateExplainInput, explainAvailability, selectAdapter,
} from './explain.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Allow-list: only the files the browser needs. Server code, package files,
// tests and any .env file are never served.
const STATIC_FILES = Object.freeze({
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/rooms.js': ['rooms.js', 'text/javascript; charset=utf-8'],
  '/explain-ui.js': ['explain-ui.js', 'text/javascript; charset=utf-8'],
  '/validation.js': ['validation.js', 'text/javascript; charset=utf-8'],
});

const SECURITY_HEADERS = Object.freeze({
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
});

function send(res, status, body, type, extra = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'content-type': type, 'cache-control': 'no-store', ...extra });
  res.end(body);
}
const sendJson = (res, status, obj, extra) => send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8', extra);

// Reads at most `limit` bytes. Resolves {tooLarge:true} instead of buffering more.
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > limit) {
      req.resume();
      resolve({ tooLarge: true });
      return;
    }
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) tooLarge = true;
      else chunks.push(chunk);
    });
    req.on('end', () => resolve(tooLarge ? { tooLarge: true } : { text: Buffer.concat(chunks).toString('utf8') }));
    req.on('error', reject);
  });
}

async function handleExplain(req, res, options) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST.' }, { allow: 'POST' });
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    req.resume();
    return sendJson(res, 400, { error: 'Content-Type must be application/json.' });
  }
  const body = await readBody(req, MAX_BODY_BYTES);
  if (body.tooLarge) return sendJson(res, 400, { error: `Body must be at most ${MAX_BODY_BYTES} bytes.` }, { connection: 'close' });
  if (body.text.trim() === '') return sendJson(res, 400, { error: 'Body is empty.' });
  let parsed;
  try {
    parsed = JSON.parse(body.text);
  } catch {
    return sendJson(res, 400, { error: 'Body is not valid JSON.' });
  }
  const input = validateExplainInput(parsed);
  if (!input.ok) return sendJson(res, 400, { error: input.error }); // AC3: no adapter call
  const result = await explainAvailability(input.value, options);
  return sendJson(res, 200, result);
}

async function handleStatic(req, res, rootDir) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8', { allow: 'GET, HEAD' });
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const entry = Object.hasOwn(STATIC_FILES, pathname) ? STATIC_FILES[pathname] : null;
  if (!entry) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  const content = await readFile(path.join(rootDir, entry[0]));
  return send(res, 200, req.method === 'HEAD' ? undefined : content, entry[1]);
}

export function createAppServer({
  adapter = selectAdapter(process.env),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  rootDir = ROOT,
  log = message => console.warn(message),
} = {}) {
  return http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/api/explain') await handleExplain(req, res, { adapter, timeoutMs, log });
      else await handleStatic(req, res, rootDir);
    } catch {
      log('server: unexpected error');
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal error.' });
      else res.end();
    }
  });
}

// Start only when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 8767;
  const adapter = selectAdapter(process.env);
  createAppServer({ adapter }).listen(port, '127.0.0.1', () => {
    console.log(`Smart Campus checker on http://127.0.0.1:${port}/ (explanations: ${adapter.source} adapter)`);
  });
}

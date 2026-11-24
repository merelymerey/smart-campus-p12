// server.test.js — HTTP tests for POST /api/explain and static serving (AC3, AC4, AC5).
import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createAppServer } from './server.js';
import { mockAdapter } from './explain.js';

let server;
let base;
const adapterSpy = { source: 'mock', generate: vi.fn(ctx => mockAdapter.generate(ctx)) };

beforeAll(async () => {
  server = createAppServer({ adapter: adapterSpy, log: () => {} });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise(resolve => server.close(resolve)));

const post = (body, headers = { 'content-type': 'application/json' }) =>
  fetch(`${base}/api/explain`, { method: 'POST', headers, body });

describe('POST /api/explain', () => {
  test('returns the mock explanation for an available interval', async () => {
    const res = await post(JSON.stringify({ room: 'A204', start: 660, end: 720, now: 540 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ explanation: expect.stringContaining('is available'), source: 'mock', isAvailable: true });
  });

  test('server decides availability; a blocked room stays unavailable', async () => {
    const res = await post(JSON.stringify({ room: 'B101', start: 660, end: 720, now: 540 }));
    expect(await res.json()).toMatchObject({ isAvailable: false, source: 'mock' });
  });

  test.each([
    ['empty body', ''],
    ['malformed JSON', '{"room":'],
    ['client-supplied isAvailable', JSON.stringify({ room: 'B101', start: 660, end: 720, now: 540, isAvailable: true })],
    ['unknown room', JSON.stringify({ room: 'X1', start: 660, end: 720, now: 540 })],
    ['string minutes', JSON.stringify({ room: 'A204', start: '660', end: 720, now: 540 })],
    ['oversize body', JSON.stringify({ room: 'A204', start: 660, end: 720, now: 540, pad: 'x'.repeat(2000) })],
  ])('rejects %s with 400 and never calls the adapter', async (_, body) => {
    adapterSpy.generate.mockClear();
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe('string');
    expect(adapterSpy.generate).not.toHaveBeenCalled();
  });

  test('rejects non-JSON content type with 400', async () => {
    const res = await post('room=A204', { 'content-type': 'application/x-www-form-urlencoded' });
    expect(res.status).toBe(400);
  });

  test('rejects GET with 405', async () => {
    expect((await fetch(`${base}/api/explain`)).status).toBe(405);
  });

  test('a failing adapter still yields 200 with a fallback', async () => {
    const failing = createAppServer({ adapter: { source: 'llm', generate: async () => { throw new Error('down'); } }, log: () => {} });
    await new Promise(resolve => failing.listen(0, '127.0.0.1', resolve));
    try {
      const res = await fetch(`http://127.0.0.1:${failing.address().port}/api/explain`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room: 'A204', start: 630, end: 690, now: 540 }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ source: 'fallback', isAvailable: false });
    } finally {
      await new Promise(resolve => failing.close(resolve));
    }
  });
});

describe('static files', () => {
  test('serves the page with security headers', async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(await res.text()).toContain('Explain availability');
  });

  test.each(['/server.js', '/explain.js', '/package.json', '/.env', '/../package.json', '/%2e%2e/package.json', '/AGENTS.md'])(
    'does not serve %s', async path => {
      expect((await fetch(`${base}${path}`)).status).toBe(404);
    });
});

describe('UI separation and safe rendering (AC5, AGENTS.md rule 4)', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

  test('explanation lives in a separate, labelled box outside the status card', () => {
    expect(html).toContain('AI-generated explanation – not a booking status');
    const resultBlock = html.slice(html.indexOf('<div id="result"'), html.indexOf('</div>', html.indexOf('<div id="result"')));
    expect(resultBlock).not.toContain('explanation');
  });

  test('app.js never uses innerHTML and never references an API key', () => {
    expect(app).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
    expect(app).not.toMatch(/API_KEY|x-api-key|anthropic/i);
  });
});

// Black-box cases against the real HTTP server. Prints a markdown table of expected vs observed.
import { createAppServer } from '../server.js';
import { mockAdapter } from '../explain.js';
import * as f from './fault-adapters.mjs';
import { readFileSync } from 'node:fs';
const before = readFileSync(new URL('../validation.js', import.meta.url), 'utf8');
async function start(adapter, timeoutMs = 3000) {
  const s = createAppServer({ adapter, timeoutMs, log: () => {} });
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  return { s, url: `http://127.0.0.1:${s.address().port}/api/explain` };
}
async function post(url, body, raw = false) {
  const t0 = performance.now();
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw ? body : JSON.stringify(body) });
  return { status: r.status, data: await r.json(), ms: Math.round(performance.now() - t0) };
}
const ok = { room: 'A204', now: 540 };
const cases = [
  ['TC01', 'Available A204 11:00–12:00', 'mock', { ...ok, start: 660, end: 720 }, '200, isAvailable=true, source=mock, text says available', o => o.status === 200 && o.data.isAvailable === true && o.data.source === 'mock' && /is available/.test(o.data.explanation)],
  ['TC02', 'Overlap A204 10:30–11:30', 'mock', { ...ok, start: 630, end: 690 }, '200, isAvailable=false, mentions overlap', o => o.status === 200 && o.data.isAvailable === false && /overlap/.test(o.data.explanation)],
  ['TC03', 'Blocked room B101 11:00–12:00', 'mock', { room: 'B101', now: 540, start: 660, end: 720 }, '200, isAvailable=false, mentions blocked', o => o.data.isAvailable === false && /blocked/.test(o.data.explanation)],
  ['TC04', 'Invalid time: end <= start (720–660)', 'mock', { ...ok, start: 720, end: 660 }, '200, isAvailable=false, reason = invalid range', o => o.data.isAvailable === false && /end must come after the start/.test(o.data.explanation)],
  ['TC05', 'Past time: start 08:00, now 09:00', 'mock', { ...ok, start: 480, end: 540 }, '200, isAvailable=false, start not after current time', o => o.data.isAvailable === false && /not after the supplied current time/.test(o.data.explanation)],
  ['TC06', 'Too long 12:00–15:00 (180 min)', 'mock', { ...ok, start: 720, end: 900 }, '200, isAvailable=false, mentions 120 minutes', o => o.data.isAvailable === false && /120 minutes/.test(o.data.explanation)],
  ['TC07', 'Empty body', 'mock', '', '400, adapter not called', o => o.status === 400, true],
  ['TC08', 'Malformed JSON "{room:"', 'mock', '{room:', '400', o => o.status === 400, true],
  ['TC09', 'Overly long body (5 000 chars)', 'mock', JSON.stringify({ ...ok, start: 660, end: 720, pad: 'x'.repeat(5000) }), '400 (body > 1 KB)', o => o.status === 400, true],
  ['TC10', 'Client tries to force isAvailable=true for blocked B101', 'mock', { room: 'B101', now: 540, start: 660, end: 720, isAvailable: true }, '400, decision cannot be supplied by client', o => o.status === 400],
  ['TC11', 'LLM timeout (adapter never answers)', 'timeout', { ...ok, start: 660, end: 720 }, '200 fallback after ~3 s, isAvailable=true', o => o.data.source === 'fallback' && o.data.isAvailable === true && o.ms >= 2900 && o.ms < 4000],
  ['TC12', 'Simulated API failure (HTTP 503)', 'error', { ...ok, start: 630, end: 690 }, '200 fallback, isAvailable=false (overlap)', o => o.data.source === 'fallback' && o.data.isAvailable === false && /overlaps/.test(o.data.explanation)],
  ['TC13', 'LLM contradicts rule + invents "Dr. Smith" booking', 'lying', { ...ok, start: 630, end: 690 }, 'model text rejected → fallback, isAvailable=false', o => o.data.source === 'fallback' && o.data.isAvailable === false && !/Smith/.test(o.data.explanation)],
  ['TC14', 'LLM returns HTML/script', 'injection', { ...ok, start: 660, end: 720 }, 'rejected → fallback, no markup', o => o.data.source === 'fallback' && !/</.test(o.data.explanation)],
];
const adapters = { mock: mockAdapter, timeout: f.timeoutAdapter, error: f.errorAdapter, lying: f.lyingAdapter, injection: f.injectionAdapter };
const servers = {};
for (const k of Object.keys(adapters)) servers[k] = await start(adapters[k]);
let pass = 0;
console.log('| ID | Case | Expected | Observed | Result |\n|---|---|---|---|---|');
for (const [id, name, ad, body, expected, check, raw] of cases) {
  const o = await post(servers[ad].url, body, raw);
  const good = check(o); if (good) pass++;
  const obs = `${o.status}, ${o.ms} ms, ${JSON.stringify(o.data)}`.replace(/\|/g, '/');
  console.log(`| ${id} | ${name} | ${expected} | ${obs} | ${good ? 'PASS' : 'FAIL'} |`);
}
const after = readFileSync(new URL('../validation.js', import.meta.url), 'utf8');
console.log(`\n${pass}/${cases.length} passed. validation.js unchanged during run: ${before === after}`);
for (const { s } of Object.values(servers)) s.close();

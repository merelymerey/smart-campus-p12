// explain.test.js — unit tests for reason codes, input/output validation,
// adapters, timeout and fallback (FEATURE.md AC1–AC4).
import { describe, test, expect, vi } from 'vitest';
import { validateAvailability } from './validation.js';
import { checkWithReason, reasonCodeFor, REASON_CODES } from './reason.js';
import {
  validateExplainInput, buildContext, validateExplanationOutput, fallbackExplanation, mockAdapter,
  createAnthropicAdapter, selectAdapter, withTimeout, explainAvailability,
} from './explain.js';

const input = (over = {}) => ({ room: 'A204', start: 660, end: 720, now: 540, ...over });

// One input per checker branch, against room A204 (booking 600–660) unless blocked.
const CASES = [
  ['AVAILABLE', [660, 720, 540, false]],
  ['INVALID_INPUT', [720.5, 780, 540, false]],
  ['INVALID_INPUT', [660, 720, 1440, false]],
  ['INVALID_RANGE', [720, 720, 540, false]],
  ['PAST_TIME', [540, 570, 540, false]],
  ['TOO_LONG', [720, 841, 540, false]],
  ['ROOM_BLOCKED', [660, 720, 540, true]],
  ['OVERLAP', [630, 690, 540, false]],
];

describe('reasonCode wrapper (AC1: decisions and messages unchanged)', () => {
  test.each(CASES)('%s: same decision and message as validateAvailability', (code, [s, e, n, blocked]) => {
    const existing = [[600, 660]];
    const original = validateAvailability(s, e, n, blocked, existing);
    const wrapped = checkWithReason(s, e, n, blocked, existing);
    expect(wrapped).toEqual({ ...original, reasonCode: code });
    expect(REASON_CODES).toContain(code);
  });

  test('unknown or contradictory checker results fail loudly', () => {
    expect(() => reasonCodeFor({ available: false, message: 'Something new.' })).toThrow();
    expect(() => reasonCodeFor({ available: false, message: 'The room is available. No booking has been saved.' })).toThrow();
  });
});

describe('validateExplainInput (AC3)', () => {
  test('accepts a well-formed request', () => {
    expect(validateExplainInput(input())).toEqual({ ok: true, value: input() });
  });

  test.each([
    ['null', null],
    ['array', [1, 2]],
    ['string', 'A204'],
    ['empty object', {}],
    ['missing now', { room: 'A204', start: 660, end: 720 }],
    ['extra key isAvailable', { ...input(), isAvailable: true }],
    ['unknown room', input({ room: 'Z999' })],
    ['room not a string', input({ room: 204 })],
    ['start as string', input({ start: '660' })],
    ['fractional end', input({ end: 720.5 })],
    ['negative now', input({ now: -1 })],
    ['end beyond day', input({ end: 1441 })],
    ['null start', input({ start: null })],
  ])('rejects %s', (_, body) => {
    const result = validateExplainInput(body);
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe('string');
  });
});

describe('buildContext (only the five allowed fields)', () => {
  test('re-runs the checker on server data and formats times', () => {
    expect(buildContext(input())).toEqual({ room: 'A204', start: '11:00', end: '12:00', isAvailable: true, reasonCode: 'AVAILABLE' });
    expect(buildContext(input({ room: 'B101' }))).toEqual({ room: 'B101', start: '11:00', end: '12:00', isAvailable: false, reasonCode: 'ROOM_BLOCKED' });
  });
});

describe('validateExplanationOutput (AC2)', () => {
  const ok = buildContext(input());
  const blocked = buildContext(input({ room: 'B101' }));

  test('accepts a short agreeing explanation', () => {
    expect(validateExplanationOutput({ explanation: ' Room A204 is available from 11:00 to 12:00. ' }, ok))
      .toBe('Room A204 is available from 11:00 to 12:00.');
  });

  test.each([
    ['not an object', 'Room A204 is available.', ok],
    ['wrong key', { text: 'Room A204 is available.' }, ok],
    ['extra key', { explanation: 'Room A204 is available.', isAvailable: true }, ok],
    ['non-string', { explanation: 42 }, ok],
    ['empty', { explanation: '   ' }, ok],
    ['too long', { explanation: `Room A204 is available ${'very '.repeat(60)}much.` }, ok],
    ['three sentences', { explanation: 'Room A204 is available. It is free. Enjoy.' }, ok],
    ['HTML markup', { explanation: 'Room A204 is <b>available</b>.' }, ok],
    ['link', { explanation: 'Room A204 is available, see https://example.com today.' }, ok],
    ['newline', { explanation: 'Room A204 is available.\nYes.' }, ok],
    ['says unavailable when available', { explanation: 'Room A204 is unavailable.' }, ok],
    ['no availability statement', { explanation: 'Room A204 looks nice.' }, ok],
    ['says available when blocked', { explanation: 'Room B101 is available from 11:00 to 12:00.' }, blocked],
    ['no negative statement when blocked', { explanation: 'Room B101 has a schedule.' }, blocked],
    ['invented booking time', { explanation: 'Room A204 is available, the next booking is at 14:00.' }, ok],
    ['invented room', { explanation: 'Room A204 is available, and so is C303.' }, ok],
  ])('rejects %s', (_, output, context) => {
    expect(validateExplanationOutput(output, context)).toBeNull();
  });

  test.each(CASES)('mock and fallback texts for %s pass validation and agree', async (code, [s, e, n, blockedRoom]) => {
    // Only cases reachable after input validation (integer minutes 0..1440).
    if (!Number.isInteger(s)) return;
    const context = buildContext({ room: blockedRoom ? 'B101' : 'A204', start: s, end: e, now: n });
    expect(context.reasonCode).toBe(code);
    const mock = await mockAdapter.generate(context);
    expect(validateExplanationOutput(mock, context)).toBe(mock.explanation);
    expect(validateExplanationOutput({ explanation: fallbackExplanation(context) }, context)).not.toBeNull();
  });
});

describe('explainAvailability (AC2, AC4)', () => {
  test('mock adapter is the default and agrees with the checker', async () => {
    await expect(explainAvailability(input())).resolves.toEqual({
      explanation: 'Room A204 is available from 11:00 to 12:00 because it starts in the future, lasts at most 120 minutes and is free of existing bookings.',
      source: 'mock', isAvailable: true,
    });
    const blocked = await explainAvailability(input({ room: 'B101' }));
    expect(blocked).toMatchObject({ source: 'mock', isAvailable: false });
    expect(blocked.explanation).toMatch(/not available.*blocked/);
  });

  test('adapter receives exactly {room, start, end, isAvailable, reasonCode}', async () => {
    const generate = vi.fn(async () => ({ explanation: 'Room A204 is available.' }));
    await explainAvailability(input(), { adapter: { source: 'llm', generate } });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(Object.keys(generate.mock.calls[0][0]).sort()).toEqual(['end', 'isAvailable', 'reasonCode', 'room', 'start']);
  });

  test('a valid LLM reply is returned with source "llm"', async () => {
    const adapter = { source: 'llm', generate: async () => ({ explanation: 'Room A204 is available from 11:00 to 12:00.' }) };
    await expect(explainAvailability(input(), { adapter })).resolves.toEqual({
      explanation: 'Room A204 is available from 11:00 to 12:00.', source: 'llm', isAvailable: true,
    });
  });

  test('an LLM reply contradicting the checker falls back', async () => {
    const adapter = { source: 'llm', generate: async () => ({ explanation: 'Room B101 is available, go ahead.' }) };
    const result = await explainAvailability(input({ room: 'B101' }), { adapter });
    expect(result).toEqual({ explanation: fallbackExplanation({ room: 'B101', isAvailable: false, reasonCode: 'ROOM_BLOCKED' }), source: 'fallback', isAvailable: false });
  });

  test('adapter error falls back', async () => {
    const log = vi.fn();
    const adapter = { source: 'llm', generate: async () => { throw new Error('boom'); } };
    await expect(explainAvailability(input(), { adapter, log })).resolves.toMatchObject({ source: 'fallback', isAvailable: true });
    expect(log).toHaveBeenCalled();
  });

  test('synchronous adapter throw falls back', async () => {
    const adapter = { source: 'llm', generate: () => { throw new Error('sync'); } };
    await expect(explainAvailability(input(), { adapter })).resolves.toMatchObject({ source: 'fallback' });
  });

  test('timeout aborts the adapter and falls back', async () => {
    vi.useFakeTimers();
    try {
      let receivedSignal;
      const adapter = { source: 'llm', generate: (_ctx, { signal }) => { receivedSignal = signal; return new Promise(() => {}); } };
      const pending = explainAvailability(input(), { adapter, timeoutMs: 3000 });
      await vi.advanceTimersByTimeAsync(3000);
      await expect(pending).resolves.toMatchObject({ source: 'fallback', isAvailable: true });
      expect(receivedSignal.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  test('withTimeout resolves fast tasks and clears its timer', async () => {
    await expect(withTimeout(async () => 'done', 50)).resolves.toBe('done');
  });
});

describe('adapter selection and real adapter (secrets stay server-side)', () => {
  test('mock adapter without a key; real adapter only with a non-empty key', () => {
    expect(selectAdapter({})).toBe(mockAdapter);
    expect(selectAdapter({ ANTHROPIC_API_KEY: '   ' })).toBe(mockAdapter);
    expect(selectAdapter({ ANTHROPIC_API_KEY: 'test-key' }, vi.fn()).source).toBe('llm');
    expect(() => createAnthropicAdapter({ apiKey: '' })).toThrow();
  });

  test('sends only the context in the request body and the key only in a header', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{"explanation":"Room A204 is available from 11:00 to 12:00."}' }] }),
    }));
    const adapter = createAnthropicAdapter({ apiKey: 'secret-test-key', fetchImpl });
    const context = buildContext(input());
    await expect(adapter.generate(context, {})).resolves.toEqual({ explanation: 'Room A204 is available from 11:00 to 12:00.' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('secret-test-key');
    expect(init.body).not.toContain('secret-test-key');
    const sent = JSON.parse(init.body);
    expect(JSON.parse(sent.messages[0].content)).toEqual(context);
  });

  test.each([
    ['HTTP error', async () => ({ ok: false, status: 500, json: async () => ({}) })],
    ['no text block', async () => ({ ok: true, json: async () => ({ content: [] }) })],
    ['non-JSON text', async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'Sure! The room is free.' }] }) })],
    ['network failure', async () => { throw new TypeError('fetch failed'); }],
  ])('real adapter %s -> fallback', async (_, fetchImpl) => {
    const adapter = createAnthropicAdapter({ apiKey: 'k', fetchImpl });
    await expect(explainAvailability(input(), { adapter })).resolves.toMatchObject({ source: 'fallback', isAvailable: true });
  });
});

// Regression tests for the two fixes chosen in Task #07 (agentic review).
import { describe, test, expect } from 'vitest';
import { buildContext, validateExplanationOutput } from './explain.js';
import { explanationLabel } from './explain-ui.js';

const A = buildContext({ room: 'A204', start: 660, end: 720, now: 540 });   // available
const BL = buildContext({ room: 'B101', start: 660, end: 720, now: 540 });  // blocked

describe('Fix A (F1/F2): explanation must open with the confirmed decision', () => {
  test.each([
    ['F1 hedged negation, available ctx', A, 'Room A204 is not really available right now.'],
    ['F2 negated reason + book it, blocked ctx', BL, 'Room B101 is not blocked, so go ahead and book it.'],
    ['available ctx, decision flipped in 2nd sentence', A, 'Room A204 is available from 11:00 to 12:00. Actually it is unavailable.'],
    ['blocked ctx, no decision phrase', BL, 'The blocked status of B101 has been lifted, go ahead and book it.'],
  ])('%s -> rejected', (_n, ctx, text) => {
    expect(validateExplanationOutput({ explanation: text }, ctx)).toBeNull();
  });
  test.each([
    ['available', A, 'Room A204 is available from 11:00 to 12:00 because it is free during that time.'],
    ['blocked', BL, 'Room B101 is not available from 11:00 to 12:00 because the room is blocked. Please try another room.'],
  ])('%s, correct wording -> accepted', (_n, ctx, text) => {
    expect(validateExplanationOutput({ explanation: text }, ctx)).toBe(text);
  });
});

describe('Fix B (M1): fallback text is never labelled as AI-generated', () => {
  test('fallback -> rule text label', () => {
    expect(explanationLabel('fallback')).toBe('Standard explanation (rule text, not AI) – not a booking status');
    expect(explanationLabel('fallback')).not.toMatch(/AI-generated/);
  });
  test('mock and llm -> AI label', () => {
    expect(explanationLabel('llm')).toBe('AI-generated explanation – not a booking status');
    expect(explanationLabel('mock')).toBe('AI-generated explanation (mock) – not a booking status');
  });
  test('unknown / error -> neutral label', () => {
    expect(explanationLabel('')).toBe('Explanation – not a booking status');
  });
});

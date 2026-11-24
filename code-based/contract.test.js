// contract.test.js — tests for contract.js against the shared Practice #12 contract.
// The common inputs are loaded from ../contract/test-cases.json (not copied).
// validation.js is wrapped by a spy that calls the real, unmodified function,
// so every decision below is made by the frozen rule engine.

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as engine from './validation.js';
import { checkAvailability, decisionLabel, parseMinutes, MESSAGES, DECISIONS } from './contract.js';
import { ROOM, BOOKINGS } from './data.js';
import { formatTime, bookingLabel } from './format.js';

vi.mock('./validation.js', async importOriginal => {
  const real = await importOriginal();
  return { ...real, validateAvailability: vi.fn(real.validateAvailability) };
});

const spec = JSON.parse(readFileSync(new URL('../contract/test-cases.json', import.meta.url), 'utf8'));

// Fresh, mutable copy for edge cases (so a mutation would be visible, not blocked by freezing).
const freshBookings = () => [[600, 660]];
const check = (overrides = {}) =>
  checkAvailability({ now: 540, start: 720, duration: 60, blocked: false, bookings: freshBookings(), ...overrides });

function expectReason(result, reasonCode) {
  expect(result).toEqual({ available: reasonCode === 'AVAILABLE', reasonCode, message: spec.messages[reasonCode] });
}

beforeEach(() => engine.validateAvailability.mockClear());

describe('fixed fictional data and message tables match the contract', () => {
  test('room A204 with bookings [[600, 660]]', () => {
    expect(ROOM).toBe(spec.room);
    expect(BOOKINGS).toEqual(spec.bookings);
  });
  test('bookings are deeply frozen', () => {
    expect(Object.isFrozen(BOOKINGS)).toBe(true);
    expect(BOOKINGS.every(Object.isFrozen)).toBe(true);
    expect(() => BOOKINGS.push([700, 760])).toThrow(TypeError);
    expect(() => { BOOKINGS[0][1] = 999; }).toThrow(TypeError);
  });
  test('messages and decision labels are exactly the contract tables', () => {
    expect(MESSAGES).toEqual(spec.messages);
    expect(DECISIONS).toEqual(spec.decisions);
    for (const [code, label] of Object.entries(spec.decisions)) expect(decisionLabel(code)).toBe(label);
  });
  test('decisionLabel rejects an unknown reasonCode', () => {
    expect(() => decisionLabel('NOPE')).toThrow(RangeError);
    expect(() => decisionLabel('toString')).toThrow(RangeError);
  });
});

describe('common test inputs T1–T7b (from test-cases.json)', () => {
  test.each(spec.cases)('$id $title', c => {
    const result = checkAvailability({ now: c.now, start: c.start, duration: c.duration, blocked: c.blocked, bookings: BOOKINGS });
    expect(result.available).toBe(c.available);
    expect(result.reasonCode).toBe(c.reasonCode);
    expect(result.message).toBe(spec.messages[c.reasonCode]);
    expect(decisionLabel(result.reasonCode)).toBe(spec.decisions[c.reasonCode]);
  });
  test('T7 passes only if both adjacent rows pass', () => {
    const rows = spec.cases.filter(c => c.id.startsWith('T7'));
    expect(rows.map(c => c.id)).toEqual(['T7a', 'T7b']);
    for (const c of rows) expect(checkAvailability({ ...c, bookings: BOOKINGS }).reasonCode).toBe('AVAILABLE');
  });
});

describe('T8: bookings unchanged after T1–T7b', () => {
  test('a mutable copy deep-equals [[600, 660]] before and after all checks, same references', () => {
    const bookings = structuredClone(spec.bookings);
    const outer = bookings;
    const inner = bookings[0];
    const before = structuredClone(bookings);
    for (const c of spec.cases) checkAvailability({ now: c.now, start: c.start, duration: c.duration, blocked: c.blocked, bookings });
    expect(bookings).toEqual(before);
    expect(bookings).toEqual([[600, 660]]);
    expect(bookings).toBe(outer);
    expect(bookings[0]).toBe(inner);
  });
  test('the frozen data used by the page still deep-equals [[600, 660]] and is listed as 10:00–11:00', () => {
    for (const c of spec.cases) checkAvailability({ now: c.now, start: c.start, duration: c.duration, blocked: c.blocked, bookings: BOOKINGS });
    expect(BOOKINGS).toEqual([[600, 660]]);
    expect(BOOKINGS.map(bookingLabel)).toEqual(['10:00–11:00 · occupied (600–660 min)']);
  });
});

describe('delegation to the frozen rule engine', () => {
  test('calls validateAvailability(start, start + duration, now, blocked, bookings) with the same bookings reference', () => {
    const bookings = freshBookings();
    checkAvailability({ now: 540, start: 720, duration: 60, blocked: true, bookings });
    expect(engine.validateAvailability).toHaveBeenCalledTimes(1);
    expect(engine.validateAvailability).toHaveBeenCalledWith(720, 780, 540, true, bookings);
    expect(engine.validateAvailability.mock.calls[0][4]).toBe(bookings);
  });
  test('every common case that passes layer 1 goes through the engine', () => {
    for (const c of spec.cases) {
      engine.validateAvailability.mockClear();
      checkAvailability({ ...c, bookings: BOOKINGS });
      const expected = c.reasonCode === 'INVALID_DURATION' ? 0 : 1; // T4 is decided by layer 1 (rule 2)
      expect(engine.validateAvailability, c.id).toHaveBeenCalledTimes(expected);
    }
  });
  test('an unknown engine result fails closed (throws) instead of reporting a decision', () => {
    engine.validateAvailability.mockReturnValueOnce({ available: true, message: 'something new' });
    expect(() => check()).toThrow(/Unexpected rule engine result/);
    engine.validateAvailability.mockReturnValueOnce({ available: true, message: MESSAGES.OVERLAP });
    expect(() => check()).toThrow(/Unexpected rule engine result/);
  });
});

describe('rule 1: INVALID_INPUT', () => {
  test.each([
    ['empty now', { now: NaN }],
    ['empty start', { start: NaN }],
    ['empty duration', { duration: NaN }],
    ['fractional now', { now: 540.5 }],
    ['fractional start', { start: 720.5 }],
    ['fractional duration', { duration: 30.5 }],
    ['string start', { start: '720' }],
    ['null duration', { duration: null }],
    ['undefined now', { now: undefined }],
    ['Infinity start', { start: Infinity }],
    ['now = -1', { now: -1 }],
    ['now = 1440', { now: 1440 }],
    ['start = -1', { start: -1 }],
    ['start = 1440', { start: 1440, duration: 1 }],
  ])('%s', (_name, overrides) => expectReason(check(overrides), 'INVALID_INPUT'));
  test('boundaries 0 and 1439 are accepted for now and start', () => {
    expectReason(check({ now: 0, start: 1, duration: 60 }), 'AVAILABLE');
    expectReason(check({ now: 1438, start: 1439, duration: 1 }), 'AVAILABLE');
    expectReason(check({ now: 1439, start: 720 }), 'PAST_TIME');
  });
  test('beats every later rule', () => {
    expectReason(check({ now: NaN, start: 500, duration: 0, blocked: true }), 'INVALID_INPUT');
  });
});

describe('rule 2: INVALID_DURATION (AC2)', () => {
  test.each([0, -1, -120])('duration %i', duration => expectReason(check({ duration }), 'INVALID_DURATION'));
  test('duration 1 is valid', () => expectReason(check({ duration: 1 }), 'AVAILABLE'));
  test('beats OUT_OF_DAY, PAST_TIME, BLOCKED and OVERLAP', () => {
    expectReason(check({ start: 500, duration: 0, blocked: true }), 'INVALID_DURATION');
    expectReason(check({ start: 630, duration: -5 }), 'INVALID_DURATION');
  });
});

describe('rule 3: OUT_OF_DAY', () => {
  test('end 1441 is rejected, end 1440 (24:00) is allowed', () => {
    expectReason(check({ start: 1400, duration: 41 }), 'OUT_OF_DAY');
    expectReason(check({ start: 1400, duration: 40 }), 'AVAILABLE');
  });
  test('beats PAST_TIME, TOO_LONG and BLOCKED', () => {
    expectReason(check({ now: 1439, start: 1400, duration: 41 }), 'OUT_OF_DAY');
    expectReason(check({ start: 1400, duration: 121, blocked: true }), 'OUT_OF_DAY');
  });
});

describe('rule 4: PAST_TIME (AC1)', () => {
  test('start equal to now is rejected, now + 1 is allowed', () => {
    expectReason(check({ now: 540, start: 540, duration: 30 }), 'PAST_TIME');
    expectReason(check({ now: 540, start: 541, duration: 30 }), 'AVAILABLE');
  });
  test('beats TOO_LONG, BLOCKED and OVERLAP', () => {
    expectReason(check({ now: 700, start: 630, duration: 121, blocked: true }), 'PAST_TIME');
  });
});

describe('rule 5: TOO_LONG (AC2)', () => {
  test('121 is rejected, 120 is allowed', () => {
    expectReason(check({ start: 720, duration: 121 }), 'TOO_LONG');
    expectReason(check({ start: 720, duration: 120 }), 'AVAILABLE');
  });
  test('beats BLOCKED and OVERLAP', () => {
    expectReason(check({ start: 570, duration: 121, blocked: true }), 'TOO_LONG');
  });
});

describe('rule 6: ROOM_BLOCKED (AC4)', () => {
  test('blocked room is unavailable even for a free interval', () => {
    expectReason(check({ blocked: true }), 'ROOM_BLOCKED');
    expect(decisionLabel('ROOM_BLOCKED')).toBe('Unavailable');
  });
  test('beats OVERLAP', () => expectReason(check({ start: 630, blocked: true }), 'ROOM_BLOCKED'));
  test('blocked must be a real boolean', () => {
    expect(() => check({ blocked: 'false' })).toThrow(TypeError);
    expect(() => check({ blocked: undefined })).toThrow(TypeError);
  });
});

describe('rule 7: OVERLAP (AC3)', () => {
  test.each([
    ['starts inside the booking', 630, 60],
    ['ends inside the booking', 570, 60],
    ['covers the booking', 590, 90],
    ['inside the booking', 610, 30],
    ['exactly the booking', 600, 60],
    ['one minute into the start', 599, 2],
    ['last minute of the booking', 659, 1],
  ])('%s', (_name, start, duration) => expectReason(check({ start, duration }), 'OVERLAP'));
  test.each([
    ['touches the end (T7a)', 660, 60],
    ['touches the start (T7b)', 570, 30],
    ['well before', 545, 30],
    ['well after', 900, 120],
  ])('no overlap: %s', (_name, start, duration) => expectReason(check({ start, duration }), 'AVAILABLE'));
  test('no bookings means no overlap', () => expectReason(check({ start: 630, bookings: [] }), 'AVAILABLE'));
  test('bookings must be an array', () => {
    expect(() => check({ bookings: undefined })).toThrow(TypeError);
  });
});

describe('rule order (one input violating several rules reports the earliest)', () => {
  test.each([
    ['1 before 2', { now: 2000, duration: 0 }, 'INVALID_INPUT'],
    ['2 before 3', { start: 1439, duration: 0 }, 'INVALID_DURATION'],
    ['3 before 4', { now: 1000, start: 900, duration: 600 }, 'OUT_OF_DAY'],
    ['4 before 5', { start: 500, duration: 121 }, 'PAST_TIME'],
    ['5 before 6', { duration: 121, blocked: true }, 'TOO_LONG'],
    ['6 before 7', { start: 630, blocked: true }, 'ROOM_BLOCKED'],
  ])('%s', (_name, overrides, reasonCode) => expectReason(check(overrides), reasonCode));
});

describe('result shape and decision labels', () => {
  test('available is true only for AVAILABLE, labels map to the three decisions', () => {
    const labels = new Set(Object.keys(spec.messages).map(decisionLabel));
    expect(labels).toEqual(new Set(['Available', 'Unavailable', 'Invalid input']));
    expect(Object.keys(check())).toEqual(['available', 'reasonCode', 'message']);
  });
});

describe('presentation helpers (DOM-free)', () => {
  test('parseMinutes: empty or blank -> NaN, otherwise Number', () => {
    expect(parseMinutes('')).toBeNaN();
    expect(parseMinutes('   ')).toBeNaN();
    expect(parseMinutes(undefined)).toBeNaN();
    expect(parseMinutes(' 720 ')).toBe(720);
    expect(parseMinutes('12.5')).toBe(12.5);
    expect(parseMinutes('abc')).toBeNaN();
  });
  test('empty field text becomes INVALID_INPUT', () => {
    expectReason(check({ start: parseMinutes('') }), 'INVALID_INPUT');
  });
  test('formatTime', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(600)).toBe('10:00');
    expect(formatTime(1440)).toBe('24:00');
    expect(formatTime(1441)).toBeNull();
    expect(formatTime(NaN)).toBeNull();
  });
});

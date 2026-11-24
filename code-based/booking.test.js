// booking.test.js
// Vitest tests for the real rule function used by app.js.
// validation.js is imported as-is and never modified.
//
// Fixed time: `now` is passed as an argument, so wall-clock time can never
// influence a decision. No fake timers are needed.

import { describe, test, expect } from 'vitest';
import { validateAvailability } from './validation.js';

// Fresh fixture per test: new array and new inner pairs every call.
function makeFixture(overrides = {}) {
  return {
    now: 540,
    blocked: false,
    existing: [[600, 660]],
    ...overrides,
  };
}

// Runs the rule against a fixture and returns the result.
function check(start, end, fx) {
  return validateAvailability(start, end, fx.now, fx.blocked, fx.existing);
}

// Exact decision plus a non-empty, human-readable message (AC5).
// When `message` is given, the exact reason is asserted too, so a rejection
// for the wrong reason is caught. Only used where a single rule is violated.
function expectDecision(result, available, message) {
  expect(result.available).toBe(available);
  expect(typeof result.message).toBe('string');
  expect(result.message.length).toBeGreaterThan(0);
  if (message !== undefined) {
    expect(result.message).toBe(message);
  }
}

describe('validateAvailability (AC1–AC5)', () => {
  // ---------- AC1: shape and time rules ----------

  test('T02 AC1: interval starting exactly at now is unavailable', () => {
    const fx = makeFixture();
    expectDecision(
      check(540, 570, fx),
      false,
      'Start must be after the supplied current time.',
    );
  });

  test('T03 AC1: zero-duration interval is unavailable', () => {
    const fx = makeFixture();
    expectDecision(check(720, 720, fx), false);
  });

  test('T04 AC1: reversed interval (end before start) is unavailable', () => {
    const fx = makeFixture();
    expectDecision(check(750, 720, fx), false);
  });

  test('T05 AC1: interval ending past day end (1441) is unavailable', () => {
    const fx = makeFixture();
    expectDecision(check(1380, 1441, fx), false);
  });

  test('T16 AC1: fractional start (720.5) is unavailable, whole minutes only', () => {
    const fx = makeFixture();
    expectDecision(check(720.5, 780, fx), false);
  });

  test('T17 AC1: interval ending exactly at midnight (1440) is available', () => {
    const fx = makeFixture({ now: 1300 });
    expectDecision(check(1380, 1440, fx), true);
  });

  test('T18 AC1: interval starting one minute after now is available', () => {
    const fx = makeFixture();
    expectDecision(check(541, 570, fx), true);
  });

  // ---------- AC2: maximum duration ----------

  test('T06 AC2: exactly 120 minutes is available', () => {
    const fx = makeFixture();
    expectDecision(check(720, 840, fx), true);
  });

  test('T07 AC2: 121 minutes is unavailable', () => {
    const fx = makeFixture();
    expectDecision(
      check(720, 841, fx),
      false,
      'Choose an interval of 120 minutes or less.',
    );
  });

  // ---------- AC3: blocked room ----------

  test('T13 AC3: otherwise valid interval in a blocked room is unavailable', () => {
    const fx = makeFixture({ blocked: true });
    expectDecision(
      check(660, 720, fx),
      false,
      'This room is blocked. Choose another room.',
    );
  });

  // ---------- AC4: overlap with existing bookings ----------

  test('T01 AC4: touching after existing booking is available', () => {
    const fx = makeFixture();
    expectDecision(check(660, 720, fx), true);
  });

  test('T08 AC4: touching before existing booking is available', () => {
    const fx = makeFixture();
    expectDecision(check(570, 600, fx), true);
  });

  test('T09 AC4: partial overlap is unavailable', () => {
    const fx = makeFixture();
    expectDecision(
      check(630, 690, fx),
      false,
      'This interval overlaps an existing booking.',
    );
  });

  test('T10 AC4: interval containing the existing booking is unavailable', () => {
    const fx = makeFixture();
    expectDecision(check(570, 690, fx), false);
  });

  test('T11 AC4: interval inside the existing booking is unavailable', () => {
    const fx = makeFixture();
    expectDecision(check(615, 645, fx), false);
  });

  test('T12 AC4: interval identical to the existing booking is unavailable', () => {
    const fx = makeFixture();
    expectDecision(check(600, 660, fx), false);
  });

  test('T14 AC4: same interval with no existing bookings is available', () => {
    const fx = makeFixture({ existing: [] });
    expectDecision(check(630, 690, fx), true);
  });

  test('T19 AC4: overlap with a non-first booking in an unsorted list is unavailable', () => {
    // [600, 660] sits at index 1. An implementation that only checks the
    // first booking, or assumes a sorted list and exits early, would wrongly
    // report Available here.
    const fx = makeFixture({ existing: [[720, 780], [600, 660]] });
    expectDecision(check(630, 690, fx), false);
  });

  test('T20 AC4: interval touching two neighbouring bookings is available', () => {
    const fx = makeFixture({ existing: [[720, 780], [600, 660]] });
    expectDecision(check(660, 720, fx), true);
  });

  // ---------- AC5: clear decision, data preserved ----------

  test('T15 AC5: existing bookings are unchanged after an Unavailable and an Available call', () => {
    const fx = makeFixture();
    const originalRef = fx.existing;
    const originalPairRef = fx.existing[0];

    const unavailable = check(630, 690, fx); // overlaps -> Unavailable
    const available = check(660, 720, fx);   // touching -> Available

    expectDecision(unavailable, false);
    expectDecision(available, true);

    // Same array object, same inner pair object, same contents.
    expect(fx.existing).toBe(originalRef);
    expect(fx.existing[0]).toBe(originalPairRef);
    expect(fx.existing).toEqual([[600, 660]]);
    expect(fx.existing).toHaveLength(1);
  });

  test('T15b AC5: result exposes exactly a boolean decision and a message', () => {
    const fx = makeFixture();
    const result = check(660, 720, fx);
    expect(Object.keys(result).sort()).toEqual(['available', 'message']);
    expect(typeof result.available).toBe('boolean');
  });
});

// Optional boundaries not in the reviewed case table. Delete this block if
// the suite must match the table exactly.
describe('validateAvailability (extra AC1 boundaries)', () => {
  test('T21 AC1: interval starting before now is unavailable', () => {
    const fx = makeFixture();
    expectDecision(
      check(500, 530, fx),
      false,
      'Start must be after the supplied current time.',
    );
  });

  test('T22 AC1: start 1 with now 0 is the lowest acceptable start', () => {
    const fx = makeFixture({ now: 0 });
    expectDecision(check(1, 61, fx), true);
  });
});

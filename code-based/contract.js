// contract.js — layers (1) input validation and (2) availability calculation
// for the Practice #12 contract (../contract/CONTRACT.md). DOM-free.
//
// The availability decision itself is delegated to the frozen rule engine
// validateAvailability() in validation.js, which is not modified. This module
// only (a) rejects input the engine has no dedicated rule for (contract rules
// 1–2) and (b) translates the engine's result into the contract's reasonCode
// and visible message (rules 3–8). Bookings are passed through read-only.

import { validateAvailability } from './validation.js';

export const MESSAGES = Object.freeze({
  INVALID_INPUT: 'Enter whole minutes. Current time and start must be between 0 and 1439.',
  INVALID_DURATION: 'Duration must be greater than zero.',
  OUT_OF_DAY: 'The interval must end by 24:00 on the same day.',
  PAST_TIME: 'Start must be after the supplied current time.',
  TOO_LONG: 'Choose a duration of 120 minutes or less.',
  ROOM_BLOCKED: 'This room is blocked and cannot be used.',
  OVERLAP: 'This interval overlaps an existing booking.',
  AVAILABLE: 'The room is available. No booking has been saved.',
});

export const DECISIONS = Object.freeze({
  AVAILABLE: 'Available',
  ROOM_BLOCKED: 'Unavailable',
  OVERLAP: 'Unavailable',
  INVALID_INPUT: 'Invalid input',
  INVALID_DURATION: 'Invalid input',
  OUT_OF_DAY: 'Invalid input',
  PAST_TIME: 'Invalid input',
  TOO_LONG: 'Invalid input',
});

// Engine message (validation.js, frozen) -> contract reasonCode.
// After layer 1 has passed, the engine's range message can only mean end > 1440.
const ENGINE_REASONS = Object.freeze({
  'Use 0 <= start < end <= 1440 on the same day.': 'OUT_OF_DAY',
  'Start must be after the supplied current time.': 'PAST_TIME',
  'Choose an interval of 120 minutes or less.': 'TOO_LONG',
  'This room is blocked. Choose another room.': 'ROOM_BLOCKED',
  'This interval overlaps an existing booking.': 'OVERLAP',
  'The room is available. No booking has been saved.': 'AVAILABLE',
});

const MINUTES_PER_DAY = 1440;

/** One-word decision shown on screen for a reasonCode. */
export function decisionLabel(reasonCode) {
  if (!Object.hasOwn(DECISIONS, reasonCode)) throw new RangeError(`Unknown reasonCode: ${reasonCode}`);
  return DECISIONS[reasonCode];
}

/**
 * Layer 1 helper: text from an input field -> number. Empty text becomes NaN,
 * so it fails the whole-number check in checkAvailability.
 */
export function parseMinutes(text) {
  const trimmed = String(text ?? '').trim();
  return trimmed === '' ? NaN : Number(trimmed);
}

function result(reasonCode) {
  return { available: reasonCode === 'AVAILABLE', reasonCode, message: MESSAGES[reasonCode] };
}

const inDay = minute => minute >= 0 && minute < MINUTES_PER_DAY;

/**
 * checkAvailability({ now, start, duration, blocked, bookings })
 *   -> { available, reasonCode, message }
 * now/start/duration are numbers (NaN for empty input); blocked is a boolean;
 * bookings is a read-only list of [start, end) pairs. Never mutates bookings.
 */
export function checkAvailability({ now, start, duration, blocked, bookings }) {
  // Programmer errors (not student input): fail loudly instead of guessing.
  if (typeof blocked !== 'boolean') throw new TypeError('blocked must be a boolean');
  if (!Array.isArray(bookings)) throw new TypeError('bookings must be an array of [start, end] pairs');

  // Layer 1 — input validation (contract rules 1 and 2).
  if (![now, start, duration].every(Number.isInteger) || !inDay(now) || !inDay(start)) return result('INVALID_INPUT');
  if (duration <= 0) return result('INVALID_DURATION');

  // Layer 2 — availability calculation, delegated to the frozen rule engine (rules 3–8).
  const engine = validateAvailability(start, start + duration, now, blocked, bookings);
  const reasonCode = ENGINE_REASONS[engine.message];
  if (!reasonCode || engine.available !== (reasonCode === 'AVAILABLE')) {
    // The engine returned something this contract does not know: never show "Available" by mistake.
    throw new Error(`Unexpected rule engine result: ${JSON.stringify(engine)}`);
  }
  return result(reasonCode);
}

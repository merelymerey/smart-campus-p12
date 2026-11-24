// reason.js — adds a machine-readable reasonCode to the checker's result
// WITHOUT touching validation.js. The decision and message come straight from
// validateAvailability; this file only labels which rule produced them.
import { validateAvailability } from './validation.js';

export const REASON_CODES = Object.freeze([
  'AVAILABLE', 'INVALID_INPUT', 'INVALID_RANGE', 'PAST_TIME', 'TOO_LONG', 'ROOM_BLOCKED', 'OVERLAP',
]);

// Exact messages emitted by validation.js, mapped to the rule that emits them.
const CODE_BY_MESSAGE = new Map([
  ['Enter whole minutes in all three time fields.', 'INVALID_INPUT'],
  ['Current time must be between 0 and 1439.', 'INVALID_INPUT'],
  ['Use 0 <= start < end <= 1440 on the same day.', 'INVALID_RANGE'],
  ['Start must be after the supplied current time.', 'PAST_TIME'],
  ['Choose an interval of 120 minutes or less.', 'TOO_LONG'],
  ['This room is blocked. Choose another room.', 'ROOM_BLOCKED'],
  ['This interval overlaps an existing booking.', 'OVERLAP'],
  ['The room is available. No booking has been saved.', 'AVAILABLE'],
]);

// Throws if validation.js ever emits a message this table does not know, or
// if the code would contradict the decision. Fails loudly rather than guessing.
export function reasonCodeFor(result) {
  const code = CODE_BY_MESSAGE.get(result.message);
  if (!code) throw new Error('Unknown checker message; update reason.js');
  if ((code === 'AVAILABLE') !== result.available) throw new Error('reasonCode contradicts decision');
  return code;
}

// Same arguments and same decision/message as validateAvailability, plus reasonCode.
export function checkWithReason(start, end, now, blocked, existing) {
  const result = validateAvailability(start, end, now, blocked, existing);
  return { available: result.available, reasonCode: reasonCodeFor(result), message: result.message };
}

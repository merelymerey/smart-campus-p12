// format.js — pure presentation helpers for the UI layer (no DOM, no rules).

/** Minutes after midnight -> "HH:MM", or null when not a whole minute in 0…1440. */
export function formatTime(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Text shown for one existing booking, e.g. "10:00–11:00 · occupied (600–660 min)". */
export function bookingLabel([start, end]) {
  return `${formatTime(start)}–${formatTime(end)} · occupied (${start}–${end} min)`;
}

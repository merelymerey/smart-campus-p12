// app.js — layer (3) UI display only. No availability rules live here:
// every decision comes from checkAvailability() in contract.js.
// All text is written with textContent (never innerHTML).
import { checkAvailability, decisionLabel, parseMinutes } from './contract.js';
import { ROOM, BOOKINGS } from './data.js';
import { formatTime, bookingLabel } from './format.js';

const $ = id => document.getElementById(id);
const readMinutes = id => parseMinutes($(id).value);
const isBlocked = () => $('room-status').value === 'blocked';

function updateHints() {
  for (const id of ['now', 'start']) {
    const clock = formatTime(readMinutes(id));
    $(id + '-clock').textContent = clock ?? 'Enter a valid whole-minute time.';
  }
  const start = readMinutes('start');
  const duration = readMinutes('duration');
  const end = formatTime(start + duration);
  $('duration-clock').textContent = formatTime(start) && Number.isInteger(duration) && duration > 0 && end
    ? `Ends at ${end}` : 'Enter whole minutes (1–120).';
}

function resetResult() {
  updateHints();
  $('result').removeAttribute('data-available');
  $('decision').textContent = 'Ready to check';
  $('reason-code').textContent = '—';
  $('feedback').textContent = 'Choose a start and a duration, then check availability.';
}

function renderRoom() {
  $('room-number').textContent = ROOM;
  $('room-state').textContent = isBlocked() ? 'Blocked · unavailable for use' : 'Open for availability checks';
  $('bookings').replaceChildren(...BOOKINGS.map(booking => {
    const li = document.createElement('li');
    li.textContent = bookingLabel(booking);
    return li;
  }));
  resetResult();
}

function showResult({ available, reasonCode, message }) {
  $('result').dataset.available = String(available);
  $('decision').textContent = decisionLabel(reasonCode);
  $('reason-code').textContent = reasonCode;
  $('feedback').textContent = message;
}

$('room-status').addEventListener('change', renderRoom);
$('check-form').addEventListener('input', resetResult);
$('check-form').addEventListener('submit', event => {
  event.preventDefault();
  showResult(checkAvailability({
    now: readMinutes('now'),
    start: readMinutes('start'),
    duration: readMinutes('duration'),
    blocked: isBlocked(),
    bookings: BOOKINGS,
  }));
});
renderRoom();

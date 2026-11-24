import { validateAvailability } from './validation.js';
import { rooms, formatTime } from './rooms.js';
import { explanationLabel } from './explain-ui.js';
const $ = id => document.getElementById(id);
const readMinutes = id => $(id).value.trim() === '' ? NaN : Number($(id).value);
const EXPLAIN_TIMEOUT_MS = 5000;
const EXPLANATION_SOURCES = ['mock', 'llm', 'fallback'];
let explainRequestId = 0; // ignores replies that arrive after the inputs changed
function updateTimeHints() {
  for (const id of ['now', 'start', 'end']) {
    const value = readMinutes(id);
    const clock = formatTime(value);
    $(id + '-clock').textContent = clock ? `${clock}${value === 1440 ? ' · midnight at end of day' : ''}` : 'Enter a valid whole-minute time.';
  }
}
function resetExplanation() {
  explainRequestId += 1;
  $('explain-button').disabled = true;
  $('explanation').hidden = true;
  $('explanation-text').textContent = '';
  $('explanation-source').textContent = '';
}
function resetResult() {
  updateTimeHints();
  $('result').removeAttribute('data-available');
  $('decision').textContent = 'Ready to check';
  $('feedback').textContent = 'Choose an interval and check its availability.';
  resetExplanation();
}
function renderRoom() {
  const room = rooms[$('room').value];
  $('room-number').textContent = $('room').value;
  $('room-state').textContent = room.blocked ? 'Blocked · unavailable for use' : 'Open for availability checks';
  $('bookings').replaceChildren(...room.bookings.map(([s,e]) => {
    const li = document.createElement('li');
    li.textContent = `${formatTime(s)}–${formatTime(e)} · occupied (${s}–${e} min)`;
    return li;
  }));
  resetResult();
}
function showExplanation(text, source, kind = '') {
  $('explanation').hidden = false;
  $('explanation-label').textContent = explanationLabel(kind); // review fix M1: fallback is not labelled AI
  $('explanation-text').textContent = text; // textContent only: model output is untrusted
  $('explanation-source').textContent = source;
}
// Fetches an explanation. Never touches #result: the confirmed status stays as computed.
async function explain() {
  const requestId = ++explainRequestId;
  const payload = { room: $('room').value, start: readMinutes('start'), end: readMinutes('end'), now: readMinutes('now') };
  $('explain-button').disabled = true;
  showExplanation('Loading explanation…', '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXPLAIN_TIMEOUT_MS);
  let text = 'Explanation unavailable.';
  let source = '';
  let kind = '';
  try {
    const response = await fetch('/api/explain', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (response.status === 400) {
      text = 'Explanation unavailable: enter whole minutes between 0 and 1440 in all fields.';
    } else if (response.ok && data && typeof data.explanation === 'string' && data.explanation.length <= 300
      && EXPLANATION_SOURCES.includes(data.source)) {
      text = data.explanation;
      kind = data.source;
      source = data.source === 'fallback' ? 'Source: standard rule text' : `Source: ${data.source === 'llm' ? 'language model' : 'mock model'}`;
    }
  } catch {
    // Network error or timeout: keep the "unavailable" text.
  } finally {
    clearTimeout(timer);
  }
  if (requestId !== explainRequestId) return; // inputs changed meanwhile
  showExplanation(text, source, kind);
  $('explain-button').disabled = false;
}
$('room').addEventListener('change', renderRoom);
$('check-form').addEventListener('input', resetResult);
$('check-form').addEventListener('submit', event => {
  event.preventDefault();
  const room = rooms[$('room').value];
  const result = validateAvailability(readMinutes('start'), readMinutes('end'), readMinutes('now'), room.blocked, room.bookings);
  $('result').dataset.available = String(result.available);
  $('decision').textContent = result.available ? 'Available' : 'Unavailable';
  const start = readMinutes('start');
  const end = readMinutes('end');
  const interval = formatTime(start) && formatTime(end) && end > start
    ? `${formatTime(start)}–${formatTime(end)} (${end - start} min). ` : '';
  $('feedback').textContent = interval + result.message;
  resetExplanation();
  $('explain-button').disabled = false;
});
$('explain-button').addEventListener('click', explain);
renderRoom();

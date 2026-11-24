// explain-ui.js — label for the explanation box (review fix M1, AC5).
// The deterministic fallback is rule text and must never be labelled as AI output.
const LABELS = Object.freeze({
  llm: 'AI-generated explanation – not a booking status',
  mock: 'AI-generated explanation (mock) – not a booking status',
  fallback: 'Standard explanation (rule text, not AI) – not a booking status',
});
export function explanationLabel(source) {
  return Object.hasOwn(LABELS, source) ? LABELS[source] : 'Explanation – not a booking status';
}

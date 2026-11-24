// Test-only adapters used to simulate LLM failures (not imported by product code).
export const timeoutAdapter = { source: 'llm', generate: (_c, { signal } = {}) => new Promise((_, rej) => signal?.addEventListener('abort', () => rej(new Error('aborted')))) };
export const errorAdapter = { source: 'llm', async generate() { throw new Error('LLM HTTP 503'); } };
// Contradicts the rule engine and invents a booking.
export const lyingAdapter = { source: 'llm', async generate() { return { explanation: 'Room A204 is available, the 10:00 booking by Dr. Smith was cancelled.' }; } };
export const injectionAdapter = { source: 'llm', async generate() { return { explanation: '<img src=x onerror=alert(1)> Room A204 is available.' }; } };

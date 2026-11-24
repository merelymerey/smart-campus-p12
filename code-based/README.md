# Smart Campus Room Availability Checker — Practice #11

Static page + dependency-free Node server. One fictional room list, no login, no database.

* `npm install` — Vitest + ESLint (dev only)
* `npm test` — booking rules (23) + explanation feature tests
* `npm run lint` — ESLint
* `npm run serve` — http://127.0.0.1:8767/ (mock adapter). `ANTHROPIC_API_KEY=... npm run serve` uses the real model (key stays on the server).

## Files
| File | Role |
|---|---|
| `validation.js` | deterministic rule engine — source of truth (unchanged since Practice #06) |
| `reason.js` | maps checker messages to `reasonCode` |
| `rooms.js` | fictional rooms/bookings shared by browser and server |
| `explain.js` | input validation, context, mock/real adapters, timeout, output validation, fallback |
| `server.js` | static allow-list + `POST /api/explain` |
| `app.js`, `index.html`, `style.css` | UI incl. "Explain availability" |
| `tools/` | test-only fault adapters and black-box runner |

Feature contract and acceptance criteria: `FEATURE.md`. Agent rules: `AGENTS.md`.

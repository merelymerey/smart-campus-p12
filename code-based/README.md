# Smart Campus Room Availability Checker — Practice #12 (code-based)

Purely static page (works on GitHub Pages) implementing the shared contract in
`../contract/CONTRACT.md`. One fictional room (A204), one fictional booking (10:00–11:00),
no login, no database, no server-side logic. A check never creates, changes or deletes a booking.

* `npm install` — Vitest + ESLint (dev only)
* `npm test` — frozen baseline rule tests (`booking.test.js`) + contract tests (`contract.test.js`)
* `npm run lint` — ESLint
* `npm run serve` — local preview at http://127.0.0.1:8770/ (dependency-free static server)

## Layers and files
| Layer | File | Role |
|---|---|---|
| rule engine | `validation.js` | frozen deterministic rules (`validateAvailability`), unchanged since Practice #06 |
| (1) input validation + (2) availability | `contract.js` | `checkAvailability({ now, start, duration, blocked, bookings })` → `{ available, reasonCode, message }`, `decisionLabel(reasonCode)`; DOM-free, delegates the decision to `validateAvailability` |
| data | `data.js` | fixed fictional data: room `A204`, bookings `[[600, 660]]` (deeply frozen) |
| (3) UI display | `app.js`, `format.js`, `index.html`, `style.css` | reads inputs, shows decision / reason code / message with `textContent` |
| preview only | `serve.js` | static allow-list server on 127.0.0.1:8770 (not needed for GitHub Pages) |

The Practice #11 "Explain availability" feature (LLM explanation, API server) is out of scope for
Practice #12 and has been removed. Agent rules: `AGENTS.md`.

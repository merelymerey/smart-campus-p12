# AGENTS.md — Smart Campus Room Availability Checker

Rules for any AI agent (coding or review) working in this repository.

1. `validation.js` (`validateAvailability`) is the single source of truth for availability.
   Do not change it or `booking.test.js`. `contract.js` must delegate the decision to it.
2. The contract (`../contract/CONTRACT.md`, `../contract/test-cases.json`) is fixed: do not edit it
   or weaken its six acceptance criteria to make an implementation pass.
3. Keep the layers separate: input validation + availability in `contract.js` (no DOM),
   fixed fictional data in `data.js`, display only in `app.js`.
4. One room (A204), fictional bookings, no login, no database, no real personal data.
   Bookings are read-only: no code may add, change or remove a booking.
5. The page must stay purely static (GitHub Pages): no server-side logic, no API calls, no secrets.
6. User input is untrusted: render all text with `textContent` (never `innerHTML`).
7. Every change must keep `npm test` and `npm run lint` green. Add tests for new behaviour.
8. Reviewers are read-only: report findings with file/line evidence; do not edit or merge.

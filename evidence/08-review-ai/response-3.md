I reviewed the code and evidence without changing any files. One gap: I didn't open `contract.test.js` or `serve.js`, so claims that depend on them are flagged as unverified.

## 1. Correctness

**Both apps pass T1–T8 in the browser.** Both evidence files show the expected decision, reason code and message for every case, and T8 shows the booking list unchanged (`evidence/05-tests/*-ui-results.json`).

**The rule order is the same in both.**
- **Code-based:** `contract.js:80-81` checks rules 1–2, then hands rules 3–8 to the unmodified baseline engine (`validation.js:6-16`). Its `start >= end` check can't fire once duration > 0 is confirmed.
- **Low-code:** `Rules.js:53-73` checks rules 1–8 in contract order.

**The messages are identical** (`contract.js:12-21` and `Rules.js:6-15`). The baseline engine uses different wording (e.g. `validation.js:13`, "Choose another room"), but `contract.js:36-43` maps it back to the contract text.

**Behaviour differences the T-cases don't reveal:**
- **Bad "blocked" value:** `contract.js:76` throws an error if `blocked` isn't true/false. `Rules.js:65` (`blocked === true`) treats any other value as open. That fails open: the room would show Available.
- **Unknown result:** `contract.js:86-89` refuses to show "Available" if the engine returns something unexpected. `Rules.js:42-44` just returns nothing.
- **Bookings protection:** `data.js:8` locks the bookings so code can't change them. `Rules.js:4` is an ordinary editable list, kept read-only only by a comment.
- **AC5 in low-code:** defect D2 means the old decision stays on screen after an input changes, so the decision shown can be wrong (`06-effort-and-defects.md:45`).
- **AC6:** rules 1 and 3 aren't in T1–T8. The code-based results include extra probes for them (empty, `-5`, `2000`, `1400`). The low-code app has a `selfTest` with extra cases X1–X5 (`Rules.js:103-108`), but no output from it is saved.
- **Both** accept `1e2` as 100 (Q1).

## 2. Risks

| Risk | Impl. | Why it matters | Evidence that would verify it | Present? |
|---|---|---|---|---|
| Old decision stays after an edit (D2) | Low-code | A student may act on an "Available" that no longer applies | Recording: run T1, change Start to 630, don't press Check | Partly (logged, no capture) |
| Blocked check fails open | Low-code | If the radio option is renamed, a blocked room shows Available | Unit test `evaluate(...,'true')`; the binding `=== 'Blocked'` checked against the option values | Partly (options and binding match today) |
| Bookings list can be changed | Low-code | A future action or binding could alter it; T8 covers only one session | Search of the export for writes to `BOOKINGS`; T8 repeated after other actions | Partly |
| Public hosting / who can edit | Low-code | `isPublic:true` on the Appsmith Cloud free plan; vendor-controlled; who can edit is unknown | Workspace member list, sharing and SSO settings, audit log, vendor data-processing terms | Partly (`isPublic` in export only) |
| Rules 1 and 3 untested in the low-code UI | Low-code | AC6 isn't proven there | Saved `selfTest` output plus UI runs with `abc`, empty and `1400` | No |
| Mobile layout cut off (D3) | Low-code | Students on phones can't read labels or the button | Screenshot at 390 px | Yes (cited; I didn't open the file) |
| Tooling vulnerabilities | Code-based | Audit was clean only once; `^` version ranges can drift | `npm ci && npm audit` in CI; proof `serve.js` doesn't serve `node_modules` | Partly (one clean audit) |
| Platform lock-in | Low-code | Widgets and bindings only work in Appsmith (export schema v13); only `Rules.js` is portable | Import into a fresh or self-hosted Appsmith and re-run T1–T8 | No |

## 3. Unsupported assumptions

- **Same test results don't mean the two are equivalent.** There is no side-by-side test of `contract.js` and `Rules.js` over many inputs, only 8 cases.
- **Effort figures** are minutes with an AI agent operating the tools, measured once. The low-code time includes automation drag-and-drop failures. They don't predict how long a person would take, and they say nothing about cost such as hosting, plan limits, licences or upkeep.
- **Security:** nobody reviewed either app's code for vulnerabilities, scanned the running app, checked HTTP headers or Appsmith's own security. "Low-code" doesn't mean secure; "npm audit = 0" covers only known issues in dependencies, at one moment.
- **"Dev-only, never served"** for the vulnerable tooling isn't shown; I didn't read `serve.js`.
- **T8** shows the data was unchanged, not that it can't be changed (true only for code-based, via `data.js`).
- **Production fit:** the "current time" is typed in by the user, there's one room, one day and hard-coded bookings. Nothing shows the apps work with real data, a server clock, or several users.
- **Accessibility** (screen reader, keyboard) wasn't tested. Code-based has a live result region in its markup; whether the low-code app has one is unknown.
- The two runs used different browser tools and screen widths, so the conditions weren't the same.

## 4. Recommendation

Neither version is ready for production: both trust a time the user types in and use hard-coded bookings. Use the code-based `contract.js` as the reference rule set, because it locks the data and refuses to show "Available" when something unexpected happens. Move the rule check to a server that uses the server's clock and the campus's real booking source. Keep it in version control with CI running the tests, `npm ci` and `npm audit`. If the campus prefers Appsmith for staff to maintain the screens, use it only as a front end that calls that same server. That means fixing D2 and D3, changing `blocked === true` to fail closed, restricting access instead of a public link, and checking the vendor's terms or self-hosting. Before go-live, collect the evidence marked "No" or "Partly" in the table.
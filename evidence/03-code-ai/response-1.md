I've implemented the contract in `code-based`. `npm test` passed (94 tests) and `npm run lint` reported no problems. I haven't checked the page in a browser: browser access wasn't granted, so the layout at 1280 px and 390 px is untested. `validation.js`, `booking.test.js` and the `contract/` files are unchanged (`git diff HEAD` shows no differences for them).

## How it works
- **Validation (rules 1–2):** `checkAvailability` in `contract.js` rejects bad input and a duration of 0 or less. The frozen engine has no duration-only check and its messages differ from the contract's, so this step can't come from it.
- **Availability (rules 3–8):** it then calls `validateAvailability(start, start + duration, now, blocked, bookings)` with the bookings untouched, and translates the engine's message into the contract's `reasonCode` and message. If the engine ever returns a message it doesn't recognise, it throws an error rather than showing a decision.
- **Display:** `app.js` only reads the inputs and writes `#decision`, `#reason-code` and `#feedback` with `textContent`.

## Files changed
- **Added:**
  - `contract.js`: validation, calling the engine, and the message and decision tables.
  - `data.js`: room `A204` and bookings `[[600, 660]]`, fully frozen.
  - `format.js`: time formatting for the page. I added this file so the booking text shown on screen can be tested without a browser.
  - `serve.js`: local preview server on 127.0.0.1:8770 that only serves a fixed list of files.
  - `contract.test.js`: the new tests.
- **Rewritten:**
  - `index.html`: one room, the "Room status" Open/Blocked control, the duration input and `#reason-code`. The required input and result ids are in place.
  - `app.js`: display only.
- **Edited:**
  - `style.css`: the explain styles are gone and a reason-code style is added. The rest of the visual style and the existing narrow-screen layout are kept.
  - `package.json`: version 0.12.0, new description, `serve` now runs `node serve.js`.
  - `package-lock.json`: version only.
  - `README.md` and `AGENTS.md`.
- **Deleted** with `git rm`, which also staged these deletions: `explain.js`, `explain-ui.js`, `explain.test.js`, `server.js`, `server.test.js`, `review-fixes.test.js`, `reason.js`, `rooms.js`, `FEATURE.md`, `tools/`.

Nothing is committed.

## Observed output
```
> smart-campus-availability@0.12.0 test
> vitest run

 RUN  v3.2.7 /Users/admin/Downloads/SE-Practice-12/code-based

 ✓ booking.test.js (23 tests) 3ms
 ✓ contract.test.js (71 tests) 7ms

 Test Files  2 passed (2)
      Tests  94 passed (94)
```
```
> smart-campus-availability@0.12.0 lint
> eslint .
```
Lint printed nothing beyond the header, which means no problems.

`npm run serve` started and printed `Smart Campus preview: http://127.0.0.1:8770/`. The commands to request pages from it needed approval I didn't get, so I haven't confirmed it serves them. I stopped the server afterwards.

## What `contract.test.js` covers
- **T1–T7b:** read from `test-cases.json`, checking `available`, `reasonCode`, the message and the decision label for each.
- **T7:** passes only if both adjacent rows pass.
- **T8:** a modifiable copy of the bookings is still `[[600, 660]]` (same arrays) after all the cases. The frozen data used by the page can't be changed, and its booking text is `10:00–11:00`.
- **Engine use:** checks that `validateAvailability` is called with exactly those arguments and the same bookings array. The tests wrap the real function, so every decision still comes from the unchanged engine.
- **Edge cases and rule order:** the limits of each rule (for example 120 vs 121 minutes, start equal to now, intervals that only touch a booking, ending exactly at 24:00), and one test per adjacent pair of rules for which one wins.
- **Tables:** the messages and decision labels match the contract exactly.

## Limitations
1. **Nothing checked in a browser.** No test loads the page itself, because there's no DOM test library and I didn't add one. I haven't looked at the layout or tried the checks on the live page at either width.
2. **T8 on screen is only partly tested.** The tests check the booking text the page would display, not the rendered list.
3. **Depends on the engine's wording.** Turning the engine's answer into a `reasonCode` relies on its exact message text. If `validation.js` were ever changed, the check would throw an error rather than give a wrong answer, and the tests would catch it.
4. **Messages are copied into `contract.js`.** The page doesn't read `test-cases.json` at runtime, so the messages are duplicated in code; a test keeps them identical to the JSON.
5. **Program errors throw instead of returning a result.** A `blocked` value that isn't true/false, or bookings that aren't a list, cause an error. These can't come from the form.
6. **Number entry quirks.** `Number()` turns typed text like `1e2` into 100, and a whole number counts as valid. Some browsers also give an empty value for non-numeric text in number fields, which then shows as Invalid input.
7. **Preview server is local only.** It serves a fixed list of files, has no tests, and isn't needed on GitHub Pages.
8. **Scope.** It covers one day and one room, and it never saves a booking.
# Effort and defects — measured on 24 Nov 2026

Source of the times: `evidence/timelog.txt` (written with `date` at each step), the wall-clock
seconds reported by the two AI sessions, and the modification times of the screenshot files.
All work in both tools was operated by an AI coding agent (Claude Code) under the student's
supervision, so these are **agent-operated minutes**, not the minutes a person would need.

## Shared (not charged to either approach)

| Step | Time |
|---|---|
| Freeze baseline (version record, 116 tests, lint, screenshot) + write contract and test inputs | 14:49:52 – 14:51:10 = 1.3 min |

## Code-based (local HTML/JavaScript)

| Phase | Measured | How |
|---|---|---|
| Setup | 0.3 min | `npm install`, 14:51:10 – 14:51:28 |
| Implementation | 3.5 min | AI session 199 s (wrote code + 71 new unit tests and ran them) + 12 s review and commit |
| Debugging (functional) | 0 min | no functional defect was found |
| Repair (security, SCA) | 0.4 min | Vitest 3.2.7 → 5.1.1, 14:55:45 – 14:56:08 |
| Testing | 0.4 min | T1–T8 through the real page at 1280 px and 390 px, 14:54:59 – 14:55:24 |
| **Build + repair** | **4.2 min** | setup + implementation + repair |

Acceptance tests passed: **8 / 8**. Unresolved defects: **0** (one known quirk: the text `1e2` is read as 100).

## Low-code (Appsmith Cloud, free plan)

| Phase | Measured | How |
|---|---|---|
| Waiting for the student to sign in | 5.5 min, **not counted** | 14:59:22 – 15:04:53 |
| Design | 2.0 min | AI session 118 s that produced the build instructions and the `Rules` script |
| Setup + implementation | 7.9 min | create app, drag 10 widgets, paste `Rules`, set properties and bindings, first deploy: 15:04:53 – 15:12:48. Creating the app took well under a minute of this (not stamped separately). |
| Debugging / repair | about 1 min | defect D1 found 15:13:06, first passing check on the redeployed app 15:14 (screenshot file time) |
| Testing | about 2 min | T1–T2 at 15:14, T3–T7b at 15:18; about 3 min in between were lost to a browser-extension reconnect and are not counted |
| **Build + repair** | **about 10.9 min** | design + setup/implementation + repair |

Acceptance tests passed: **8 / 8** (after the D1 repair). Unresolved defects: **2** (D2, D3).

## Defects

| ID | Where | What was observed | Status |
|---|---|---|---|
| D1 | Low-code | After the first deploy the Start and Duration fields were empty although 720 and 60 had been entered in the editor. Cause: two properties of one widget were written in the same instant by the automation and the second save overwrote the first. | Repaired (values re-entered one at a time, saved state checked by reloading the editor, redeployed). `screenshots/low-D1-defaults-missing-after-deploy.jpg` |
| D2 | Low-code | The old decision stays on screen after an input is edited, until Check is pressed again. The code-based page resets the result on every edit. Not one of T1–T8. | Unresolved (would need an `onTextChanged` action on three widgets and `onSelectionChange` on one). |
| D3 | Low-code | At 390 px the fixed-grid canvas only shrinks: labels are cut ("Curren…"), the button reads "Che…", the table is cropped. No horizontal page scroll. | Unresolved (platform layout limit of the classic canvas). `screenshots/low-public-anonymous-390.png` |
| S1 | Code-based | `npm audit`: 3 advisories (2 critical, 1 moderate) in the test tooling (Vitest / tinypool). Dev-only, never served to the browser. | Repaired: Vitest 5.1.1, `npm audit` = 0, 94 tests still pass. |
| Q1 | Both | Typing `1e2` as duration is accepted as 100 → Available (JavaScript `Number()`), `60.5` is rejected. Same behaviour in both. | Left as is; documented. |

## Runs that were lost or repeated (reported for honesty)

* Several widget drags in Appsmith landed in the wrong place or created the wrong widget (an Icon
  button instead of a Button; the table pushed two widgets aside). They were deleted and re-added.
  This rework is inside the 7.9 min.
* Dragging an existing widget to a new position did not work through the automation; widgets were
  deleted and dropped again instead.

# Shared contract — Smart Campus Room Availability Checker (Practice #12)

One sheet for **both** implementations (code-based and low-code). Written before either was built.
Nothing here may be changed to make one approach look better.

## User story

> As a student, I want to enter a future start time and a duration for the campus study room and
> immediately see whether the room is **Available** or **Unavailable** and why, so that I can pick a
> time that works — without creating, changing or deleting any booking.

## Acceptance criteria

| ID | Criterion |
|----|-----------|
| AC1 | Start time must be in the future (strictly after the supplied current time). |
| AC2 | Duration must be greater than zero and at most 120 minutes. |
| AC3 | An interval that overlaps an existing booking is unavailable. |
| AC4 | A blocked room is unavailable. |
| AC5 | A clear decision is displayed and the existing bookings are not changed. |
| AC6 | Invalid input receives understandable feedback. |

## Fixed fictional data

| Item | Value |
|------|-------|
| Room | `A204` (study room) — fictional |
| Existing bookings | one: `[600, 660)` = 10:00–11:00 (same data as the frozen baseline) |
| Time model | whole minutes after midnight on one day; an interval includes its start and excludes its end, so touching intervals do **not** overlap |

No real people, no login, no payment, no production database.

## Inputs

| Name | Type | Meaning | Valid range |
|------|------|---------|-------------|
| `now` | whole number | supplied current time (kept from the baseline so that tests are repeatable) | 0…1439 |
| `start` | whole number | requested start time | 0…1439 |
| `duration` | whole number | requested length in minutes | 1…120 |
| `blocked` | boolean | room status: `false` = open, `true` = blocked | — |
| `bookings` | list of `[start, end]` | the fixed fictional bookings above; read-only | — |

Derived: `end = start + duration`.

## Outputs

| Name | Type | Meaning |
|------|------|---------|
| `available` | boolean | `true` only when every rule passes |
| `reasonCode` | string | which rule decided (table below) |
| `message` | string | the visible sentence shown to the student |

The screen also shows a one-word **decision** derived from `reasonCode`:
`Available`, `Unavailable` (a rule about the room said no) or `Invalid input` (a validation error).

## Rules, in the order they are checked

The order is the order of the frozen baseline rule engine (`validation.js`), which is not modified.

| # | Condition | `available` | `reasonCode` | Decision shown | Visible `message` |
|---|-----------|-------------|--------------|----------------|-------------------|
| 1 | `now`, `start` or `duration` is empty / not a whole number, or `now` or `start` is outside 0…1439 | false | `INVALID_INPUT` | Invalid input | Enter whole minutes. Current time and start must be between 0 and 1439. |
| 2 | `duration <= 0` | false | `INVALID_DURATION` | Invalid input | Duration must be greater than zero. |
| 3 | `start + duration > 1440` | false | `OUT_OF_DAY` | Invalid input | The interval must end by 24:00 on the same day. |
| 4 | `start <= now` | false | `PAST_TIME` | Invalid input | Start must be after the supplied current time. |
| 5 | `duration > 120` | false | `TOO_LONG` | Invalid input | Choose a duration of 120 minutes or less. |
| 6 | `blocked` is true | false | `ROOM_BLOCKED` | Unavailable | This room is blocked and cannot be used. |
| 7 | some booking `[s, e)` has `start < e` and `s < start + duration` | false | `OVERLAP` | Unavailable | This interval overlaps an existing booking. |
| 8 | otherwise | true | `AVAILABLE` | Available | The room is available. No booking has been saved. |

AC mapping: AC1 → rule 4; AC2 → rules 2 and 5; AC3 → rule 7; AC4 → rule 6; AC5 → the decision
column and "bookings is read-only"; AC6 → rules 1–5 messages.

## Common test inputs (prepared before implementation)

Machine-readable copy: [`test-cases.json`](test-cases.json). `now = 540` (09:00) in every case.

| ID | From the slide | `start` | `duration` | `blocked` | Expected decision | Expected `available` | Expected `reasonCode` |
|----|----------------|---------|------------|-----------|-------------------|----------------------|-----------------------|
| T1 | valid free interval | 720 (12:00) | 60 | false | Available | true | `AVAILABLE` |
| T2 | overlap with an existing booking | 630 (10:30) | 60 | false | Unavailable | false | `OVERLAP` |
| T3 | blocked room | 720 (12:00) | 60 | true | Unavailable | false | `ROOM_BLOCKED` |
| T4 | duration = 0 | 720 | 0 | false | Invalid input | false | `INVALID_DURATION` |
| T5 | duration = 121 minutes | 720 | 121 | false | Invalid input | false | `TOO_LONG` |
| T6 | past start time | 500 (08:20) | 60 | false | Invalid input | false | `PAST_TIME` |
| T7a | adjacent, starts when the booking ends | 660 (11:00) | 60 | false | Available | true | `AVAILABLE` |
| T7b | adjacent, ends when the booking starts | 570 (09:30) | 30 | false | Available | true | `AVAILABLE` |
| T8 | booking data unchanged after checks | — | — | — | after T1–T7 the booking list is still exactly `[[600, 660]]` (data and what the screen shows) | — | — |

T7 has two rows (both sides of the booking); it counts as one test and passes only if both pass.
The expected visible message for each case is the message of its `reasonCode` in the rules table.

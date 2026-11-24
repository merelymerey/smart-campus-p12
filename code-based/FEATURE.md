# Task #02 — Feature definition: "Explain availability"

**User story.** As a student, I want a short explanation of room availability so I understand the decision.

## Flow (trust boundary)
```
Browser (untrusted input)                    | Server (trusted)
---------------------------------------------+----------------------------------------------
room, now, start, end  --> validateAvailability (rule engine, deterministic, source of truth)
                           -> {available, reasonCode, message} -> UI shows CONFIRMED status
"Explain availability" click
   POST /api/explain {room, start, end} ---->| 1. validate input (types, ranges, size <= 1 KB)
                                             | 2. RE-RUN validateAvailability on server data
                                             |    (client never supplies isAvailable)
                                             | 3. build structured context
                                             |    {room, start, end, isAvailable, reasonCode}
                                             | 4. LLM adapter (mock by default; real only if
                                             |    API key set on server) with timeout
                                             | 5. validate output {explanation:string},
                                             |    <= 2 sentences, <= 300 chars, agrees with
                                             |    isAvailable  -> else deterministic fallback
   <---- {explanation, source: mock|llm|fallback, isAvailable}
UI shows explanation in a separate box labelled "AI-generated explanation – not a booking status"
```

## Contract
| | |
|---|---|
| Input | `room` ("A204"/"B101"), `start`, `end` (int minutes), `now` (int minutes) |
| Context to LLM | `room`, `start`, `end` (HH:MM), `isAvailable` (bool), `reasonCode` (enum) — nothing else, no personal data |
| reasonCode | `AVAILABLE`, `INVALID_INPUT`, `INVALID_RANGE`, `PAST_TIME`, `TOO_LONG`, `ROOM_BLOCKED`, `OVERLAP` |
| Output | `{ explanation: string }`, 1–300 chars, at most 2 sentences, plain text |
| Fallback | deterministic sentence built from reasonCode, `source: "fallback"` |

## Acceptance criteria
- AC1 Existing availability and overlap rules unchanged (old 23 tests still pass, `validation.js` rules untouched).
- AC2 Explanation agrees with the deterministic result; no invented booking details.
- AC3 Empty, malformed or overly long input is rejected (HTTP 400, no LLM call).
- AC4 Timeout, API error or missing key → safe deterministic fallback.
- AC5 Generated explanation is visually and textually separated from the confirmed status.

## Failure behaviour
| Failure | Behaviour |
|---|---|
| bad JSON / missing / oversize body | 400 `{error}`; status card unchanged |
| LLM timeout (> 3 s) / error / no key | 200 with fallback explanation, `source:"fallback"` |
| LLM says "available" while rule says unavailable (or vice versa), too long, >2 sentences | rejected → fallback |
| network error in browser | UI shows "Explanation unavailable", confirmed status unchanged |

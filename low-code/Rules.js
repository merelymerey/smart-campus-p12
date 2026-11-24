export default {
  // ---- Fixed fictional data (read-only: no function in this object writes to it) ----
  ROOM: 'A204',
  BOOKINGS: [[600, 660]], // [start, end) in minutes after midnight = 10:00–11:00

  MESSAGES: {
    INVALID_INPUT: 'Enter whole minutes. Current time and start must be between 0 and 1439.',
    INVALID_DURATION: 'Duration must be greater than zero.',
    OUT_OF_DAY: 'The interval must end by 24:00 on the same day.',
    PAST_TIME: 'Start must be after the supplied current time.',
    TOO_LONG: 'Choose a duration of 120 minutes or less.',
    ROOM_BLOCKED: 'This room is blocked and cannot be used.',
    OVERLAP: 'This interval overlaps an existing booking.',
    AVAILABLE: 'The room is available. No booking has been saved.'
  },

  DECISIONS: {
    INVALID_INPUT: 'Invalid input',
    INVALID_DURATION: 'Invalid input',
    OUT_OF_DAY: 'Invalid input',
    PAST_TIME: 'Invalid input',
    TOO_LONG: 'Invalid input',
    ROOM_BLOCKED: 'Unavailable',
    OVERLAP: 'Unavailable',
    AVAILABLE: 'Available'
  },

  // ---- Pure helpers ----
  // Returns an integer, or null if the value is empty / not a whole number.
  // Same parsing as the code-based version (contract.js parseMinutes): trim, empty -> invalid, Number().
  toWhole(raw) {
    const s = String(raw === undefined || raw === null ? '' : raw).trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isInteger(n) ? n : null;
  },

  outcome(code) {
    return { available: code === 'AVAILABLE', reasonCode: code, message: this.MESSAGES[code] };
  },

  decisionOf(code) {
    return this.DECISIONS[code];
  },

  // ---- Deterministic rules, in contract order. Does not read widgets, does not write anything. ----
  evaluate(nowRaw, startRaw, durationRaw, blocked, bookings) {
    const list = bookings === undefined ? this.BOOKINGS : bookings;
    const now = this.toWhole(nowRaw);
    const start = this.toWhole(startRaw);
    const duration = this.toWhole(durationRaw);

    // 1
    if (now === null || start === null || duration === null ||
        now < 0 || now > 1439 || start < 0 || start > 1439) return this.outcome('INVALID_INPUT');
    // 2
    if (duration <= 0) return this.outcome('INVALID_DURATION');
    // 3
    if (start + duration > 1440) return this.outcome('OUT_OF_DAY');
    // 4
    if (start <= now) return this.outcome('PAST_TIME');
    // 5
    if (duration > 120) return this.outcome('TOO_LONG');
    // 6
    if (blocked === true) return this.outcome('ROOM_BLOCKED');
    // 7  half-open intervals: touching does not overlap
    const end = start + duration;
    for (let i = 0; i < list.length; i++) {
      const s = list[i][0], e = list[i][1];
      if (start < e && s < end) return this.outcome('OVERLAP');
    }
    // 8
    return this.outcome('AVAILABLE');
  },

  // ---- Read-only views for the screen (return copies, never the original array) ----
  getBookings() {
    return this.BOOKINGS.map(b => [b[0], b[1]]);
  },

  fmt(m) {
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  },

  bookingRows() {
    return this.BOOKINGS.map(b => ({
      room: this.ROOM, from: this.fmt(b[0]), to: this.fmt(b[1]), startMin: b[0], endMin: b[1]
    }));
  },

  // ---- In-app self-test: open this JSObject, select selfTest, press Run, read the Response ----
  selfTest() {
    const before = JSON.stringify(this.BOOKINGS);
    const cases = [
      ['T1', '540', '720', '60', false, 'AVAILABLE'],
      ['T2', '540', '630', '60', false, 'OVERLAP'],
      ['T3', '540', '720', '60', true, 'ROOM_BLOCKED'],
      ['T4', '540', '720', '0', false, 'INVALID_DURATION'],
      ['T5', '540', '720', '121', false, 'TOO_LONG'],
      ['T6', '540', '500', '60', false, 'PAST_TIME'],
      ['T7a', '540', '660', '60', false, 'AVAILABLE'],
      ['T7b', '540', '570', '30', false, 'AVAILABLE'],
      // Extra, NOT part of the contract's T1–T8: rules 1 and 3 are otherwise never exercised
      ['X1', '540', 'abc', '60', false, 'INVALID_INPUT'],
      ['X2', '540', '', '60', false, 'INVALID_INPUT'],
      ['X3', '540', '1440', '10', false, 'INVALID_INPUT'],
      ['X4', '540', '1400', '60', false, 'OUT_OF_DAY'],
      ['X5', '540', '720', '12.5', false, 'INVALID_INPUT']
    ];
    const rows = cases.map(c => {
      const r = this.evaluate(c[1], c[2], c[3], c[4]);
      const pass = r.reasonCode === c[5] &&
                   r.available === (c[5] === 'AVAILABLE') &&
                   r.message === this.MESSAGES[c[5]];
      return { id: c[0], expected: c[5], actual: r.reasonCode, decision: this.decisionOf(r.reasonCode), pass };
    });
    const after = JSON.stringify(this.BOOKINGS);
    rows.push({ id: 'T8', expected: '[[600,660]]', actual: after, pass: before === after && after === '[[600,660]]' });
    return { allPass: rows.every(r => r.pass), rows };
  }
};

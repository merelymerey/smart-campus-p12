// data.js — the fixed fictional data of the Practice #12 contract.
// One study room, one existing booking [600, 660) = 10:00–11:00.
// Deeply frozen: no code path can add, change or remove a booking.
// No real people, no login, no database.

export const ROOM = 'A204';

export const BOOKINGS = Object.freeze([Object.freeze([600, 660])]);

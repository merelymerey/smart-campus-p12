// rooms.js — the single fictional room list, shared by the browser (app.js)
// and the server (server.js). No real people, no database.
export const rooms = Object.freeze({
  A204: Object.freeze({ blocked: false, bookings: Object.freeze([Object.freeze([600, 660])]) }),
  B101: Object.freeze({ blocked: true, bookings: Object.freeze([Object.freeze([600, 660])]) }),
});

export const ROOM_IDS = Object.freeze(Object.keys(rooms));

// Minutes after midnight -> "HH:MM", or null when not a valid same-day time.
export function formatTime(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

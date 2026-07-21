// Weekly movie-picker rotation helper.
// Anchored to a fixed Monday so the rotation is stable and deterministic
// for everyone, without needing to store anything in the database.
const EPOCH_START = new Date("2024-01-01T00:00:00.000Z"); // a Monday
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Fixed weekly picking order, requested explicitly (by exact username).
// Any profile not in this list (e.g. a brand new member) is appended
// afterward in signup order, so the rotation still works for everyone.
const ROTATION_ORDER = ["squishy king", "Jon", "E$", "MethGator", "Griffin"];

function getWeekIndex(date = new Date()) {
  return Math.floor((date.getTime() - EPOCH_START.getTime()) / WEEK_MS);
}

function getWeekRange(date = new Date()) {
  const idx = getWeekIndex(date);
  const start = new Date(EPOCH_START.getTime() + idx * WEEK_MS);
  const end = new Date(start.getTime() + WEEK_MS - 1);
  return { start, end };
}

function getCurrentPicker(profiles, date = new Date()) {
  if (!profiles || profiles.length === 0) return null;

  const byUsername = new Map(profiles.map((p) => [p.username, p]));
  const ordered = [];

  for (const name of ROTATION_ORDER) {
    const match = byUsername.get(name);
    if (match) {
      ordered.push(match);
      byUsername.delete(name);
    }
  }

  const rest = [...byUsername.values()].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
  ordered.push(...rest);

  if (ordered.length === 0) return null;

  const idx = getWeekIndex(date);
  const pickerIndex = ((idx % ordered.length) + ordered.length) % ordered.length;
  return ordered[pickerIndex];
}

module.exports = { getWeekIndex, getWeekRange, getCurrentPicker };

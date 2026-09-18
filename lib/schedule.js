// Movie-picker rotation helper.
//
// The picker advances ONLY when a movie night is actually held (each held
// night is recorded as a row in the `movie_nights` table). It does NOT
// advance automatically every calendar week, so skipping a week never
// burns anyone's turn — the same person stays "up next" until the group
// logs a night with the "We watched one" button.

// Fixed picking order, by exact username. Any profile not listed here
// (e.g. a brand new member) is appended afterward in signup order, so the
// rotation still works for everyone.
const ROTATION_ORDER = ["squishy king", "Jon", "E$", "MethGator", "Griffin"];

// Build the full rotation order: the fixed names first (in the order
// above), then anyone else sorted by when they signed up.
function getOrderedProfiles(profiles) {
  if (!profiles || profiles.length === 0) return [];

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

  return ordered;
}

// Who's up next, based purely on how many movie nights have already been
// held. nightsHeld = 0 -> first person in the order is up; after one night
// is logged, the second person is up; and so on, wrapping around.
function getCurrentPicker(profiles, nightsHeld = 0) {
  const ordered = getOrderedProfiles(profiles);
  if (ordered.length === 0) return null;

  const count = Number.isFinite(nightsHeld) ? nightsHeld : 0;
  const idx = ((count % ordered.length) + ordered.length) % ordered.length;
  return ordered[idx];
}

// The person who will pick the movie night AFTER the current one.
function getNextPicker(profiles, nightsHeld = 0) {
  const count = Number.isFinite(nightsHeld) ? nightsHeld : 0;
  return getCurrentPicker(profiles, count + 1);
}

module.exports = {
  ROTATION_ORDER,
  getOrderedProfiles,
  getCurrentPicker,
  getNextPicker,
};

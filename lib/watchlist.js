import { supabase } from "./supabaseClient";

// Shared helper: add (or re-affirm) a movie on a profile's watch list.
// Used by Random Movie, New Releases, and the Watch List search box so
// all three stay in sync with the same upsert behavior.
async function addToWatchlist(movie, profileId) {
  if (!movie || !profileId) return;
  await supabase.from("watchlist").upsert(
    {
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      poster_path: movie.poster_path,
      release_year: movie.release_year,
      profile_id: profileId,
    },
    { onConflict: "tmdb_id,profile_id", ignoreDuplicates: true }
  );
}

module.exports = { addToWatchlist };

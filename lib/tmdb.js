const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

async function searchMovies(query) {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_TMDB_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }
  const url = new URL(`${TMDB_BASE}/search/movie`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB search failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.results || []).slice(0, 12).map((r) => ({
    tmdb_id: r.id,
    title: r.title,
    release_year: r.release_date ? r.release_date.slice(0, 4) : null,
    poster_path: r.poster_path ? `${IMAGE_BASE}${r.poster_path}` : null,
  }));
}

module.exports = { searchMovies };

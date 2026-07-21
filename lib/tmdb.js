const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w342";
const LOGO_BASE = "https://image.tmdb.org/t/p/w45";
const PROFILE_BASE = "https://image.tmdb.org/t/p/w92";

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

// Recently released movies (now playing / just released), US region.
async function getNewReleases() {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_TMDB_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }
  const url = new URL(`${TMDB_BASE}/movie/now_playing`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("region", "US");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB now_playing failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.results || []).slice(0, 20).map((r) => ({
    tmdb_id: r.id,
    title: r.title,
    release_year: r.release_date ? r.release_date.slice(0, 4) : null,
    release_date: r.release_date || null,
    poster_path: r.poster_path ? `${IMAGE_BASE}${r.poster_path}` : null,
  }));
}

// Streaming/rent/buy availability for a movie, US region.
async function getWatchProviders(tmdbId) {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_TMDB_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }
  const url = new URL(`${TMDB_BASE}/movie/${tmdbId}/watch/providers`);
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB watch providers failed: ${res.status}`);
  }
  const data = await res.json();
  const region = (data.results && data.results.US) || null;
  if (!region) {
    return { flatrate: [], rent: [], buy: [], link: null };
  }

  const mapProviders = (list) =>
    (list || []).map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: p.logo_path ? `${LOGO_BASE}${p.logo_path}` : null,
    }));

  return {
    flatrate: mapProviders(region.flatrate),
    rent: mapProviders(region.rent),
    buy: mapProviders(region.buy),
    link: region.link || null,
  };
}

// Full details for a movie page: overview, genres, cast, trailer.
async function getMovieDetails(tmdbId) {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_TMDB_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }
  const url = new URL(`${TMDB_BASE}/movie/${tmdbId}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("append_to_response", "credits,videos");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB movie details failed: ${res.status}`);
  }
  const data = await res.json();

  const cast = ((data.credits && data.credits.cast) || []).slice(0, 6).map((c) => ({
    name: c.name,
    character: c.character,
    photo: c.profile_path ? `${PROFILE_BASE}${c.profile_path}` : null,
  }));

  const videos = (data.videos && data.videos.results) || [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    videos.find((v) => v.site === "YouTube") ||
    null;

  return {
    tmdb_id: data.id,
    overview: data.overview || "",
    runtime: data.runtime || null,
    genres: (data.genres || []).map((g) => g.name),
    cast,
    trailerKey: trailer ? trailer.key : null,
  };
}

module.exports = { searchMovies, getNewReleases, getWatchProviders, getMovieDetails };

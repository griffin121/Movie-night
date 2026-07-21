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

// Movies newly available to stream/rent/buy digitally, US region.
// Uses TMDB discover with a digital release-type filter over a rolling
// recent window, so this reflects streaming/digital availability rather
// than theatrical release dates or recurring TV broadcasts.
async function getNewReleases() {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_TMDB_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }

  const fmt = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const windowStart = new Date();
  windowStart.setDate(today.getDate() - 60);

  const url = new URL(`${TMDB_BASE}/discover/movie`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("region", "US");
  url.searchParams.set("with_release_type", "4");
  url.searchParams.set("release_date.gte", fmt(windowStart));
  url.searchParams.set("release_date.lte", fmt(today));
  url.searchParams.set("sort_by", "release_date.desc");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("vote_count.gte", "5");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB discover failed: ${res.status}`);
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

// Pick a genuinely random movie from TMDB's full catalog, spanning any era.
async function getRandomMovie() {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_TMDB_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }

  const currentYear = new Date().getFullYear();
  const minYear = 1920;

  async function fetchPage(year, page) {
    const url = new URL(`${TMDB_BASE}/discover/movie`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("primary_release_year", String(year));
    url.searchParams.set("sort_by", "popularity.desc");
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("vote_count.gte", "10");
    url.searchParams.set("page", String(page));
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return res.json();
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const year = minYear + Math.floor(Math.random() * (currentYear - minYear + 1));
    const first = await fetchPage(year, 1);
    if (!first) continue;
    const totalPages = Math.min(first.total_pages || 0, 500);
    if (totalPages < 1) continue;

    const page = 1 + Math.floor(Math.random() * totalPages);
    const data = page === 1 ? first : await fetchPage(year, page);
    const results = (data && data.results) || [];
    if (results.length === 0) continue;

    const pick = results[Math.floor(Math.random() * results.length)];
    return {
      tmdb_id: pick.id,
      title: pick.title,
      overview: pick.overview || "",
      release_year: pick.release_date ? pick.release_date.slice(0, 4) : null,
      poster_path: pick.poster_path ? `${IMAGE_BASE}${pick.poster_path}` : null,
    };
  }

  throw new Error("Couldn't find a random movie right now. Try again.");
}

module.exports = {
  searchMovies,
  getNewReleases,
  getWatchProviders,
  getMovieDetails,
  getRandomMovie,
};

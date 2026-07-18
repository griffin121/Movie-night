"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import NavBar from "./NavBar";
const { searchMovies } = require("../lib/tmdb");
const { getCurrentPicker, getWeekRange } = require("../lib/schedule");

const RATING_LABELS = {
  1: "💩 Ass",
  2: "😒 Ass Movie",
  3: "🎬 Movie",
  4: "👍 Good Movie",
  5: "🔥 Good Ass Movie",
};

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function formatRange(range) {
  const opts = { month: "short", day: "numeric" };
  return `${range.start.toLocaleDateString(undefined, opts)} – ${range.end.toLocaleDateString(undefined, opts)}`;
}

export default function Dashboard({ user }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [picker, setPicker] = useState(null);
  const [weekRange, setWeekRange] = useState(null);

  const loadMovies = useCallback(async () => {
    setLoadingMovies(true);
    const { data: movieRows, error: moviesError } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });

    if (!moviesError && movieRows) {
      const { data: ratingRows } = await supabase
        .from("ratings")
        .select("movie_id, rating, profile_id, profiles(username)");

      const ratingsByMovie = new Map();
      for (const row of ratingRows || []) {
        if (!ratingsByMovie.has(row.movie_id)) ratingsByMovie.set(row.movie_id, []);
        ratingsByMovie.get(row.movie_id).push(row);
      }

      const result = movieRows.map((movie) => {
        const ratings = ratingsByMovie.get(movie.id) || [];
        const avg = ratings.length
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : null;
        const mine = ratings.find((r) => r.profile_id === user.id);
        return {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_year: movie.release_year,
          avg,
          count: ratings.length,
          ratings: ratings.map((r) => ({
            username: r.profiles ? r.profiles.username : "?",
            rating: r.rating,
          })),
          myRating: mine ? mine.rating : null,
        };
      });

      result.sort((a, b) => {
        if (a.avg == null && b.avg == null) return 0;
        if (a.avg == null) return 1;
        if (b.avg == null) return -1;
        return b.avg - a.avg;
      });

      setMovies(result);
    }
    setLoadingMovies(false);
  }, [user.id]);

  const loadPicker = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, username, created_at");
    if (data && data.length) {
      setPicker(getCurrentPicker(data));
      setWeekRange(getWeekRange());
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  useEffect(() => {
    loadPicker();
  }, [loadPicker]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const results = await searchMovies(query);
      setSearchResults(results);
    } catch (err) {
      setSearchError(err.message || "Search failed.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(movie) {
    setAddingId(movie.tmdb_id);
    try {
      await supabase.from("movies").upsert(
        {
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_year: movie.release_year,
          added_by: user.id,
        },
        { onConflict: "tmdb_id", ignoreDuplicates: true }
      );
      setSearchResults((prev) => prev.filter((m) => m.tmdb_id !== movie.tmdb_id));
      setQuery("");
      await loadMovies();
    } finally {
      setAddingId(null);
    }
  }

  async function handleRate(movieId, rating) {
    setMovies((prev) =>
      prev.map((m) => (m.id === movieId ? { ...m, myRating: rating } : m))
    );
    await supabase
      .from("ratings")
      .upsert(
        { movie_id: movieId, profile_id: user.id, rating },
        { onConflict: "movie_id,profile_id" }
      );
    await loadMovies();
  }

  return (
    <div className="page">
      <NavBar user={user} active="home" title="🎬 Movie Night" />

      {picker && (
        <div className="picker-banner">
          <span>
            🎯 <strong>{picker.username}</strong> picks this week
            {picker.id === user.id && <span className="picker-you"> — that's you!</span>}
          </span>
          {weekRange && <span className="picker-range">{formatRange(weekRange)}</span>}
        </div>
      )}

      <form className="search-row" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search for a movie to add..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" disabled={searching}>
          {searching ? "Searching..." : "🔍 Search"}
        </button>
      </form>

      {searchError && <p className="error">{searchError}</p>}

      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((movie) => (
            <div className="search-card" key={movie.tmdb_id}>
              {movie.poster_path ? (
                <img src={movie.poster_path} alt={movie.title} />
              ) : (
                <div className="poster-fallback">No image</div>
              )}
              <div className="body">
                <div>
                  <div className="title">{movie.title}</div>
                  <div className="year">{movie.release_year || "—"}</div>
                </div>
                <button
                  className="btn small"
                  onClick={() => handleAdd(movie)}
                  disabled={addingId === movie.tmdb_id}
                >
                  {addingId === movie.tmdb_id ? "Adding..." : "+ Add"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loadingMovies ? (
        <p className="empty">Loading movies...</p>
      ) : movies.length === 0 ? (
        <p className="empty">No movies yet. Search above to add the first one.</p>
      ) : (
        <>
          <div className="section-heading">🏆 Rankings</div>
          <div className="movie-list">
            {movies.map((movie, index) => (
              <div className={`movie-row${index === 0 ? " rank-1" : ""}`} key={movie.id}>
                <div className={`rank-badge${index < 3 ? " medal" : ""}`}>
                  {index < 3 ? RANK_MEDALS[index] : `#${index + 1}`}
                </div>
                {movie.poster_path ? (
                  <img src={movie.poster_path} alt={movie.title} />
                ) : (
                  <div className="poster-fallback" />
                )}
                <div className="movie-info">
                  <div className="title-row">
                    <span className="title">{movie.title}</span>
                    <span className="year">{movie.release_year || ""}</span>
                  </div>
                  <div className="avg-badge">
                    {movie.avg
                      ? `${RATING_LABELS[Math.round(movie.avg)]} · ${movie.avg.toFixed(1)} avg`
                      : "No ratings yet"}
                    {movie.count > 0 && ` · ${movie.count} rating${movie.count === 1 ? "" : "s"}`}
                  </div>
                  <div className="rate-buttons">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        className={movie.myRating === n ? "active" : ""}
                        onClick={() => handleRate(movie.id, n)}
                        title={RATING_LABELS[n]}
                      >
                        {RATING_LABELS[n]}
                      </button>
                    ))}
                  </div>
                  {movie.ratings.length > 0 && (
                    <div className="friend-ratings">
                      {movie.ratings.map((r) => (
                        <span className="friend-pill" key={r.username}>
                          {r.username}: {RATING_LABELS[r.rating] || r.rating}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import NavBar from "../NavBar";
const { searchMovies } = require("../../lib/tmdb");
const { getCurrentUser } = require("../../lib/currentUser");

const MIN_WANTERS = 2;

export default function WatchlistPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [addingId, setAddingId] = useState(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.replace("/login");
    } else {
      setUser(u);
    }
    setChecked(true);
  }, [router]);

  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("watchlist")
      .select("tmdb_id, title, poster_path, release_year, profile_id, profiles(username)");

    if (!error && data) {
      const byMovie = new Map();
      for (const row of data) {
        if (!byMovie.has(row.tmdb_id)) {
          byMovie.set(row.tmdb_id, {
            tmdb_id: row.tmdb_id,
            title: row.title,
            poster_path: row.poster_path,
            release_year: row.release_year,
            wanters: [],
          });
        }
        byMovie.get(row.tmdb_id).wanters.push({
          profile_id: row.profile_id,
          username: row.profiles ? row.profiles.username : "?",
        });
      }
      setItems(Array.from(byMovie.values()));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadWatchlist();
  }, [user, loadWatchlist]);

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
      await supabase.from("watchlist").upsert(
        {
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_year: movie.release_year,
          profile_id: user.id,
        },
        { onConflict: "tmdb_id,profile_id", ignoreDuplicates: true }
      );
      setSearchResults((prev) => prev.filter((m) => m.tmdb_id !== movie.tmdb_id));
      setQuery("");
      await loadWatchlist();
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(tmdbId) {
    await supabase.from("watchlist").delete().eq("tmdb_id", tmdbId).eq("profile_id", user.id);
    await loadWatchlist();
  }

  if (!checked || !user) return null;

  const unlocked = items.filter((m) => m.wanters.length >= MIN_WANTERS);
  const pending = items.filter((m) => m.wanters.length < MIN_WANTERS);
  const myPending = pending.filter((m) => m.wanters.some((w) => w.profile_id === user.id));

  return (
    <div className="page">
      <NavBar user={user} active="watchlist" title="🍿 Watch List" />

      <p className="sub-note">
        Add movies you want to watch. A movie only shows up for everyone once at least {MIN_WANTERS} people have added it.
      </p>

      <form className="search-row" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search for a movie to want to watch..."
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
                  {addingId === movie.tmdb_id ? "Adding..." : "+ Want to watch"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="empty">Loading watch list...</p>
      ) : (
        <>
          <div className="section-heading">🍿 Ready to Watch</div>
          {unlocked.length === 0 ? (
            <p className="empty">
              No movies have {MIN_WANTERS}+ people wanting to watch yet. Add some above!
            </p>
          ) : (
            <div className="movie-list">
              {unlocked.map((movie) => (
                <div className="movie-row" key={movie.tmdb_id}>
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
                    <div className="friend-ratings">
                      {movie.wanters.map((w) => (
                        <span className="friend-pill" key={w.profile_id}>
                          🙋 {w.username}
                        </span>
                      ))}
                    </div>
                    {movie.wanters.some((w) => w.profile_id === user.id) && (
                      <button
                        className="btn secondary small"
                        style={{ marginTop: 10 }}
                        onClick={() => handleRemove(movie.tmdb_id)}
                      >
                        Remove my vote
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {myPending.length > 0 && (
            <>
              <div className="section-heading" style={{ marginTop: 32 }}>
                ⏳ Waiting on friends
              </div>
              <div className="movie-list">
                {myPending.map((movie) => (
                  <div className="movie-row" key={movie.tmdb_id}>
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
                        {movie.wanters.length} of {MIN_WANTERS} needed
                      </div>
                      <button className="btn secondary small" onClick={() => handleRemove(movie.tmdb_id)}>
                        Remove my vote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

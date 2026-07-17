"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard({ user }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [addingId, setAddingId] = useState(null);

  const loadMovies = useCallback(async () => {
    setLoadingMovies(true);
    const res = await fetch("/api/movies");
    if (res.ok) {
      const data = await res.json();
      setMovies(data.movies);
    }
    setLoadingMovies(false);
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || "Search failed.");
        setSearchResults([]);
        return;
      }
      setSearchResults(data.results);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(movie) {
    setAddingId(movie.tmdb_id);
    try {
      await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movie),
      });
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
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie_id: movieId, rating }),
    });
    await loadMovies();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>🎬 Movie Night</h1>
        <div className="who">
          {user.username}{" "}
          <button className="btn secondary small" style={{ marginLeft: 8 }} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <form className="search-row" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search for a movie to add..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" disabled={searching}>
          {searching ? "Searching..." : "Search"}
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
        <div className="movie-list">
          {movies.map((movie) => (
            <div className="movie-row" key={movie.id}>
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
                  {movie.avg ? `★ ${movie.avg.toFixed(1)}` : "No ratings yet"}
                  {movie.count > 0 && ` · ${movie.count} rating${movie.count === 1 ? "" : "s"}`}
                </div>
                <div className="rate-buttons">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={movie.myRating === n ? "active" : ""}
                      onClick={() => handleRate(movie.id, n)}
                      title={n === 1 ? "1 = bad" : n === 5 ? "5 = good" : String(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {movie.ratings.length > 0 && (
                  <div className="friend-ratings">
                    {movie.ratings.map((r) => (
                      <span className="friend-pill" key={r.username}>
                        {r.username}: {r.rating}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

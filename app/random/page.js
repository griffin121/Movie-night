"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import NavBar from "../NavBar";
const { getCurrentUser } = require("../../lib/currentUser");
const { getRandomMovie } = require("../../lib/tmdb");

export default function RandomMoviePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.replace("/login");
    } else {
      setUser(u);
    }
    setChecked(true);
  }, [router]);

  async function handlePick() {
    setLoading(true);
    setError("");
    setAdded(false);
    try {
      const m = await getRandomMovie();
      setMovie(m);
    } catch (err) {
      setError(err.message || "Couldn't pick a movie.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToWatchlist() {
    if (!movie || !user) return;
    setAdding(true);
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
      setAdded(true);
    } finally {
      setAdding(false);
    }
  }

  if (!checked || !user) return null;

  return (
    <div className="page">
      <NavBar user={user} active="random" title="🎲 Random Movie" />

      <p className="sub-note">
        Pick any movie ever made, completely at random — from timeless classics to hidden gems across the decades.
      </p>

      <button className="btn" onClick={handlePick} disabled={loading}>
        {loading ? "Picking..." : movie ? "🎲 Pick another" : "🎲 Pick a random movie"}
      </button>

      {error && <p className="error">{error}</p>}

      {movie && (
        <div className="detail-hero" style={{ marginTop: 24 }}>
          {movie.poster_path ? (
            <img src={movie.poster_path} alt={movie.title} />
          ) : (
            <div className="poster-fallback" />
          )}
          <div className="detail-info">
            <h2>
              {movie.title} <span className="year">{movie.release_year || ""}</span>
            </h2>
            {movie.overview && (
              <p style={{ color: "var(--text)", lineHeight: 1.5 }}>{movie.overview}</p>
            )}
            <button
              className="btn secondary small"
              onClick={handleAddToWatchlist}
              disabled={adding || added}
              style={{ marginTop: 10 }}
            >
              {added ? "✓ Added to Watch List" : adding ? "Adding..." : "+ Want to watch"}
            </button>
          </div>
        </div>
      )}

      {!movie && !loading && !error && (
        <p className="empty">Click the button above to discover a random movie from film history.</p>
      )}
    </div>
  );
}

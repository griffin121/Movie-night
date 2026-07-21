"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import NavBar from "../NavBar";
const { getCurrentUser } = require("../../lib/currentUser");

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [movies, setMovies] = useState([]);
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: movieRows } = await supabase
        .from("movies")
        .select("*")
        .eq("watched", true)
        .order("watched_at", { ascending: false });

      if (movieRows) {
        const { data: ratingRows } = await supabase.from("ratings").select("movie_id, rating");
        const byMovie = new Map();
        for (const row of ratingRows || []) {
          if (!byMovie.has(row.movie_id)) byMovie.set(row.movie_id, []);
          byMovie.get(row.movie_id).push(row.rating);
        }
        setMovies(
          movieRows.map((m) => {
            const list = byMovie.get(m.id) || [];
            const avg = list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
            return { ...m, avg, count: list.length };
          })
        );
      }
      setLoading(false);
    })();
  }, [user]);

  if (!checked || !user) return null;

  return (
    <div className="page">
      <NavBar user={user} active="history" title="📜 History" />
      <p className="sub-note">Movies the group has already watched, most recent first.</p>

      {loading ? (
        <p className="empty">Loading history...</p>
      ) : movies.length === 0 ? (
        <p className="empty">No watched movies yet. Mark one as watched from its movie page.</p>
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
                  <Link href={`/movie/?id=${movie.id}`} className="title">
                    {movie.title}
                  </Link>
                  <span className="year">{movie.release_year || ""}</span>
                </div>
                <div className="avg-badge">
                  {movie.avg ? `${movie.avg.toFixed(1)} avg` : "No ratings"}
                  {movie.count > 0 && ` · ${movie.count} rating${movie.count === 1 ? "" : "s"}`}
                </div>
                <div className="sub-note" style={{ margin: 0 }}>
                  🗓️ Watched {formatDate(movie.watched_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import NavBar from "../NavBar";
const { getCurrentUser } = require("../../lib/currentUser");

const RATING_LABELS = {
  1: "💩 Ass",
  2: "😒 Ass Movie",
  3: "🎬 Movie",
  4: "👍 Good Movie",
  5: "🔥 Good Ass Movie",
};

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export default function RankingsPage() {
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
      const { data: movieRows, error: moviesError } = await supabase
        .from("movies")
        .select("*");

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
      setLoading(false);
    })();
  }, [user]);

  if (!checked || !user) return null;

  return (
    <div className="page">
      <NavBar user={user} active="rankings" title="🏆 Rankings" />

      <p className="sub-note">The full group leaderboard, ranked by average rating.</p>

      {loading ? (
        <p className="empty">Loading rankings...</p>
      ) : movies.length === 0 ? (
        <p className="empty">No movies yet. Add some from the Home page.</p>
      ) : (
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
      )}
    </div>
  );
}

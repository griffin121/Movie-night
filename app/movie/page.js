"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import NavBar from "../NavBar";
const { getCurrentUser } = require("../../lib/currentUser");
const { getMovieDetails } = require("../../lib/tmdb");

const RATING_LABELS = {
  1: "💩 Ass",
  2: "😒 Ass Movie",
  3: "🎬 Movie",
  4: "👍 Good Movie",
  5: "🔥 Good Ass Movie",
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MovieDetailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get("id");

  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  const [movie, setMovie] = useState(null);
  const [details, setDetails] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [togglingWatched, setTogglingWatched] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.replace("/login");
    } else {
      setUser(u);
    }
    setChecked(true);
  }, [router]);

  const load = useCallback(async () => {
    if (!movieId) {
      setError("No movie specified.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: movieRow, error: movieError } = await supabase
        .from("movies")
        .select("*")
        .eq("id", movieId)
        .maybeSingle();

      if (movieError || !movieRow) {
        setError("Movie not found.");
        setLoading(false);
        return;
      }
      setMovie(movieRow);

      const [{ data: ratingRows }, { data: commentRows }] = await Promise.all([
        supabase
          .from("ratings")
          .select("rating, profile_id, profiles(username)")
          .eq("movie_id", movieId),
        supabase
          .from("comments")
          .select("id, body, created_at, profile_id, profiles(username)")
          .eq("movie_id", movieId)
          .order("created_at", { ascending: true }),
      ]);
      setRatings(ratingRows || []);
      setComments(commentRows || []);

      try {
        const d = await getMovieDetails(movieRow.tmdb_id);
        setDetails(d);
      } catch {
        setDetails(null);
      }
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  async function handleRate(rating) {
    if (!movie) return;
    await supabase
      .from("ratings")
      .upsert(
        { movie_id: movie.id, profile_id: user.id, rating },
        { onConflict: "movie_id,profile_id" }
      );
    await load();
  }

  async function handleToggleWatched() {
    if (!movie) return;
    setTogglingWatched(true);
    try {
      const next = !movie.watched;
      const watched_at = next ? new Date().toISOString() : null;
      await supabase.from("movies").update({ watched: next, watched_at }).eq("id", movie.id);
      setMovie((m) => ({ ...m, watched: next, watched_at }));
    } finally {
      setTogglingWatched(false);
    }
  }

  async function handlePostComment(e) {
    e.preventDefault();
    if (!commentText.trim() || !movie) return;
    setPosting(true);
    try {
      await supabase
        .from("comments")
        .insert({ movie_id: movie.id, profile_id: user.id, body: commentText.trim() });
      setCommentText("");
      await load();
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteComment(commentId) {
    await supabase.from("comments").delete().eq("id", commentId).eq("profile_id", user.id);
    await load();
  }

  if (!checked || !user) return null;

  const avg = ratings.length
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : null;
  const myRating = ratings.find((r) => r.profile_id === user.id)?.rating || null;

  return (
    <div className="page">
      <NavBar user={user} active="" title="🎬 Movie" />

      {loading ? (
        <p className="empty">Loading...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <div className="detail-hero">
            {movie.poster_path ? (
              <img src={movie.poster_path} alt={movie.title} />
            ) : (
              <div className="poster-fallback" />
            )}
            <div className="detail-info">
              <h2>
                {movie.title} <span className="year">{movie.release_year || ""}</span>
              </h2>
              {details && details.genres.length > 0 && (
                <div className="friend-ratings" style={{ marginBottom: 10 }}>
                  {details.genres.map((g) => (
                    <span className="friend-pill" key={g}>
                      {g}
                    </span>
                  ))}
                </div>
              )}
              {details && details.runtime && (
                <div className="sub-note" style={{ margin: "0 0 10px" }}>
                  {details.runtime} min
                </div>
              )}
              {details && details.overview && (
                <p style={{ color: "var(--text)", lineHeight: 1.5 }}>{details.overview}</p>
              )}

              <div className="avg-badge">
                {avg ? `${RATING_LABELS[Math.round(avg)]} · ${avg.toFixed(1)} avg` : "No ratings yet"}
                {ratings.length > 0 &&
                  ` · ${ratings.length} rating${ratings.length === 1 ? "" : "s"}`}
              </div>

              <div className="rate-buttons">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={myRating === n ? "active" : ""}
                    onClick={() => handleRate(n)}
                    title={RATING_LABELS[n]}
                  >
                    {RATING_LABELS[n]}
                  </button>
                ))}
              </div>

              {ratings.length > 0 && (
                <div className="friend-ratings" style={{ marginBottom: 12 }}>
                  {ratings.map((r) => (
                    <span className="friend-pill" key={r.profile_id}>
                      {r.profiles ? r.profiles.username : "?"}: {RATING_LABELS[r.rating] || r.rating}
                    </span>
                  ))}
                </div>
              )}

              <button
                className={`btn small${movie.watched ? "" : " secondary"}`}
                onClick={handleToggleWatched}
                disabled={togglingWatched}
              >
                {movie.watched
                  ? `✓ Watched${movie.watched_at ? ` on ${formatDate(movie.watched_at)}` : ""}`
                  : "Mark as watched"}
              </button>
            </div>
          </div>

          {details && details.trailerKey && (
            <>
              <div className="section-heading" style={{ marginTop: 32 }}>
                🎞️ Trailer
              </div>
              <div className="trailer-wrap">
                <iframe
                  src={`https://www.youtube.com/embed/${details.trailerKey}`}
                  title="Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </>
          )}

          {details && details.cast.length > 0 && (
            <>
              <div className="section-heading" style={{ marginTop: 32 }}>
                🎭 Cast
              </div>
              <div className="cast-row">
                {details.cast.map((c) => (
                  <div className="cast-chip" key={c.name}>
                    {c.photo ? (
                      <img src={c.photo} alt={c.name} />
                    ) : (
                      <div className="cast-photo-fallback" />
                    )}
                    <div className="cast-name">{c.name}</div>
                    <div className="cast-character">{c.character}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="section-heading" style={{ marginTop: 32 }}>
            💬 Comments
          </div>
          <form className="search-row" onSubmit={handlePostComment}>
            <input
              type="text"
              placeholder="Say something about this movie..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button className="btn" disabled={posting}>
              {posting ? "Posting..." : "Post"}
            </button>
          </form>
          {comments.length === 0 ? (
            <p className="empty">No comments yet. Be the first!</p>
          ) : (
            <div className="comment-list">
              {comments.map((c) => (
                <div className="comment-item" key={c.id}>
                  <div className="comment-meta">
                    <strong>{c.profiles ? c.profiles.username : "?"}</strong>
                    <span className="year">{formatDate(c.created_at)}</span>
                  </div>
                  <div className="comment-body">{c.body}</div>
                  {c.profile_id === user.id && (
                    <button
                      className="btn secondary small"
                      style={{ marginTop: 6 }}
                      onClick={() => handleDeleteComment(c.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MovieDetailPage() {
  return (
    <Suspense fallback={null}>
      <MovieDetailInner />
    </Suspense>
  );
}

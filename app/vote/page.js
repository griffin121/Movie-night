"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import NavBar from "../NavBar";
const { getCurrentUser } = require("../../lib/currentUser");

export default function VotePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  const [matchup, setMatchup] = useState(null);
  const [votes, setVotes] = useState([]);
  const [history, setHistory] = useState([]);
  const [poolItems, setPoolItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pickA, setPickA] = useState(null);
  const [pickB, setPickB] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.replace("/login");
    } else {
      setUser(u);
    }
    setChecked(true);
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: active } = await supabase
      .from("matchups")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setMatchup(active || null);

    if (active) {
      const { data: voteRows } = await supabase
        .from("matchup_votes")
        .select("profile_id, choice, profiles(username)")
        .eq("matchup_id", active.id);
      setVotes(voteRows || []);
      setPoolItems([]);
    } else {
      setVotes([]);
      const { data: wl } = await supabase
        .from("watchlist")
        .select("tmdb_id, title, poster_path, release_year");
      const byMovie = new Map();
      for (const row of wl || []) {
        if (!byMovie.has(row.tmdb_id)) byMovie.set(row.tmdb_id, row);
      }
      setPoolItems(Array.from(byMovie.values()));
    }

    const { data: past } = await supabase
      .from("matchups")
      .select("*")
      .eq("active", false)
      .order("closed_at", { ascending: false })
      .limit(5);

    if (past && past.length) {
      const ids = past.map((m) => m.id);
      const { data: pastVotes } = await supabase
        .from("matchup_votes")
        .select("matchup_id, choice")
        .in("matchup_id", ids);
      const tally = new Map();
      for (const v of pastVotes || []) {
        if (!tally.has(v.matchup_id)) tally.set(v.matchup_id, { a: 0, b: 0 });
        tally.get(v.matchup_id)[v.choice] += 1;
      }
      setHistory(
        past.map((m) => ({
          ...m,
          aVotes: tally.get(m.id)?.a || 0,
          bVotes: tally.get(m.id)?.b || 0,
        }))
      );
    } else {
      setHistory([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  async function handleVote(choice) {
    if (!matchup) return;
    await supabase
      .from("matchup_votes")
      .upsert(
        { matchup_id: matchup.id, profile_id: user.id, choice },
        { onConflict: "matchup_id,profile_id" }
      );
    await loadData();
  }

  async function handleClose() {
    if (!matchup) return;
    await supabase
      .from("matchups")
      .update({ active: false, closed_at: new Date().toISOString() })
      .eq("id", matchup.id);
    await loadData();
  }

  function togglePick(movie) {
    if (pickA && pickA.tmdb_id === movie.tmdb_id) {
      setPickA(null);
      return;
    }
    if (pickB && pickB.tmdb_id === movie.tmdb_id) {
      setPickB(null);
      return;
    }
    if (!pickA) {
      setPickA(movie);
      return;
    }
    if (!pickB) {
      setPickB(movie);
      return;
    }
  }

  async function handleStart() {
    if (!pickA || !pickB) return;
    setStarting(true);
    setStartError("");
    try {
      const { error } = await supabase.from("matchups").insert({
        movie_a_tmdb_id: pickA.tmdb_id,
        movie_a_title: pickA.title,
        movie_a_poster: pickA.poster_path,
        movie_a_year: pickA.release_year,
        movie_b_tmdb_id: pickB.tmdb_id,
        movie_b_title: pickB.title,
        movie_b_poster: pickB.poster_path,
        movie_b_year: pickB.release_year,
        created_by: user.id,
        active: true,
      });
      if (error) throw error;
      setPickA(null);
      setPickB(null);
      await loadData();
    } catch (err) {
      setStartError(err.message || "Could not start matchup.");
    } finally {
      setStarting(false);
    }
  }

  if (!checked || !user) return null;

  const aCount = votes.filter((v) => v.choice === "a").length;
  const bCount = votes.filter((v) => v.choice === "b").length;
  const totalVotes = aCount + bCount;
  const myVote = votes.find((v) => v.profile_id === user.id)?.choice;

  const options = matchup
    ? [
        {
          key: "a",
          title: matchup.movie_a_title,
          poster: matchup.movie_a_poster,
          year: matchup.movie_a_year,
          count: aCount,
        },
        {
          key: "b",
          title: matchup.movie_b_title,
          poster: matchup.movie_b_poster,
          year: matchup.movie_b_year,
          count: bCount,
        },
      ]
    : [];

  return (
    <div className="page">
      <NavBar user={user} active="vote" title="🥊 Vote" />
      <p className="sub-note">
        Pick two movies from the watch list and vote head to head to decide what to watch next.
      </p>

      {loading ? (
        <p className="empty">Loading...</p>
      ) : matchup ? (
        <>
          <div className="vote-versus">
            {options.map((opt, i) => (
              <div key={opt.key} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div className={`vote-card${myVote === opt.key ? " chosen" : ""}`}>
                  {opt.poster ? (
                    <img src={opt.poster} alt={opt.title} />
                  ) : (
                    <div className="poster-fallback" />
                  )}
                  <div className="title">{opt.title}</div>
                  <div className="year">{opt.year || ""}</div>
                  <div className="avg-badge">
                    {opt.count} vote{opt.count === 1 ? "" : "s"}
                    {totalVotes > 0 && ` · ${Math.round((opt.count / totalVotes) * 100)}%`}
                  </div>
                  <button
                    className={`btn small${myVote === opt.key ? "" : " secondary"}`}
                    onClick={() => handleVote(opt.key)}
                  >
                    {myVote === opt.key ? "✓ Your pick" : "Vote for this"}
                  </button>
                </div>
                {i === 0 && <div className="vote-vs">VS</div>}
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center" }}>
            <button className="btn secondary small" onClick={handleClose}>
              🏁 Close voting &amp; archive result
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="empty">
            No matchup running right now. Pick 2 movies from the watch list below to start one.
          </p>
          {poolItems.length < 2 ? (
            <p className="empty">Add at least 2 movies to the watch list first.</p>
          ) : (
            <>
              <div className="search-results">
                {poolItems.map((m) => {
                  const isA = pickA?.tmdb_id === m.tmdb_id;
                  const isB = pickB?.tmdb_id === m.tmdb_id;
                  return (
                    <div
                      className={`search-card${isA || isB ? " chosen" : ""}`}
                      key={m.tmdb_id}
                      onClick={() => togglePick(m)}
                      style={{ cursor: "pointer" }}
                    >
                      {m.poster_path ? (
                        <img src={m.poster_path} alt={m.title} />
                      ) : (
                        <div className="poster-fallback">No image</div>
                      )}
                      <div className="body">
                        <div>
                          <div className="title">{m.title}</div>
                          <div className="year">{m.release_year || "—"}</div>
                        </div>
                        {(isA || isB) && (
                          <div className="year">{isA ? "Pick A ✓" : "Pick B ✓"}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {startError && <p className="error">{startError}</p>}
              <button className="btn" disabled={!pickA || !pickB || starting} onClick={handleStart}>
                {starting ? "Starting..." : "🥊 Start matchup"}
              </button>
            </>
          )}
        </>
      )}

      {history.length > 0 && (
        <>
          <div className="section-heading" style={{ marginTop: 40 }}>
            📜 Past matchups
          </div>
          <div className="movie-list">
            {history.map((m) => {
              const winner =
                m.aVotes === m.bVotes
                  ? "Tie"
                  : m.aVotes > m.bVotes
                  ? m.movie_a_title
                  : m.movie_b_title;
              return (
                <div className="movie-row" key={m.id}>
                  <div className="movie-info">
                    <div className="title-row">
                      <span className="title">{m.movie_a_title}</span>
                      <span className="year">{m.aVotes} votes</span>
                    </div>
                    <div className="title-row">
                      <span className="title">vs {m.movie_b_title}</span>
                      <span className="year">{m.bVotes} votes</span>
                    </div>
                    <div className="avg-badge">🏆 {winner}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

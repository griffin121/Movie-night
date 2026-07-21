"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import NavBar from "../NavBar";
const { getCurrentUser } = require("../../lib/currentUser");
const { getNewReleases, getWatchProviders } = require("../../lib/tmdb");

const PROVIDER_FILTERS = [
  { key: "netflix", label: "Netflix", match: (n) => n.toLowerCase().includes("netflix") },
  { key: "hulu", label: "Hulu", match: (n) => n.toLowerCase().includes("hulu") },
  { key: "prime", label: "Prime Video", match: (n) => n.toLowerCase().includes("prime video") },
  { key: "disney", label: "Disney+", match: (n) => n.toLowerCase().includes("disney") },
  { key: "max", label: "Max", match: (n) => n.toLowerCase().includes("max") || n.toLowerCase().includes("hbo") },
  { key: "apple", label: "Apple TV+", match: (n) => n.toLowerCase().includes("apple tv") },
  { key: "paramount", label: "Paramount+", match: (n) => n.toLowerCase().includes("paramount") },
];

export default function NewReleasesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  const [movies, setMovies] = useState([]);
  const [providers, setProviders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [addingId, setAddingId] = useState(null);

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
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const releases = await getNewReleases();
        if (cancelled) return;
        setMovies(releases);

        const entries = await Promise.all(
          releases.map(async (m) => {
            try {
              const p = await getWatchProviders(m.tmdb_id);
              return [m.tmdb_id, p];
            } catch {
              return [m.tmdb_id, { flatrate: [], rent: [], buy: [], link: null }];
            }
          })
        );
        if (cancelled) return;
        setProviders(Object.fromEntries(entries));
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load new releases.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function toggleFilter(key) {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleExpand(tmdbId) {
    setExpandedId((prev) => (prev === tmdbId ? null : tmdbId));
  }

  async function handleAddToWatchlist(movie) {
    if (!movie || !user) return;
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
      setAddedIds((prev) => new Set(prev).add(movie.tmdb_id));
    } finally {
      setAddingId(null);
    }
  }

  if (!checked || !user) return null;

  const activeMatchers = PROVIDER_FILTERS.filter((f) => activeFilters.includes(f.key));
  const visibleMovies =
    activeMatchers.length === 0
      ? movies
      : movies.filter((m) => {
          const flatrate = (providers[m.tmdb_id] || {}).flatrate || [];
          return flatrate.some((prov) => activeMatchers.some((f) => f.match(prov.name)));
        });

  return (
    <div className="page">
      <NavBar user={user} active="new-releases" title="🎬 New Releases" />
      <p className="sub-note">
        Movies that have newly landed on streaming, rental, or digital purchase — not what's in theaters.
      </p>
      <p className="sub-note">Tap a movie for its synopsis and to add it to your watch list.</p>

      <div className="filter-row">
        {PROVIDER_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-chip${activeFilters.includes(f.key) ? " active" : ""}`}
            onClick={() => toggleFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty">Loading...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : visibleMovies.length === 0 ? (
        <p className="empty">
          {movies.length === 0
            ? "No new streaming releases found right now."
            : "No new releases match the selected streaming services."}
        </p>
      ) : (
        <div className="search-results">
          {visibleMovies.map((m) => {
            const p = providers[m.tmdb_id] || {};
            const flatrate = p.flatrate || [];
            const isExpanded = expandedId === m.tmdb_id;
            const isAdded = addedIds.has(m.tmdb_id);
            const isAdding = addingId === m.tmdb_id;
            return (
              <div
                className="search-card"
                key={m.tmdb_id}
                onClick={() => toggleExpand(m.tmdb_id)}
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
                    <div className="year">{m.release_date || m.release_year || "—"}</div>
                  </div>
                  {flatrate.length > 0 ? (
                    <div className="provider-row">
                      {flatrate.map((prov) =>
                        prov.logo ? (
                          <img
                            key={prov.id}
                            src={prov.logo}
                            alt={prov.name}
                            title={prov.name}
                            className="provider-logo"
                          />
                        ) : (
                          <span key={prov.id} className="provider-pill">
                            {prov.name}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="provider-row">
                      <span className="provider-pill muted">Not streaming yet</span>
                    </div>
                  )}
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="provider-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Where to watch →
                    </a>
                  )}
                  {isExpanded && (
                    <>
                      {m.overview && (
                        <p style={{ color: "var(--text)", lineHeight: 1.5, marginTop: 10 }}>
                          {m.overview}
                        </p>
                      )}
                      <button
                        className="btn secondary small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToWatchlist(m);
                        }}
                        disabled={isAdding || isAdded}
                        style={{ marginTop: 10 }}
                      >
                        {isAdded ? "✓ Added to Watch List" : isAdding ? "Adding..." : "+ Want to watch"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

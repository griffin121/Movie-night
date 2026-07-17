import { NextResponse } from "next/server";
const db = require("../../../lib/db");
const { getCurrentUser } = require("../../../lib/currentUser");

export async function GET() {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const movies = db.prepare("SELECT * FROM movies ORDER BY created_at DESC").all();
  const ratingRows = db
    .prepare(
      `SELECT r.movie_id, r.rating, r.user_id, u.username
       FROM ratings r JOIN users u ON u.id = r.user_id`
    )
    .all();

  const ratingsByMovie = new Map();
  for (const row of ratingRows) {
    if (!ratingsByMovie.has(row.movie_id)) ratingsByMovie.set(row.movie_id, []);
    ratingsByMovie.get(row.movie_id).push(row);
  }

  const result = movies.map((movie) => {
    const ratings = ratingsByMovie.get(movie.id) || [];
    const avg = ratings.length
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : null;
    const mine = ratings.find((r) => r.user_id === user.id);
    return {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      release_year: movie.release_year,
      avg,
      count: ratings.length,
      ratings: ratings.map((r) => ({ username: r.username, rating: r.rating })),
      myRating: mine ? mine.rating : null,
    };
  });

  return NextResponse.json({ movies: result });
}

export async function POST(request) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { tmdb_id, title, poster_path, release_year } = await request.json();
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const existing = tmdb_id
    ? db.prepare("SELECT id FROM movies WHERE tmdb_id = ?").get(tmdb_id)
    : null;

  if (existing) {
    return NextResponse.json({ id: existing.id, alreadyExists: true });
  }

  const result = db
    .prepare(
      `INSERT INTO movies (tmdb_id, title, poster_path, release_year, added_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(tmdb_id || null, title, poster_path || null, release_year || null, user.id);

  return NextResponse.json({ id: result.lastInsertRowid });
}

import { NextResponse } from "next/server";
const db = require("../../../lib/db");
const { getCurrentUser } = require("../../../lib/currentUser");

export async function POST(request) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { movie_id, rating } = await request.json();
  const ratingNum = Number(rating);
  if (!movie_id || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: "Rating must be an integer 1-5." }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO ratings (movie_id, user_id, rating)
     VALUES (?, ?, ?)
     ON CONFLICT(movie_id, user_id) DO UPDATE SET rating = excluded.rating`
  ).run(movie_id, user.id, ratingNum);

  return NextResponse.json({ ok: true });
}

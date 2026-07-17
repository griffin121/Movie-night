import { NextResponse } from "next/server";
const { getCurrentUser } = require("../../../../lib/currentUser");
const { searchMovies } = require("../../../../lib/tmdb");

export async function GET(request) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchMovies(query);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

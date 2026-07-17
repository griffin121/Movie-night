import { NextResponse } from "next/server";
const db = require("../../../../lib/db");
const { hashPassword, createSession, SESSION_COOKIE, SESSION_DAYS } = require("../../../../lib/auth");

export async function POST(request) {
  const { username, password } = await request.json();

  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return NextResponse.json({ error: "Username must be at least 2 characters." }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
  }

  const cleanUsername = username.trim();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(cleanUsername);
  if (existing) {
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }

  const passwordHash = hashPassword(password);
  const result = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(cleanUsername, passwordHash);

  const { token } = createSession(result.lastInsertRowid);

  const response = NextResponse.json({ id: result.lastInsertRowid, username: cleanUsername });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return response;
}

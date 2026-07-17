import { NextResponse } from "next/server";
const db = require("../../../../lib/db");
const { verifyPassword, createSession, SESSION_COOKIE, SESSION_DAYS } = require("../../../../lib/auth");

export async function POST(request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  const { token } = createSession(user.id);

  const response = NextResponse.json({ id: user.id, username: user.username });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return response;
}

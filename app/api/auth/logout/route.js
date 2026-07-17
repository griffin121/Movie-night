import { NextResponse } from "next/server";
const { deleteSession, SESSION_COOKIE } = require("../../../../lib/auth");

export async function POST(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  deleteSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

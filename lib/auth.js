const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./db");

const SESSION_COOKIE = "movie_night_session";
const SESSION_DAYS = 30;

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresAt
  );
  return { token, expiresAt };
}

function getUserByToken(token) {
  if (!token) return null;
  const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(session.user_id);
  return user || null;
}

function deleteSession(token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

module.exports = {
  SESSION_COOKIE,
  SESSION_DAYS,
  hashPassword,
  verifyPassword,
  createSession,
  getUserByToken,
  deleteSession,
};

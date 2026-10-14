import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
const { createApp } = await import("../src/app.js");
const { createAuthService, hashPassword, verifyPassword, hashSessionToken } = await import("../src/services/auth.js");

// In-memory stand-in for the database.
const user = { id: 7, email: "asha@example.com", first_name: "Asha", status: "active", password_hash: await hashPassword("old-password-1") };
const suspended = { id: 8, email: "gone@example.com", first_name: "Gone", status: "suspended", password_hash: "x" };
const resets = [];
let sessionsCleared = 0;

const repository = {
  async findUserByEmail(email) {
    return [user, suspended].find((u) => u.email === email);
  },
  async getRoleNames() {
    return ["customer"];
  },
  async createResetToken(userId, tokenHash, expiresAt) {
    resets.filter((r) => r.user_id === userId && !r.used_at).forEach((r) => (r.used_at = new Date()));
    resets.push({ id: resets.length + 1, user_id: userId, token_hash: tokenHash, expires_at: expiresAt, used_at: null, status: "active" });
  },
  async findResetByHash(hash) {
    return resets.find((r) => r.token_hash === hash);
  },
  async completeReset({ resetId, userId, passwordHash }) {
    const row = resets.find((r) => r.id === resetId);
    if (row.used_at) throw Object.assign(new Error("used"), { name: "AuthError", status: 400, code: "INVALID_RESET" });
    row.used_at = new Date();
    user.password_hash = passwordHash;
    sessionsCleared += 1;
  },
};

const mails = [];
const mailer = { configured: true, async send(mail) { mails.push(mail); return { sent: true }; } };
const authService = createAuthService({ repository });
const app = createApp({ authService, mailer, contactService: {}, propertyService: {}, engagementService: {} });
const tokenFromMail = () => /reset-password\?token=([A-Za-z0-9_-]{43})/.exec(mails.at(-1).text)[1];

test("forgot-password answers the same for known and unknown emails", async () => {
  const known = await request(app).post("/api/v1/auth/forgot-password").send({ email: "Asha@Example.com" });
  const unknown = await request(app).post("/api/v1/auth/forgot-password").send({ email: "nobody@example.com" });
  const blocked = await request(app).post("/api/v1/auth/forgot-password").send({ email: "gone@example.com" });
  const garbage = await request(app).post("/api/v1/auth/forgot-password").send({ email: "not-an-email" });
  for (const r of [known, unknown, blocked, garbage]) assert.equal(r.status, 200);
  assert.deepEqual(known.body, unknown.body);
  assert.equal(mails.length, 1, "only the active account receives an email");
  assert.equal(mails[0].to, "asha@example.com");
});

test("only a hash of the token is stored, and the link works once", async () => {
  const token = tokenFromMail();
  assert.equal(resets.at(-1).token_hash, hashSessionToken(token));
  assert.notEqual(resets.at(-1).token_hash, token);

  const short = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "short" });
  assert.equal(short.status, 400);

  const ok = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "brand-new-pass-9" });
  assert.equal(ok.status, 200);
  assert.equal(sessionsCleared, 1, "existing sessions are revoked");
  assert.equal(await verifyPassword("brand-new-pass-9", user.password_hash), true);
  assert.equal(await verifyPassword("old-password-1", user.password_hash), false);

  const again = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "another-pass-77" });
  assert.equal(again.status, 400);
  assert.equal(again.body.error.code, "INVALID_RESET");
});

test("a newer request cancels the older link", async () => {
  await request(app).post("/api/v1/auth/forgot-password").send({ email: "asha@example.com" });
  const first = tokenFromMail();
  await request(app).post("/api/v1/auth/forgot-password").send({ email: "asha@example.com" });
  const second = tokenFromMail();
  assert.notEqual(first, second);
  assert.equal((await request(app).post("/api/v1/auth/reset-password").send({ token: first, password: "first-link-pass-1" })).status, 400);
  assert.equal((await request(app).post("/api/v1/auth/reset-password").send({ token: second, password: "second-link-pass-1" })).status, 200);
});

test("expired and unknown tokens are rejected", async () => {
  await request(app).post("/api/v1/auth/forgot-password").send({ email: "asha@example.com" });
  const token = tokenFromMail();
  resets.at(-1).expires_at = new Date(Date.now() - 1000);
  const expired = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "valid-password-1" });
  assert.equal(expired.status, 400);
  assert.equal(expired.body.error.code, "INVALID_RESET");
  const unknown = await request(app).post("/api/v1/auth/reset-password").send({ token: "A".repeat(43), password: "valid-password-1" });
  assert.equal(unknown.status, 400);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import {
  AuthError,
  createAuthRepository,
  createAuthService,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "../src/services/auth.js";

process.env.NODE_ENV = "test";
const { createApp } = await import("../src/app.js");

test("password hashes use unique salts and verify without storing plaintext", async () => {
  const firstHash = await hashPassword("secure-password-123");
  const secondHash = await hashPassword("secure-password-123");

  assert.match(firstHash, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(firstHash, secondHash);
  assert.equal(firstHash.includes("secure-password-123"), false);
  assert.equal(await verifyPassword("secure-password-123", firstHash), true);
  assert.equal(await verifyPassword("wrong-password", firstHash), false);
  assert.equal(await verifyPassword("secure-password-123", "invalid"), false);
});

test("registration creates a customer and stores only a password hash", async () => {
  let created;
  const service = createAuthService({
    repository: {
      async createCustomer(user) {
        created = user;
        return {
          id: 15,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        };
      },
    },
  });

  await service.register({
    email: "person@example.com",
    password: "secure-password-123",
    firstName: "Aarav",
    lastName: "",
  });

  assert.equal(created.email, "person@example.com");
  assert.equal(created.passwordHash.startsWith("scrypt$"), true);
  assert.equal("password" in created, false);
  assert.equal("role" in created, false);
});

test("repository maps missing database configuration to a fail-closed service error", async () => {
  const repository = createAuthRepository({
    databaseProvider() {
      throw new Error("Missing DB_HOST");
    },
  });

  await assert.rejects(repository.findUserByEmail("person@example.com"), {
    name: "AuthError",
    status: 503,
    code: "AUTH_SERVICE_UNAVAILABLE",
  });
});

test("login rejects invalid credentials and accounts without a recognised role generically", async () => {
  const passwordHash = await hashPassword("secure-password-123");
  const repository = {
    async findUserByEmail() {
      return {
        id: 5,
        email: "person@example.com",
        password_hash: passwordHash,
        first_name: "Aarav",
        last_name: null,
        status: "active",
      };
    },
    async getRoleNames() {
      return ["guest"];
    },
  };
  const service = createAuthService({ repository });

  await assert.rejects(
    service.login({
      email: "person@example.com",
      password: "secure-password-123",
    }),
    { status: 401, code: "INVALID_CREDENTIALS" },
  );
  await assert.rejects(
    service.login({ email: "person@example.com", password: "wrong-password" }),
    { status: 401, code: "INVALID_CREDENTIALS" },
  );
});

test("login stores only a digest of a high-entropy session token", async () => {
  const passwordHash = await hashPassword("secure-password-123");
  let storedSession;
  const service = createAuthService({
    repository: {
      async findUserByEmail() {
        return {
          id: 5,
          email: "person@example.com",
          password_hash: passwordHash,
          first_name: "Aarav",
          last_name: null,
          status: "pending",
        };
      },
      async getRoleNames() {
        return ["customer"];
      },
      async createSession(userId, id, expiresAt) {
        storedSession = { userId, id, expiresAt };
      },
    },
  });

  const result = await service.login({
    email: "person@example.com",
    password: "secure-password-123",
  });

  assert.match(result.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(storedSession.userId, 5);
  assert.equal(storedSession.id, hashSessionToken(result.token));
  assert.notEqual(storedSession.id, result.token);
  assert.ok(storedSession.expiresAt > new Date());
});

test("current-session lookup and logout use the session digest", async () => {
  const token = "c".repeat(43);
  let lookup;
  let revoked;
  const service = createAuthService({
    repository: {
      async findSession(id, now) {
        lookup = { id, now };
        return {
          user_id: 5,
          id: 5,
          email: "person@example.com",
          first_name: "Aarav",
          last_name: null,
          status: "active",
        };
      },
      async getRoleNames() {
        return ["customer"];
      },
      async deleteSession(id) {
        revoked = id;
      },
    },
  });

  const user = await service.getCurrentUser(token);
  await service.logout(token);

  assert.equal(user.email, "person@example.com");
  assert.equal(lookup.id, hashSessionToken(token));
  assert.ok(lookup.now instanceof Date);
  assert.equal(revoked, hashSessionToken(token));
});

test("auth routes validate, normalize registration email, and ignore requested roles", async () => {
  let registration;
  const app = createApp({
    authService: {
      async register(input) {
        registration = input;
        return { id: 2, email: input.email, role: "customer" };
      },
    },
  });

  const response = await request(app).post("/api/v1/auth/register").send({
    email: "  PERSON@Example.com ",
    password: "secure-password-123",
    firstName: "Aarav",
    role: "admin",
  });

  assert.equal(response.status, 201);
  assert.equal(registration.email, "person@example.com");
  assert.equal("role" in registration, false);
  assert.equal(response.body.data.user.role, "customer");

  const invalid = await request(app)
    .post("/api/v1/auth/register")
    .send({ email: "invalid", password: "short", firstName: "" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
});

test("auth routes set secure session-cookie attributes and revoke sessions on logout", async () => {
  let activeToken;
  const app = createApp({
    authService: {
      async login() {
        activeToken = "a".repeat(43);
        return {
          token: activeToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          user: { id: 5, email: "person@example.com", role: "customer" },
        };
      },
      async getCurrentUser(token) {
        if (token !== activeToken) {
          throw new AuthError(401, "INVALID_SESSION", "Please sign in again.");
        }
        return { id: 5, email: "person@example.com", role: "customer" };
      },
      async logout(token) {
        if (token === activeToken) {
          activeToken = null;
        }
      },
    },
  });

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "PERSON@example.com", password: "secure-password-123" });
  assert.equal(login.status, 200);
  const cookie = login.headers["set-cookie"][0];
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.match(cookie, /Path=\/api\/v1(;|$)/i);
  assert.doesNotMatch(cookie, /; Secure/i);

  const session = await request(app)
    .get("/api/v1/auth/me")
    .set("Cookie", cookie.split(";")[0]);
  assert.equal(session.status, 200);
  assert.equal(session.body.data.user.role, "customer");

  const logout = await request(app)
    .post("/api/v1/auth/logout")
    .set("Cookie", cookie.split(";")[0]);
  assert.equal(logout.status, 204);
  assert.match(logout.headers["set-cookie"][0], /Expires=Thu, 01 Jan 1970/i);
  const afterLogout = await request(app)
    .get("/api/v1/auth/me")
    .set("Cookie", cookie.split(";")[0]);
  assert.equal(afterLogout.status, 401);
});

test("invalid session and unavailable database return explicit safe errors", async () => {
  const unavailable = createApp({
    authService: {
      async getCurrentUser() {
        throw new AuthError(
          503,
          "AUTH_SERVICE_UNAVAILABLE",
          "Authentication is temporarily unavailable.",
        );
      },
    },
  });
  const response = await request(unavailable).get("/api/v1/auth/me");
  assert.equal(response.status, 503);
  assert.equal(response.body.error.code, "AUTH_SERVICE_UNAVAILABLE");
  assert.match(response.body.error.message, /temporarily unavailable/);

  const invalid = createApp({
    authService: {
      async getCurrentUser() {
        throw new AuthError(
          401,
          "INVALID_SESSION",
          "Your session is invalid or has expired.",
        );
      },
    },
  });
  const invalidResponse = await request(invalid)
    .get("/api/v1/auth/me")
    .set("Cookie", `realestate.sid=${"b".repeat(43)}`);
  assert.equal(invalidResponse.status, 401);
  assert.equal(invalidResponse.body.error.code, "INVALID_SESSION");
});

test("logout with no cookie succeeds without requiring database access", async () => {
  let loggedOut = false;
  const app = createApp({
    authService: {
      async logout(token) {
        assert.equal(token, null);
        loggedOut = true;
      },
    },
  });

  const response = await request(app).post("/api/v1/auth/logout");
  assert.equal(response.status, 204);
  assert.equal(loggedOut, true);
});

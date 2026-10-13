import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
const { default: app } = await import("../src/app.js");

test("health endpoint reports API status without claiming database connectivity", async () => {
  const response = await request(app).get("/api/v1/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal("database" in response.body, false);
  assert.ok(Number.isNaN(Date.parse(response.body.timestamp)) === false);
});

test("unknown API routes return a structured not-found response", async () => {
  const response = await request(app).get("/api/v1/unknown");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
});

test("database health reports missing local configuration explicitly", async () => {
  const saved = process.env.DB_PASSWORD;
  delete process.env.DB_PASSWORD; // simulate a machine without database/.env
  try {
    const response = await request(app).get("/api/v1/health/database");

    assert.equal(response.status, 503);
    assert.equal(response.body.status, "not_configured");
    assert.equal(response.body.service, "mysql");
  } finally {
    if (saved !== undefined) process.env.DB_PASSWORD = saved;
  }
});

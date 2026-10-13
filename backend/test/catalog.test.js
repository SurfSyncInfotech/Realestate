import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
const { createApp } = await import("../src/app.js");
const saved = [];
const app = createApp({
  contactService: {
    async create(entry) {
      saved.push(entry);
      return { id: saved.length };
    },
  },
});

test("property catalog returns inventory, metadata, and filter results", async () => {
  const response = await request(app)
    .get("/api/v1/properties")
    .query({ mode: "buy", city: "Mumbai", sort: "price-low" });

  assert.equal(response.status, 200);
  assert.equal(response.body.meta.source, "catalogue");
  assert.ok(response.body.data.length >= 1);
  assert.ok(response.body.data.every((property) => property.mode === "buy"));
  assert.ok(response.body.data.every((property) => property.city === "Mumbai"));
  const prices = response.body.data.map((property) => property.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});

test("catalog detail endpoint returns a full listing with gallery and facts when available", async () => {
  const response = await request(app).get("/api/v1/properties/juhu-residence");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, "juhu-residence");
  assert.equal(response.body.meta.source, "catalogue");
  assert.ok(response.body.data.images.length >= 3);
  assert.ok(response.body.data.amenities.length > 0);
});

test("missing properties return a clear not found response", async () => {
  const response = await request(app).get("/api/v1/properties/unknown-property");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "PROPERTY_NOT_FOUND");
});

test("lead submission is stored and acknowledged", async () => {
  const response = await request(app).post("/api/v1/leads").send({
    propertyId: "juhu-residence",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "+91 98765 43210",
    mode: "buy",
    message: "I would like to arrange a private viewing.",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.status, "received");
  assert.equal(response.body.data.propertyId, "juhu-residence");
  assert.equal(saved.at(-1).email, "aarav@example.com");
  assert.match(saved.at(-1).message, /juhu-residence/);
});

test("lead requests without a valid email are rejected", async () => {
  const response = await request(app).post("/api/v1/leads").send({
    name: "Aarav Sharma",
    email: "not-an-email",
    phone: "+91 98765 43210",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "REQUEST_ERROR");
});

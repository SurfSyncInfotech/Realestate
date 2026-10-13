import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
const { createApp } = await import("../src/app.js");

const users = {
  ["a".repeat(43)]: { id: 1, email: "admin@example.com", role: "admin" },
  ["c".repeat(43)]: { id: 2, email: "cust@example.com", role: "customer" },
  ["g".repeat(43)]: { id: 3, email: "agent@example.com", role: "agent" },
};

const admins = [];
const accountChanges = [];
const authService = {
  async createAdmin(input) { admins.push(input); return { id: 99, email: input.email, firstName: input.firstName }; },
  async listAdmins() { return admins; },
  async setAdminStatus() {},
  async listUsers({ role }) { return [{ id: 2, email: "c@example.com", role: role === "all" ? "customer" : role }]; },
  async setAccountStatus(id, status) { accountChanges.push([id, status]); },
  async getCurrentUser(token) {
    if (users[token]) return users[token];
    const error = new Error("Sign in again.");
    error.name = "AuthError";
    error.status = 401;
    error.code = "INVALID_SESSION";
    throw error;
  },
};

const created = [];
const statusChanges = [];
const propertyService = {
  async list() { return []; },
  async getById() { return null; },
  async listSaved(userId) { return [{ id: "juhu-residence", owner: userId }]; },
  async save(userId, id) { return { id, saved: true }; },
  async unsave(userId, id) { return { id, saved: false }; },
  async savedIds() { return ["juhu-residence"]; },
  async listOwned() { return []; },
  async create(user, input) { created.push({ user, input }); return { id: "new-home-abc123", status: user.role === "admin" ? "published" : "pending" }; },
  async listByStatus(status) { return [{ id: "x", status }]; },
  async setStatus(id, status) { statusChanges.push([id, status]); return { id, status }; },
};
const contactService = {
  async create() { return { id: 1 }; },
  async listForUser() { return [{ id: 9, topic: "buying", message: "hi", status: "new" }]; },
  async overview() { return { users: 1, messages: 0, newMessages: 0, pendingListings: 1, properties: 2 }; },
  async list() { return []; },
  async setStatus() {},
};
const events = [];
const engagementService = {
  async notify(ids, payload) { events.push(["notify", ids, payload.type]); },
  async notifyAdmins(payload) { events.push(["admins", payload.type]); },
  async registerLead({ id }) { events.push(["lead", id]); },
  async listNotifications() { return { items: [{ id: 1, title: "Hi", read_at: null }], unread: 1 }; },
  async markRead() {},
  async myEnquiries() { return [{ id: 9, topic: "buying", message: "hi", status: "replied", replies: [{ id: 1, body: "Sure" }], visits: [] }]; },
  async visitsForCustomer() { return []; },
  async listVisits(user) { return [{ id: 4, property_title: "Flat", viewer: user.role }]; },
  async listLeads(user) { return [{ id: 5, stage: "new", viewer: user.role }]; },
  async thread(user, id) { return { message: { id }, replies: [], visits: [] }; },
  async reply(user, id, body) { events.push(["reply", id, body, user.role]); return { ok: true, emailed: false, emailNote: "Email is not configured on the server." }; },
  async scheduleVisit(user, id, input) { events.push(["visit", id, input.agentUserId, user.role]); return { id: 11 }; },
  async setStage(user, id, input) { events.push(["stage", id, input.stage]); return { id, stage: input.stage }; },
  async assignAgent(user, id, agentUserId) { events.push(["assign", id, agentUserId]); return { id }; },
  async followUps() { return [{ id: 5, stage: "follow_up" }]; },
  async analytics() { return { totals: { leads: 3 }, byStage: {}, properties: [] }; },
  async setVisitStatus(id, status) { return { id, status }; },
  async updateProfile(id, input) { return { id, ...input }; },
  async getProfile() { return { phone: null }; },
};
propertyService.listRecent = async () => [{ id: "juhu-residence" }];
propertyService.recordView = async () => {};
const app = createApp({ authService, contactService, propertyService, engagementService });
const as = (token) => ({ Cookie: `realestate.sid=${token}` });

const validListing = {
  title: "Garden apartment in Pune",
  description: "A bright three bedroom apartment with a private garden terrace.",
  listingType: "sale",
  propertyType: "apartment",
  city: "Pune",
  location: "Baner, Pune",
  price: 12500000,
  areaSqFt: 1400,
  beds: 3,
  baths: 2,
};

test("saved properties need a signed-in user", async () => {
  assert.equal((await request(app).get("/api/v1/me/saved")).status, 401);
  const ok = await request(app).get("/api/v1/me/saved").set(as("c".repeat(43)));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data[0].owner, 2);
  const put = await request(app).put("/api/v1/me/saved/juhu-residence").set(as("c".repeat(43)));
  assert.equal(put.body.data.saved, true);
});

test("customers cannot add listings but agents can, and agent listings are pending", async () => {
  const denied = await request(app).post("/api/v1/partner/properties").set(as("c".repeat(43))).send(validListing);
  assert.equal(denied.status, 403);
  const ok = await request(app).post("/api/v1/partner/properties").set(as("g".repeat(43))).send(validListing);
  assert.equal(ok.status, 201);
  assert.equal(ok.body.data.status, "pending");
  assert.equal(created.at(-1).user.id, 3);
});

test("listing validation rejects bad input", async () => {
  const response = await request(app)
    .post("/api/v1/partner/properties")
    .set(as("g".repeat(43)))
    .send({ ...validListing, price: -5, images: ["http://insecure.example/x.jpg"] });
  assert.equal(response.status, 400);
});

test("only admins can review listings", async () => {
  const denied = await request(app).patch("/api/v1/admin/properties/x").set(as("g".repeat(43))).send({ status: "published" });
  assert.equal(denied.status, 403);
  const ok = await request(app).patch("/api/v1/admin/properties/x").set(as("a".repeat(43))).send({ status: "published" });
  assert.equal(ok.status, 200);
  assert.deepEqual(statusChanges.at(-1), ["x", "published"]);
  const queue = await request(app).get("/api/v1/admin/properties?status=pending").set(as("a".repeat(43)));
  assert.equal(queue.body.data[0].status, "pending");
});

test("customers see their own enquiries; admin overview is admin-only", async () => {
  const mine = await request(app).get("/api/v1/me/enquiries").set(as("c".repeat(43)));
  assert.equal(mine.body.data[0].topic, "buying");
  assert.equal(mine.body.data[0].replies[0].body, "Sure");
  assert.equal((await request(app).get("/api/v1/admin/overview").set(as("c".repeat(43)))).status, 403);
  assert.equal((await request(app).get("/api/v1/admin/overview").set(as("a".repeat(43)))).status, 200);
});

test("admin and agents work leads; customers cannot", async () => {
  const admin = "a".repeat(43);
  const agent = "g".repeat(43);
  const customer = "c".repeat(43);
  assert.equal((await request(app).post("/api/v1/leads/5/replies").set(as(customer)).send({ body: "hello" })).status, 403);

  const reply = await request(app).post("/api/v1/leads/5/replies").set(as(admin)).send({ body: "Happy to help, shall we visit?" });
  assert.equal(reply.status, 201);
  assert.match(reply.body.message, /Reply sent/);
  assert.doesNotMatch(reply.body.message, /not configured|not sent/i);
  assert.deepEqual(events.at(-1), ["reply", 5, "Happy to help, shall we visit?", "admin"]);

  const byAgent = await request(app).post("/api/v1/leads/5/replies").set(as(agent)).send({ body: "I will call you today." });
  assert.equal(byAgent.status, 201);
  assert.equal(events.at(-1)[3], "agent");

  assert.equal((await request(app).post("/api/v1/leads/5/visits").set(as(admin)).send({ scheduledAt: "2020-01-01T10:00:00Z" })).status, 400);
  const when = new Date(Date.now() + 86400000).toISOString();
  const visit = await request(app).post("/api/v1/leads/5/visits").set(as(agent)).send({ scheduledAt: when });
  assert.equal(visit.status, 201);

  assert.equal((await request(app).patch("/api/v1/leads/5/stage").set(as(agent)).send({ stage: "nonsense" })).status, 400);
  assert.equal((await request(app).patch("/api/v1/leads/5/stage").set(as(agent)).send({ stage: "closed_won" })).status, 200);
  assert.deepEqual(events.at(-1), ["stage", 5, "closed_won"]);

  assert.equal((await request(app).patch("/api/v1/leads/5/assign").set(as(agent)).send({ agentUserId: 3 })).status, 403);
  assert.equal((await request(app).patch("/api/v1/leads/5/assign").set(as(admin)).send({ agentUserId: 3 })).status, 200);
});

test("leads, follow-ups, analytics and visits are staff-only", async () => {
  for (const path of ["/api/v1/leads", "/api/v1/follow-ups", "/api/v1/analytics", "/api/v1/visits"]) {
    assert.equal((await request(app).get(path).set(as("c".repeat(43)))).status, 403, path);
    assert.equal((await request(app).get(path).set(as("g".repeat(43)))).status, 200, path);
  }
  const leads = await request(app).get("/api/v1/leads").set(as("g".repeat(43)));
  assert.equal(leads.body.data[0].viewer, "agent");
});

test("customers manage their profile, recently viewed and notifications", async () => {
  const c = "c".repeat(43);
  assert.equal((await request(app).get("/api/v1/me/notifications")).status, 401);
  assert.equal((await request(app).get("/api/v1/me/notifications").set(as(c))).body.data.unread, 1);
  const bad = await request(app).patch("/api/v1/me/profile").set(as(c)).send({ firstName: "" });
  assert.equal(bad.status, 400);
  const ok = await request(app).patch("/api/v1/me/profile").set(as(c)).send({ firstName: "Asha", phone: "+91 98765 43210" });
  assert.equal(ok.status, 200);
  assert.equal((await request(app).get("/api/v1/me/recent").set(as(c))).body.data[0].id, "juhu-residence");
});

test("new property enquiries and contact messages become leads", async () => {
  const before = events.length;
  await request(app).post("/api/v1/contact").send({ name: "Meera", email: "m@e.com", message: "I would like to know more" });
  assert.ok(events.slice(before).some((e) => e[0] === "lead"));
});

test("agents upload property photos; only real images are accepted", async () => {
  const { rm } = await import("node:fs/promises");
  const { UPLOAD_DIR } = await import("../src/routes/uploads.js");
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);

  assert.equal((await request(app).post("/api/v1/partner/uploads").set(as("c".repeat(43))).attach("photos", png, "a.png")).status, 403);

  const fake = await request(app).post("/api/v1/partner/uploads").set(as("g".repeat(43))).attach("photos", Buffer.from("not an image at all, just text"), "evil.png");
  assert.equal(fake.status, 400);

  const ok = await request(app).post("/api/v1/partner/uploads").set(as("g".repeat(43))).attach("photos", png, "house.png");
  assert.equal(ok.status, 201);
  assert.match(ok.body.data.urls[0], /^\/uploads\/properties\/[a-f0-9]+\.png$/);

  const served = await request(app).get(ok.body.data.urls[0]);
  assert.equal(served.status, 200);
  await rm(`${UPLOAD_DIR}/${ok.body.data.urls[0].split("/").pop()}`, { force: true });
});

test("only admins can list and add administrators", async () => {
  const body = { firstName: "Priya", email: "priya@example.com", password: "long-enough-pass" };
  assert.equal((await request(app).post("/api/v1/admin/admins").set(as("g".repeat(43))).send(body)).status, 403);
  assert.equal((await request(app).post("/api/v1/admin/admins").set(as("a".repeat(43))).send({ ...body, password: "short" })).status, 400);
  const ok = await request(app).post("/api/v1/admin/admins").set(as("a".repeat(43))).send(body);
  assert.equal(ok.status, 201);
  assert.equal((await request(app).get("/api/v1/admin/admins").set(as("a".repeat(43)))).status, 200);
  assert.equal((await request(app).patch("/api/v1/admin/admins/1").set(as("a".repeat(43))).send({ status: "suspended" })).status, 400);
});

test("admins list users and suspend or reactivate accounts; others cannot", async () => {
  assert.equal((await request(app).get("/api/v1/admin/users").set(as("g".repeat(43)))).status, 403);
  const list = await request(app).get("/api/v1/admin/users?role=customer&q=asha").set(as("a".repeat(43)));
  assert.equal(list.status, 200);
  assert.equal(list.body.data[0].role, "customer");
  assert.equal((await request(app).patch("/api/v1/admin/users/2").set(as("a".repeat(43))).send({ status: "suspended" })).status, 200);
  assert.deepEqual(accountChanges.at(-1), [2, "suspended"]);
  assert.equal((await request(app).patch("/api/v1/admin/users/1").set(as("a".repeat(43))).send({ status: "suspended" })).status, 400);
  assert.equal((await request(app).patch("/api/v1/admin/users/2").set(as("a".repeat(43))).send({ status: "deleted" })).status, 400);
});

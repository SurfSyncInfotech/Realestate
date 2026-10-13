import { createDatabase } from "@realestate/database";
import { createMailer, replyEmail } from "./mailer.js";
import { env } from "../config/env.js";

class EngagementError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "EngagementError";
    this.expose = true; // safe to show the message to the client
    this.status = status;
    this.code = code;
  }
}

const unavailable = () =>
  new EngagementError(503, "SERVICE_UNAVAILABLE", "That could not be saved right now. Please try again shortly.");
const notFound = (what) => new EngagementError(404, "NOT_FOUND", `${what} was not found.`);

export const STAGES = ["new", "contacted", "visit_scheduled", "follow_up", "closed_won", "closed_lost"];
const STAGE_LABEL = {
  new: "New lead",
  contacted: "Contacted",
  visit_scheduled: "Visit scheduled",
  follow_up: "Follow-up",
  closed_won: "Deal closed",
  closed_lost: "Closed (lost)",
};

// "[Property enquiry: Title (slug)] ..." -> { title, slug }
export function parsePropertyRef(message) {
  const match = /^\[Property enquiry: (.+?)(?: \(([a-z0-9-]+)\))?\]/i.exec(message ?? "");
  return match ? { title: match[1], slug: match[2] ?? null } : { title: null, slug: null };
}

export function parseRequestType(message) {
  const match = /Request type: (enquiry|callback|site visit)/i.exec(message ?? "");
  return match ? match[1].toLowerCase() : "enquiry";
}

const isPartner = (user) => ["agent", "builder"].includes(user.role);

// The lead pipeline, replies, site visits, follow-ups, analytics and in-app
// notifications for every role.
export function createEngagementService({ databaseProvider = createDatabase, mailer = createMailer() } = {}) {
  let database;
  const db = () => (database ??= databaseProvider());

  async function adminIds() {
    const rows = await db()("users as u")
      .join("user_roles as ur", "ur.user_id", "u.id")
      .join("roles as r", "r.id", "ur.role_id")
      .where({ "r.name": "admin", "u.status": "active" })
      .select("u.id");
    return rows.map((r) => r.id);
  }

  async function customerIdFor(message) {
    return message.user_id ?? (await db()("users").select("id").where({ email: message.email }).first())?.id ?? null;
  }

  /** Load a lead, enforcing that partners only reach their own leads. */
  async function accessLead(user, messageId) {
    const message = await db()("contact_messages").where({ id: messageId }).first();
    if (!message) throw notFound("That enquiry");
    let progress = await db()("lead_progress").where({ message_id: messageId }).first();
    if (!progress) {
      const ref = parsePropertyRef(message.message);
      const owner = ref.slug ? await db()("properties").select("owner_user_id").where({ slug: ref.slug }).first() : null;
      await db()("lead_progress").insert({ message_id: messageId, property_slug: ref.slug, owner_user_id: owner?.owner_user_id ?? null });
      progress = await db()("lead_progress").where({ message_id: messageId }).first();
    }
    if (isPartner(user) && progress.owner_user_id !== user.id && progress.assigned_agent_user_id !== user.id) {
      throw notFound("That enquiry");
    }
    return { message, progress };
  }

  const guard = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof EngagementError) throw error;
      throw unavailable();
    }
  };

  const service = {
    mailerConfigured: mailer.configured,

    /** One notification per user. Never throws: a failed alert must not break the action. */
    async notify(userIds, { type, title, body = null, link = null }) {
      try {
        const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean))];
        if (ids.length === 0) return;
        await db()("app_notifications").insert(ids.map((user_id) => ({ user_id, type, title, body, link })));
      } catch {
        /* best effort */
      }
    },

    async notifyAdmins(payload) {
      try {
        await service.notify(await adminIds(), payload);
      } catch {
        /* best effort */
      }
    },

    async listNotifications(userId) {
      try {
        const [items, unread] = await Promise.all([
          db()("app_notifications")
            .select("id", "type", "title", "body", "link", "read_at", "created_at")
            .where({ user_id: userId })
            .orderBy("created_at", "desc")
            .limit(50),
          db()("app_notifications").where({ user_id: userId }).whereNull("read_at").count({ n: "*" }).first(),
        ]);
        return { items, unread: Number(unread.n) };
      } catch {
        throw unavailable();
      }
    },

    async markRead(userId, id) {
      try {
        const q = db()("app_notifications").where({ user_id: userId }).whereNull("read_at");
        if (id) q.where({ id });
        await q.update({ read_at: new Date() });
      } catch {
        throw unavailable();
      }
    },

    /* ---------- lead creation ---------- */
    /** A new enquiry becomes a lead and the admins and the property's agent are told. */
    async registerLead({ id, name, message }) {
      try {
        const ref = parsePropertyRef(message);
        const property = ref.slug
          ? await db()("properties").select("owner_user_id", "title").where({ slug: ref.slug }).first()
          : null;
        await db()("lead_progress")
          .insert({ message_id: id, property_slug: ref.slug, owner_user_id: property?.owner_user_id ?? null })
          .onConflict("message_id")
          .ignore();
        const type = parseRequestType(message);
        const title = ref.title ? `New ${type === "enquiry" ? "enquiry" : type + " request"}: ${ref.title}` : `New message from ${name}`;
        const body = `${name}: ${message.replace(/^\[[^\]]*\]\s*/, "").slice(0, 120)}`;
        await service.notifyAdmins({ type: "enquiry", title, body, link: "/dashboard/admin?tab=inbox" });
        if (property?.owner_user_id) {
          await service.notify(property.owner_user_id, { type: "lead", title: `New lead on your property`, body: `${ref.title} - ${name}`, link: "/dashboard/agent?tab=leads" });
        }
      } catch {
        /* the enquiry itself is already saved */
      }
    },

    /* ---------- leads (admin: all, agents: their own) ---------- */
    listLeads: guard(async (user, { stage } = {}) => {
      const q = db()("contact_messages as m")
        .leftJoin("lead_progress as lp", "lp.message_id", "m.id")
        .leftJoin("users as a", "a.id", "lp.assigned_agent_user_id")
        .leftJoin("properties as p", "p.slug", "lp.property_slug")
        .select(
          "m.id", "m.name", "m.email", "m.phone", "m.topic", "m.message", "m.status", "m.created_at",
          "lp.stage", "lp.follow_up_at", "lp.follow_up_note", "lp.property_slug", "lp.assigned_agent_user_id",
          "a.first_name as agent_first", "a.last_name as agent_last", "p.title as property_title",
        )
        .orderBy("m.created_at", "desc")
        .limit(200);
      if (isPartner(user)) {
        q.where((b) => b.where("lp.owner_user_id", user.id).orWhere("lp.assigned_agent_user_id", user.id));
      }
      if (stage && stage !== "all") {
        if (stage === "new") q.where((b) => b.where("lp.stage", "new").orWhereNull("lp.stage"));
        else q.where("lp.stage", stage);
      }
      const rows = await q;
      return rows.map((r) => ({
        ...r,
        stage: r.stage ?? "new",
        request_type: parseRequestType(r.message),
        property_title: r.property_title ?? parsePropertyRef(r.message).title,
        property_slug: r.property_slug ?? parsePropertyRef(r.message).slug,
      }));
    }),

    thread: guard(async (user, messageId) => {
      const { message, progress } = await accessLead(user, messageId);
      const [replies, visits] = await Promise.all([
        db()("enquiry_replies as r")
          .leftJoin("users as u", "u.id", "r.author_user_id")
          .select("r.id", "r.body", "r.created_at", "u.first_name", "u.last_name")
          .where("r.message_id", messageId)
          .orderBy("r.created_at"),
        db()("visit_schedules as v")
          .leftJoin("users as a", "a.id", "v.agent_user_id")
          .select("v.id", "v.property_slug", "v.property_title", "v.scheduled_at", "v.status", "v.notes", "v.agent_user_id", "a.first_name as agent_first", "a.last_name as agent_last")
          .where("v.message_id", messageId)
          .orderBy("v.scheduled_at"),
      ]);
      return { message, progress, replies, visits, property: parsePropertyRef(message.message), requestType: parseRequestType(message.message) };
    }),

    reply: guard(async (user, messageId, body) => {
      const { message, progress } = await accessLead(user, messageId);
      await db()("enquiry_replies").insert({ message_id: messageId, author_user_id: user.id, body });
      await db()("contact_messages").where({ id: messageId }).update({ status: "replied", updated_at: new Date() });
      if (progress.stage === "new") await db()("lead_progress").where({ message_id: messageId }).update({ stage: "contacted", updated_at: new Date() });

      await service.notify(await customerIdFor(message), {
        type: "reply",
        title: "We replied to your enquiry",
        body: body.slice(0, 160),
        link: "/user-dashboard?tab=enquiries",
      });
      const ref = parsePropertyRef(message.message);
      const mail = replyEmail({ name: message.name, body, propertyTitle: ref.title, dashboardUrl: `${env.APP_URL}/user-dashboard?tab=enquiries` });
      const emailResult = await mailer.send({ to: message.email, ...mail });
      return { ok: true, emailed: emailResult.sent, emailNote: emailResult.sent ? `Also emailed to ${message.email}.` : emailResult.reason };
    }),

    setStage: guard(async (user, messageId, { stage, followUpAt, note }) => {
      if (!STAGES.includes(stage)) throw new EngagementError(400, "VALIDATION_ERROR", "Choose a valid stage.");
      const { message } = await accessLead(user, messageId);
      const when = stage === "follow_up" ? (followUpAt ? new Date(followUpAt) : new Date(Date.now() + 2 * 86400000)) : followUpAt ? new Date(followUpAt) : null;
      await db()("lead_progress").where({ message_id: messageId }).update({
        stage,
        follow_up_at: when,
        follow_up_note: note || null,
        updated_at: new Date(),
      });
      if (stage === "closed_won" || stage === "closed_lost") {
        await service.notifyAdmins({ type: "lead", title: `Lead ${STAGE_LABEL[stage].toLowerCase()}`, body: `${message.name} (${user.firstName})`, link: "/dashboard/admin?tab=inbox" });
      }
      return { id: messageId, stage };
    }),

    assignAgent: guard(async (admin, messageId, agentUserId) => {
      const { message } = await accessLead(admin, messageId);
      await db()("lead_progress").where({ message_id: messageId }).update({ assigned_agent_user_id: agentUserId || null, updated_at: new Date() });
      await service.notify(agentUserId, {
        type: "lead",
        title: "A lead was assigned to you",
        body: `${message.name} - ${parsePropertyRef(message.message).title ?? "general enquiry"}`,
        link: "/dashboard/agent?tab=leads",
      });
      return { id: messageId, agentUserId: agentUserId || null };
    }),

    followUps: guard(async (user) => {
      const leads = await service.listLeads(user, { stage: "all" });
      return leads
        .filter((l) => l.follow_up_at && !["closed_won", "closed_lost"].includes(l.stage))
        .sort((a, b) => new Date(a.follow_up_at) - new Date(b.follow_up_at));
    }),

    /* ---------- site visits ---------- */
    scheduleVisit: guard(async (user, messageId, { scheduledAt, agentUserId, propertySlug, notes }) => {
      const { message, progress } = await accessLead(user, messageId);
      const ref = parsePropertyRef(message.message);
      const slug = propertySlug || ref.slug;
      let title = ref.title;
      if (slug) title = (await db()("properties").select("title").where({ slug }).first())?.title ?? title;
      const agentId = agentUserId || (isPartner(user) ? user.id : progress.assigned_agent_user_id) || null;
      const when = new Date(scheduledAt);
      const [id] = await db()("visit_schedules").insert({
        message_id: messageId, property_slug: slug || null, property_title: title || null,
        agent_user_id: agentId, scheduled_at: when, notes: notes || null,
      });
      await db()("contact_messages").where({ id: messageId }).update({ status: "replied", updated_at: new Date() });
      await db()("lead_progress").where({ message_id: messageId }).update({
        stage: "visit_scheduled",
        assigned_agent_user_id: agentId ?? progress.assigned_agent_user_id,
        updated_at: new Date(),
      });

      const pretty = when.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      await service.notify(await customerIdFor(message), { type: "visit", title: "Site visit scheduled", body: `${title ?? "Your property visit"} on ${pretty}`, link: "/user-dashboard?tab=visits" });
      if (agentId && agentId !== user.id) {
        await service.notify(agentId, { type: "visit", title: "New site visit assigned", body: `${title ?? "Property visit"} on ${pretty} with ${message.name}`, link: "/dashboard/agent?tab=visits" });
      }
      if (isPartner(user)) {
        await service.notifyAdmins({ type: "visit", title: "Site visit booked by an agent", body: `${title ?? "Property visit"} on ${pretty} - ${message.name}`, link: "/dashboard/admin?tab=visits" });
      }
      const mail = replyEmail({
        name: message.name,
        body: `Your site visit${title ? ` for ${title}` : ""} is booked for ${pretty}.${notes ? `\n\n${notes}` : ""}`,
        propertyTitle: title,
        dashboardUrl: `${env.APP_URL}/user-dashboard?tab=visits`,
      });
      const emailResult = await mailer.send({ to: message.email, ...mail });
      return { id, emailed: emailResult.sent };
    }),

    setVisitStatus: guard(async (visitId, status, { actor, userId } = {}) => {
      const visit = await db()("visit_schedules as v")
        .join("contact_messages as m", "m.id", "v.message_id")
        .leftJoin("lead_progress as lp", "lp.message_id", "v.message_id")
        .select("v.*", "m.user_id as customer_id", "m.email", "lp.owner_user_id")
        .where("v.id", visitId)
        .first();
      if (!visit) throw notFound("That visit");
      if (actor === "customer" && visit.customer_id !== userId) throw notFound("That visit");
      if (actor === "agent" && visit.agent_user_id !== userId && visit.owner_user_id !== userId) throw notFound("That visit");
      await db()("visit_schedules").where({ id: visitId }).update({ status, updated_at: new Date() });
      if (status === "completed") {
        await db()("lead_progress").where({ message_id: visit.message_id, stage: "visit_scheduled" }).update({
          stage: "follow_up",
          follow_up_at: new Date(Date.now() + 2 * 86400000),
          follow_up_note: "Ask how the visit went",
          updated_at: new Date(),
        });
      }
      const label = { cancelled: "cancelled", completed: "marked as completed", scheduled: "rescheduled" }[status];
      const title = `Site visit ${label}`;
      const body = visit.property_title ?? "Your property visit";
      if (actor !== "customer") await service.notify(visit.customer_id, { type: "visit", title, body, link: "/user-dashboard?tab=visits" });
      if (actor !== "agent") await service.notify(visit.agent_user_id, { type: "visit", title, body, link: "/dashboard/agent?tab=visits" });
      if (actor === "customer") await service.notifyAdmins({ type: "visit", title, body: `${body} (cancelled by customer)`, link: "/dashboard/admin?tab=visits" });
      return { id: visitId, status };
    }),

    listVisits: guard(async (user, { status } = {}) => {
      const q = db()("visit_schedules as v")
        .join("contact_messages as m", "m.id", "v.message_id")
        .leftJoin("lead_progress as lp", "lp.message_id", "v.message_id")
        .leftJoin("users as a", "a.id", "v.agent_user_id")
        .select("v.id", "v.message_id", "v.property_slug", "v.property_title", "v.scheduled_at", "v.status", "v.notes", "m.name as customer_name", "m.email as customer_email", "m.phone as customer_phone", "a.first_name as agent_first", "a.last_name as agent_last")
        .orderBy("v.scheduled_at", "asc")
        .limit(100);
      if (isPartner(user)) q.where((b) => b.where("v.agent_user_id", user.id).orWhere("lp.owner_user_id", user.id));
      if (status && status !== "all") q.where("v.status", status);
      return q;
    }),

    /* ---------- customer ---------- */
    myEnquiries: guard(async ({ userId, email }) => {
      const messages = await db()("contact_messages as m")
        .leftJoin("lead_progress as lp", "lp.message_id", "m.id")
        .select("m.id", "m.topic", "m.message", "m.status", "m.created_at", "lp.stage")
        .where((b) => b.where("m.user_id", userId).orWhere("m.email", email))
        .orderBy("m.created_at", "desc")
        .limit(50);
      if (messages.length === 0) return [];
      const ids = messages.map((m) => m.id);
      const [replies, visits] = await Promise.all([
        db()("enquiry_replies").select("id", "message_id", "body", "created_at").whereIn("message_id", ids).orderBy("created_at"),
        db()("visit_schedules").select("id", "message_id", "property_slug", "property_title", "scheduled_at", "status", "notes").whereIn("message_id", ids).orderBy("scheduled_at"),
      ]);
      return messages.map((m) => ({
        ...m,
        stage: m.stage ?? "new",
        request_type: parseRequestType(m.message),
        property: parsePropertyRef(m.message),
        replies: replies.filter((r) => r.message_id === m.id),
        visits: visits.filter((v) => v.message_id === m.id),
      }));
    }),

    visitsForCustomer: guard(async ({ userId, email }) =>
      db()("visit_schedules as v")
        .join("contact_messages as m", "m.id", "v.message_id")
        .leftJoin("users as a", "a.id", "v.agent_user_id")
        .select("v.id", "v.property_slug", "v.property_title", "v.scheduled_at", "v.status", "v.notes", "a.first_name as agent_first", "a.last_name as agent_last")
        .where((b) => b.where("m.user_id", userId).orWhere("m.email", email))
        .orderBy("v.scheduled_at", "asc"),
    ),

    updateProfile: guard(async (userId, { firstName, lastName, phone }) => {
      const digits = phone ? phone.replace(/[\s()-]/g, "") : null;
      if (digits && !/^\+?[0-9]{7,15}$/.test(digits)) throw new EngagementError(400, "VALIDATION_ERROR", "Enter a valid phone number.");
      try {
        await db()("users").where({ id: userId }).update({ first_name: firstName, last_name: lastName || null, phone_e164: digits, updated_at: new Date() });
      } catch (error) {
        if (error?.code === "ER_DUP_ENTRY") throw new EngagementError(409, "PHONE_IN_USE", "That phone number is already used by another account.");
        throw error;
      }
      const row = await db()("users").select("id", "email", "first_name", "last_name", "phone_e164").where({ id: userId }).first();
      return { id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name, phone: row.phone_e164 };
    }),

    getProfile: guard(async (userId) => {
      const row = await db()("users").select("phone_e164").where({ id: userId }).first();
      return { phone: row?.phone_e164 ?? null };
    }),

    /* ---------- agent analytics ---------- */
    analytics: guard(async (user) => {
      const owned = isPartner(user);
      const props = db()("properties").select("slug", "title", "status", "view_count").orderBy("view_count", "desc").limit(50);
      if (owned) props.where({ owner_user_id: user.id });
      const leadRows = db()("lead_progress as lp")
        .select("lp.property_slug", "lp.stage")
        .count({ n: "*" })
        .groupBy("lp.property_slug", "lp.stage");
      if (owned) leadRows.where((b) => b.where("lp.owner_user_id", user.id).orWhere("lp.assigned_agent_user_id", user.id));
      const visitRows = db()("visit_schedules as v")
        .leftJoin("lead_progress as lp", "lp.message_id", "v.message_id")
        .select("v.status")
        .count({ n: "*" })
        .groupBy("v.status");
      if (owned) visitRows.where((b) => b.where("v.agent_user_id", user.id).orWhere("lp.owner_user_id", user.id));
      const [properties, leads, visits] = await Promise.all([props, leadRows, visitRows]);

      const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
      const perProperty = new Map();
      for (const row of leads) {
        byStage[row.stage] += Number(row.n);
        perProperty.set(row.property_slug, (perProperty.get(row.property_slug) ?? 0) + Number(row.n));
      }
      const visitCounts = Object.fromEntries(visits.map((v) => [v.status, Number(v.n)]));
      const totalLeads = Object.values(byStage).reduce((a, b) => a + b, 0);
      const won = byStage.closed_won;
      return {
        totals: {
          listings: properties.length,
          live: properties.filter((p) => p.status === "published").length,
          views: properties.reduce((sum, p) => sum + p.view_count, 0),
          leads: totalLeads,
          won,
          visitsScheduled: visitCounts.scheduled ?? 0,
          visitsCompleted: visitCounts.completed ?? 0,
          conversion: totalLeads ? Math.round((won / totalLeads) * 100) : 0,
        },
        byStage,
        properties: properties.map((p) => ({ id: p.slug, title: p.title, status: p.status, views: p.view_count, leads: perProperty.get(p.slug) ?? 0 })),
      };
    }),
  };

  return service;
}

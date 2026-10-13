import { createDatabase } from "@realestate/database";

function unavailable() {
  const error = new Error(
    "We could not save your message right now. Please try again shortly.",
  );
  error.status = 503;
  error.code = "SERVICE_UNAVAILABLE";
  error.expose = true;
  return error;
}

// Persists contact-page messages and powers the admin inbox.
export function createContactService({ databaseProvider = createDatabase } = {}) {
  let database;
  const db = () => (database ??= databaseProvider());

  return {
    async create({ name, email, phone, topic, message, userId = null }) {
      try {
        const [id] = await db()("contact_messages").insert({
          name,
          email,
          phone: phone || null,
          topic,
          message,
          user_id: userId,
        });
        return { id };
      } catch {
        throw unavailable();
      }
    },

    async list({ limit = 50 } = {}) {
      try {
        return await db()("contact_messages")
          .select("id", "name", "email", "phone", "topic", "message", "status", "created_at")
          .orderBy("created_at", "desc")
          .limit(limit);
      } catch {
        throw unavailable();
      }
    },

    async listForUser({ userId, email }) {
      try {
        return await db()("contact_messages")
          .select("id", "topic", "message", "status", "created_at")
          .where((b) => b.where({ user_id: userId }).orWhere({ email }))
          .orderBy("created_at", "desc")
          .limit(50);
      } catch {
        throw unavailable();
      }
    },

    async setStatus(id, status) {
      try {
        return await db()("contact_messages").where({ id }).update({ status, updated_at: new Date() });
      } catch {
        throw unavailable();
      }
    },

    async overview() {
      try {
        const count = async (query) => Number((await query.count({ n: "*" }).first()).n);
        const [users, messages, newMessages, pendingListings, properties, upcomingVisits] = await Promise.all([
          count(db()("users")),
          count(db()("contact_messages")),
          count(db()("contact_messages").where({ status: "new" })),
          count(db()("properties").where({ status: "pending" })),
          count(db()("properties").where({ status: "published" })),
          count(db()("visit_schedules").where({ status: "scheduled" }).where("scheduled_at", ">=", new Date())),
        ]);
        return { users, messages, newMessages, pendingListings, properties, upcomingVisits };
      } catch {
        throw unavailable();
      }
    },
  };
}

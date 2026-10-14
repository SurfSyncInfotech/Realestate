import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { createDatabase } from "@realestate/database";

const scrypt = promisify(scryptCallback);
const RESET_TTL_MS = 60 * 60 * 1000;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(32).toString("base64url"));

export class AuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password, encodedHash) {
  const match =
    typeof encodedHash === "string" &&
    /^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/.exec(
      encodedHash,
    );

  if (!match) {
    await DUMMY_PASSWORD_HASH;
    return false;
  }

  const [, , , , saltText, expectedText] = encodedHash.split("$");
  const expected = Buffer.from(expectedText, "base64url");
  const actual = await scrypt(
    password,
    Buffer.from(saltText, "base64url"),
    expected.length,
    SCRYPT_OPTIONS,
  );
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function mapDatabaseError(error) {
  if (error instanceof AuthError) {
    return error;
  }
  if (error?.code === "ER_DUP_ENTRY") {
    return new AuthError(
      409,
      "ACCOUNT_NOT_CREATED",
      "Unable to create an account with the provided details.",
    );
  }
  return new AuthError(
    503,
    "AUTH_SERVICE_UNAVAILABLE",
    "Authentication is temporarily unavailable. Check local MySQL configuration and apply the existing database migrations.",
  );
}

export function createAuthRepository({
  databaseProvider = createDatabase,
} = {}) {
  let database;
  function getDatabase() {
    database ??= databaseProvider();
    return database;
  }

  return {
    async createCustomer({ email, passwordHash, firstName, lastName }) {
      try {
        return await getDatabase().transaction(async (trx) => {
          const role = await trx("roles")
            .select("id")
            .where({ name: "customer" })
            .first();
          if (!role) {
            throw new Error("Customer role is missing");
          }

          const [id] = await trx("users").insert({
            email,
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName || null,
          });
          await trx("user_roles").insert({ user_id: id, role_id: role.id });
          return {
            id,
            email,
            first_name: firstName,
            last_name: lastName || null,
          };
        });
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async createPartner({ email, passwordHash, firstName, lastName, role, company }) {
      try {
        return await getDatabase().transaction(async (trx) => {
          const roleRow = await trx("roles").select("id").where({ name: role }).first();
          if (!roleRow) throw new Error(`${role} role is missing`);
          const [id] = await trx("users").insert({
            email,
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName || null,
            status: "pending",
          });
          await trx("user_roles").insert({ user_id: id, role_id: roleRow.id });
          if (role === "builder") {
            await trx("builder_profiles").insert({ user_id: id, company_name: company || `${firstName} ${lastName || ""}`.trim() });
          } else {
            await trx("agent_profiles").insert({ user_id: id, agency_name: company || null });
          }
          return { id, email, first_name: firstName, last_name: lastName || null };
        });
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async listPartners(status) {
      try {
        const q = getDatabase()("users as u")
          .join("user_roles as ur", "ur.user_id", "u.id")
          .join("roles as r", "r.id", "ur.role_id")
          .whereIn("r.name", ["agent", "builder"])
          .leftJoin("properties as pr", "pr.owner_user_id", "u.id")
          .select("u.id", "u.email", "u.first_name", "u.last_name", "u.status", "u.created_at", "r.name as role")
          .count({ listings: "pr.id" })
          .groupBy("u.id", "u.email", "u.first_name", "u.last_name", "u.status", "u.created_at", "r.name")
          .orderBy("u.created_at", "desc");
        if (status && status !== "all") q.where("u.status", status);
        return await q;
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async setUserStatus(userId, status) {
      try {
        const profileStatus = status === "active" ? "approved" : status === "suspended" ? "suspended" : "rejected";
        await getDatabase().transaction(async (trx) => {
          await trx("users").where({ id: userId }).update({ status, updated_at: new Date() });
          await trx("agent_profiles").where({ user_id: userId }).update({ approval_status: profileStatus });
          await trx("builder_profiles").where({ user_id: userId }).update({ approval_status: profileStatus });
        });
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async createAdmin({ email, passwordHash, firstName, lastName }) {
      try {
        return await getDatabase().transaction(async (trx) => {
          const roleRow = await trx("roles").select("id").where({ name: "admin" }).first();
          if (!roleRow) throw new Error("admin role is missing");
          const [id] = await trx("users").insert({
            email,
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName || null,
            status: "active",
            email_verified_at: new Date(),
          });
          await trx("user_roles").insert({ user_id: id, role_id: roleRow.id });
          return { id, email, first_name: firstName, last_name: lastName || null };
        });
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async listAdmins() {
      try {
        return await getDatabase()("users as u")
          .join("user_roles as ur", "ur.user_id", "u.id")
          .join("roles as r", "r.id", "ur.role_id")
          .where("r.name", "admin")
          .select("u.id", "u.email", "u.first_name", "u.last_name", "u.status", "u.created_at", "u.last_login_at")
          .orderBy("u.created_at", "asc");
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async listUsers({ role, q }) {
      try {
        const query = getDatabase()("users as u")
          .leftJoin("user_roles as ur", "ur.user_id", "u.id")
          .leftJoin("roles as r", "r.id", "ur.role_id")
          .select("u.id", "u.email", "u.first_name", "u.last_name", "u.phone_e164", "u.status", "u.created_at", "u.last_login_at", "r.name as role")
          .orderBy("u.created_at", "desc")
          .limit(300);
        if (role && role !== "all") query.where("r.name", role);
        if (q) {
          const like = `%${q}%`;
          query.where((b) => b.whereILike("u.email", like).orWhereILike("u.first_name", like).orWhereILike("u.last_name", like));
        }
        return await query;
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async getUserRole(userId) {
      try {
        const row = await getDatabase()("user_roles as ur")
          .join("roles as r", "r.id", "ur.role_id")
          .select("r.name")
          .where("ur.user_id", userId)
          .first();
        return row?.name ?? null;
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async createResetToken(userId, tokenHash, expiresAt) {
      try {
        await getDatabase().transaction(async (trx) => {
          // Only the newest link works: retire earlier unused ones.
          await trx("password_resets").where({ user_id: userId }).whereNull("used_at").update({ used_at: new Date() });
          await trx("password_resets").insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });
        });
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async findResetByHash(tokenHash) {
      try {
        return await getDatabase()("password_resets as pr")
          .join("users as u", "u.id", "pr.user_id")
          .select("pr.id", "pr.user_id", "pr.expires_at", "pr.used_at", "u.status")
          .where("pr.token_hash", tokenHash)
          .first();
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    // Sets the new password, burns the token and signs the user out everywhere.
    async completeReset({ resetId, userId, passwordHash }) {
      try {
        await getDatabase().transaction(async (trx) => {
          const claimed = await trx("password_resets").where({ id: resetId }).whereNull("used_at").update({ used_at: new Date() });
          if (claimed !== 1) throw new AuthError(400, "INVALID_RESET", "This reset link is invalid or has expired.");
          await trx("users").where({ id: userId }).update({ password_hash: passwordHash, updated_at: new Date() });
          await trx("sessions").where({ user_id: userId }).delete();
        });
      } catch (error) {
        if (error instanceof AuthError) throw error;
        throw mapDatabaseError(error);
      }
    },

    async findUserByEmail(email) {
      try {
        return await getDatabase()("users")
          .select(
            "id",
            "email",
            "password_hash",
            "first_name",
            "last_name",
            "status",
          )
          .where({ email })
          .first();
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async getRoleNames(userId) {
      try {
        const roles = await getDatabase()("user_roles")
          .join("roles", "roles.id", "user_roles.role_id")
          .select("roles.name")
          .where({ "user_roles.user_id": userId });
        return roles.map((role) => role.name);
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async createSession(userId, sessionId, expiresAt) {
      try {
        await getDatabase().transaction(async (trx) => {
          await trx("sessions").insert({
            id: sessionId,
            user_id: userId,
            data: "{}",
            expires_at: expiresAt,
          });
          await trx("users")
            .where({ id: userId })
            .update({ last_login_at: new Date() });
        });
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async findSession(sessionId, now) {
      try {
        return await getDatabase()("sessions")
          .join("users", "users.id", "sessions.user_id")
          .select(
            "sessions.user_id",
            "users.id",
            "users.email",
            "users.first_name",
            "users.last_name",
            "users.status",
          )
          .where("sessions.id", sessionId)
          .andWhere("sessions.expires_at", ">", now)
          .first();
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async deleteSession(sessionId) {
      try {
        await getDatabase()("sessions").where({ id: sessionId }).delete();
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },
  };
}

export function createAuthService({
  repository = createAuthRepository(),
} = {}) {
  return {
    async register({ email, password, firstName, lastName }) {
      const passwordHash = await hashPassword(password);
      const user = await repository.createCustomer({
        email,
        passwordHash,
        firstName,
        lastName,
      });
      return publicUser(user);
    },

    async registerPartner({ email, password, firstName, lastName, role, company }) {
      const passwordHash = await hashPassword(password);
      const user = await repository.createPartner({ email, passwordHash, firstName, lastName, role, company });
      return publicUser(user, role);
    },

    async listPartners(status) {
      return (await repository.listPartners(status)).map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        status: row.status,
        role: row.role,
        createdAt: row.created_at,
        listings: Number(row.listings ?? 0),
      }));
    },

    async setUserStatus(userId, status) {
      await repository.setUserStatus(userId, status);
    },

    async createAdmin({ email, password, firstName, lastName }) {
      const passwordHash = await hashPassword(password);
      const user = await repository.createAdmin({ email, passwordHash, firstName, lastName });
      return publicUser(user, "admin");
    },

    async listAdmins() {
      return (await repository.listAdmins()).map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        status: row.status,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
      }));
    },

    async setAdminStatus(userId, status) {
      await repository.setUserStatus(userId, status);
    },

    async listUsers(filters) {
      return (await repository.listUsers(filters)).map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone_e164,
        status: row.status,
        role: row.role,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
      }));
    },

    async setAccountStatus(userId, status) {
      const role = await repository.getUserRole(userId);
      if (!role) throw new AuthError(404, "NOT_FOUND", "That account was not found.");
      if (role === "admin") throw new AuthError(400, "VALIDATION_ERROR", "Manage administrators from the Administrators section.");
      await repository.setUserStatus(userId, status);
    },

    /** Returns { token, user } for an eligible account, or null. Callers must answer identically either way. */
    async requestPasswordReset(email) {
      const user = await repository.findUserByEmail(email);
      if (!user || !["active", "pending"].includes(user.status)) return null;
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + RESET_TTL_MS);
      await repository.createResetToken(user.id, hashSessionToken(token), expiresAt);
      return { token, expiresAt, user: { email: user.email, firstName: user.first_name } };
    },

    async resetPassword(token, password) {
      const invalid = new AuthError(400, "INVALID_RESET", "This reset link is invalid or has expired. Please request a new one.");
      const reset = await repository.findResetByHash(hashSessionToken(token));
      if (!reset || reset.used_at || new Date(reset.expires_at) < new Date() || !["active", "pending"].includes(reset.status)) {
        throw invalid;
      }
      const passwordHash = await hashPassword(password);
      await repository.completeReset({ resetId: reset.id, userId: reset.user_id, passwordHash });
    },

    async login({ email, password }) {
      const user = await repository.findUserByEmail(email);
      const passwordValid = await verifyPassword(
        password,
        user?.password_hash ?? (await DUMMY_PASSWORD_HASH),
      );
      if (
        !user ||
        !passwordValid ||
        !["active", "pending"].includes(user.status) ||
        !(await resolveRole(repository, user.id))
      ) {
        throw new AuthError(
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect.",
        );
      }

      const accountRole = await resolveRole(repository, user.id);
      if (["agent", "builder"].includes(accountRole) && user.status !== "active") {
        throw new AuthError(
          403,
          "ACCOUNT_PENDING",
          user.status === "pending"
            ? "Your partner account is awaiting approval from our team. We will email you once it is active."
            : "This account is not active. Please contact our team.",
        );
      }

      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
      await repository.createSession(
        user.id,
        hashSessionToken(token),
        expiresAt,
      );
      const role = await resolveRole(repository, user.id);
      return { token, expiresAt, user: publicUser(user, role) };
    },

    async getCurrentUser(token) {
      if (!token) {
        throw invalidSession();
      }
      const session = await repository.findSession(
        hashSessionToken(token),
        new Date(),
      );
      const role = session
        ? await resolveRole(repository, session.user_id)
        : null;
      if (
        !session ||
        !["active", "pending"].includes(session.status) ||
        !role
      ) {
        throw invalidSession();
      }
      return publicUser(session, role);
    },

    async logout(token) {
      if (token) {
        await repository.deleteSession(hashSessionToken(token));
      }
    },
  };
}

function publicUser(user, role = "customer") {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role,
  };
}

// Highest-privilege role first. Accounts holding none of these cannot sign in.
const ROLE_PRIORITY = ["admin", "builder", "agent", "customer"];

async function resolveRole(repository, userId) {
  const roles = await repository.getRoleNames(userId);
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}

function invalidSession() {
  return new AuthError(
    401,
    "INVALID_SESSION",
    "Your session is invalid or has expired. Please sign in again.",
  );
}

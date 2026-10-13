// Creates (or resets) the first admin, a sample agent and a sample customer.
//   npm run db:accounts
// Passwords are generated randomly and written to
// database/.local-credentials.txt (git-ignored) - never printed or committed.
// Set ADMIN_EMAIL / CUSTOMER_EMAIL in the environment to use other addresses.
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createDatabase, isDatabaseConfigured } from "../src/index.js";

const scrypt = promisify(scryptCallback);
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

// Must match backend/src/services/auth.js hashPassword().
async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

const accounts = [
  {
    role: "admin",
    email: (process.env.ADMIN_EMAIL || "admin@estateandco.in").toLowerCase(),
    firstName: "Site",
    lastName: "Admin",
  },
  {
    role: "agent",
    email: (process.env.AGENT_EMAIL || "agent@estateandco.in").toLowerCase(),
    firstName: "Sample",
    lastName: "Agent",
  },
  {
    role: "customer",
    email: (process.env.CUSTOMER_EMAIL || "customer@estateandco.in").toLowerCase(),
    firstName: "Sample",
    lastName: "Customer",
  },
];

if (!isDatabaseConfigured()) {
  console.error("Set DB_HOST, DB_USER, DB_PASSWORD and DB_NAME in database/.env first.");
  process.exit(1);
}

const db = createDatabase();
const lines = ["Estate & Co. local sign-in credentials", ""];

try {
  for (const account of accounts) {
    const password = randomBytes(12).toString("base64url");
    const passwordHash = await hashPassword(password);
    const role = await db("roles").select("id").where({ name: account.role }).first();
    if (!role) throw new Error(`Role "${account.role}" missing - run db:seed first.`);

    await db.transaction(async (trx) => {
      const existing = await trx("users").select("id").where({ email: account.email }).first();
      let userId = existing?.id;
      if (userId) {
        await trx("users").where({ id: userId }).update({
          password_hash: passwordHash,
          status: "active",
          email_verified_at: trx.fn.now(),
        });
      } else {
        [userId] = await trx("users").insert({
          email: account.email,
          password_hash: passwordHash,
          first_name: account.firstName,
          last_name: account.lastName,
          status: "active",
          email_verified_at: trx.fn.now(),
        });
      }
      await trx("user_roles").where({ user_id: userId }).delete();
      await trx("user_roles").insert({ user_id: userId, role_id: role.id });
    });
    lines.push(`${account.role.toUpperCase()}`, `  email:    ${account.email}`, `  password: ${password}`, "");
  }

  const target = fileURLToPath(new URL("../.local-credentials.txt", import.meta.url));
  await writeFile(target, lines.join("\n"), "utf8");
  console.log(`Accounts ready. Credentials saved to ${target}`);
} finally {
  await db.destroy();
}

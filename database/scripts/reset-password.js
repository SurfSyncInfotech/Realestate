// Sets a new random password for one account and signs it out everywhere.
//   npm run db:reset-password -- someone@example.com
// Use this when email is not set up, or an admin is locked out. The new password
// is appended to database/.local-credentials.txt (git-ignored) and never printed.
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createDatabase, isDatabaseConfigured } from "../src/index.js";

const scrypt = promisify(scryptCallback);
const OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

// Must match backend/src/services/auth.js hashPassword().
async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, OPTIONS);
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run db:reset-password -- user@example.com");
  process.exit(1);
}
if (!isDatabaseConfigured()) {
  console.error("Set up database/.env first (npm run db:setup).");
  process.exit(1);
}

const db = createDatabase();
try {
  const user = await db("users").select("id", "status").where({ email }).first();
  if (!user) {
    console.error(`No account found for ${email}.`);
    process.exit(1);
  }
  const password = randomBytes(12).toString("base64url");
  await db.transaction(async (trx) => {
    await trx("users").where({ id: user.id }).update({ password_hash: await hashPassword(password), updated_at: new Date() });
    await trx("sessions").where({ user_id: user.id }).delete();
    await trx("password_resets").where({ user_id: user.id }).whereNull("used_at").update({ used_at: new Date() });
  });
  const target = fileURLToPath(new URL("../.local-credentials.txt", import.meta.url));
  await appendFile(target, `\nPASSWORD RESET ${new Date().toISOString()}\n  email:    ${email}\n  password: ${password}\n`, "utf8");
  console.log(`Password reset for ${email}. The new password was saved to ${target}`);
  console.log("Share it securely and ask them to change it after signing in.");
} finally {
  await db.destroy();
}

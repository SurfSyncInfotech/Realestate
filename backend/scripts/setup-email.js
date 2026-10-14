// One-command email setup:   npm run mail:setup
// Asks for your SMTP login (the password is typed hidden), checks the connection,
// sends a test email to the address you choose, and only then saves the settings
// to backend/.env (git-ignored). Gmail: use an "App password", not your normal one
// (Google Account > Security > 2-Step Verification > App passwords).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));

function ask(question, { hidden = false, fallback = "" } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const write = rl._writeToOutput;
      rl._writeToOutput = (text) => {
        if (text.startsWith(question)) write.call(rl, text);
      };
    }
    rl.question(fallback ? `${question} [${fallback}] ` : question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim() || fallback);
    });
  });
}

if (!process.stdin.isTTY) {
  console.error("Run this in a terminal:  npm run mail:setup");
  process.exit(1);
}

const existing = existsSync(envPath) ? dotenv.parse(readFileSync(envPath)) : {};
console.log("Email setup for Estate & Co. (Gmail: smtp.gmail.com, port 587, use an App password)\n");

const host = await ask("SMTP host", { fallback: existing.SMTP_HOST || "smtp.gmail.com" });
const port = Number(await ask("SMTP port", { fallback: existing.SMTP_PORT || "587" }));
const user = await ask("SMTP username (your email address): ", { fallback: existing.SMTP_USER || "" });
const pass = (await ask("SMTP password / app password (hidden): ", { hidden: true })).replace(/\s+/g, "");
const from = await ask("Send emails as", { fallback: existing.MAIL_FROM || `Estate & Co. <${user}>` });
const testTo = await ask("Send a test email to", { fallback: user });

if (!host || !user || !pass) {
  console.error("Host, username and password are all required.");
  process.exit(1);
}

const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
try {
  await transport.verify();
  await transport.sendMail({
    from,
    to: testTo,
    subject: "Estate & Co. email is working",
    text: "This is a test from your Estate & Co. server. Password-reset links and replies to customers will now be emailed.",
  });
} catch (error) {
  console.error(`\nCould not send: ${error.message}`);
  console.error("Nothing was saved. Check the username, the app password and the port, then try again.");
  process.exit(1);
}

const merged = {
  ...existing,
  SMTP_HOST: host,
  SMTP_PORT: String(port),
  SMTP_SECURE: port === 465 ? "true" : "false",
  SMTP_USER: user,
  SMTP_PASSWORD: pass,
  MAIL_FROM: `"${from.replace(/"/g, "")}"`,
};
writeFileSync(envPath, Object.entries(merged).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", "utf8");
console.log(`\nTest email sent to ${testTo}. Settings saved to backend/.env.`);
console.log("Restart the backend (npm run dev) so it picks them up.");

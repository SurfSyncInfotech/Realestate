import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  // General API budget per IP. Dashboards poll notifications, so keep this generous.
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(3000),
  // Stricter budget for sign-in, registration and public message forms.
  RATE_LIMIT_SENSITIVE_MAX: z.coerce.number().int().positive().default(60),
  // Optional outgoing email (admin replies are emailed to the customer).
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:5173"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(
    `Invalid backend environment: ${z.prettifyError(result.error)}`,
  );
}

export const env = result.data;

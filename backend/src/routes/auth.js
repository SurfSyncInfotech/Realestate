import { Router } from "express";
import { z } from "zod";

const COOKIE_NAME = "realestate.sid";
// Scoped to the API so admin/contact routes can read the session too.
const COOKIE_PATH = "/api/v1";
const registrationSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(""),
});
const partnerSchema = registrationSchema.extend({
  role: z.enum(["agent", "builder"]).default("agent"),
  company: z.string().trim().max(160).optional().default(""),
});
const PORTALS = {
  customer: ["customer"],
  agent: ["agent", "builder"],
  admin: ["admin"],
};
const PORTAL_NAME = { customer: "customer", agent: "agent and builder", admin: "administrator" };
const loginSchema = z.object({
  portal: z.enum(["customer", "agent", "admin"]).optional(),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export function createAuthRouter({ authService, engagementService }) {
  const router = Router();

  router.post("/register", async (req, res, next) => {
    const parsed = registrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return validationError(res);
    }

    try {
      const user = await authService.register(parsed.data);
      return res.status(201).json({
        data: { user },
        message: "Account created. Sign in to start a session.",
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/register-partner", async (req, res, next) => {
    const parsed = partnerSchema.safeParse(req.body);
    if (!parsed.success) {
      return validationError(res);
    }
    try {
      const user = await authService.registerPartner(parsed.data);
      await engagementService?.notifyAdmins({
        type: "partner",
        title: "New partner application",
        body: `${parsed.data.firstName} ${parsed.data.lastName} applied as ${parsed.data.role}`.trim(),
        link: "/dashboard/admin?tab=partners",
      });
      return res.status(201).json({
        data: { user },
        message:
          "Thank you. Your partner account was created and is awaiting approval. We will email you once it is active.",
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return validationError(res);
    }

    try {
      const { portal, ...credentials } = parsed.data;
      const result = await authService.login(credentials);
      if (portal && !PORTALS[portal].includes(result.user.role)) {
        await authService.logout(result.token);
        return res.status(403).json({
          error: {
            code: "WRONG_PORTAL",
            message: `This sign-in is for ${PORTAL_NAME[portal]} accounts. Please use the sign-in page for your account type.`,
          },
        });
      }
      res.cookie(COOKIE_NAME, result.token, cookieOptions(result.expiresAt));
      return res.status(200).json({ data: { user: result.user } });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/logout", async (req, res, next) => {
    try {
      await authService.logout(readSessionToken(req));
      res.clearCookie(COOKIE_NAME, cookieOptions(new Date(0), true));
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  router.get("/me", async (req, res, next) => {
    try {
      const user = await authService.getCurrentUser(readSessionToken(req));
      return res.status(200).json({ data: { user } });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

function validationError(res) {
  return res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message:
        "Provide a valid email, password, first name, and optional last name.",
    },
  });
}

export function readSessionToken(req) {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== "string") {
    return null;
  }
  const pair = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));
  const token = pair?.slice(COOKIE_NAME.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

function cookieOptions(expires, clear = false) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: COOKIE_PATH,
    expires,
    maxAge: clear ? 0 : Math.max(0, expires.getTime() - Date.now()),
  };
}

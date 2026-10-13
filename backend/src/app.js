import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import logger from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createAuthService } from "./services/auth.js";
import { createAuthRouter } from "./routes/auth.js";
import { createContactService } from "./services/contact.js";
import { createContactRouter } from "./routes/contact.js";
import { createRequireRole } from "./middleware/requireRole.js";
import { createEngagementService } from "./services/engagement.js";
import { createEngagementRouter } from "./routes/engagement.js";
import { UPLOAD_DIR, createUploadsRouter } from "./routes/uploads.js";
import { createPropertyService } from "./services/propertyCatalog.js";
import { createWorkspaceRouter } from "./routes/workspace.js";
import { createCatalogRouter } from "./routes/catalog.js";
import healthRouter from "./routes/health.js";

// The built website (npm run build). In production the API serves it too, so one
// server and one domain run everything.
const FRONTEND_DIST = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
const isProduction = env.NODE_ENV === "production";

export function createApp({
  authService = createAuthService(),
  contactService = createContactService(),
  propertyService = createPropertyService(),
  engagementService = createEngagementService(),
} = {}) {
  const app = express();

  app.disable("x-powered-by");
  // Behind a reverse proxy / load balancer (nginx, Render, Railway...) use the real client IP.
  if (isProduction) app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          frameSrc: ["https://maps.google.com", "https://www.google.com"],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== "test",
      serializers: {
        req(req) {
          return {
            method: req.method,
            path: req.url?.split("?")[0],
          };
        },
      },
    }),
  );
  // Photos are sent as multipart files to /api/v1/partner/uploads, so JSON stays small.
  app.use(express.json({ limit: "1mb" }));
  app.use(
    "/api/v1",
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  // Tighter limit on endpoints that can be abused (guessing passwords, spam).
  const sensitive = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_SENSITIVE_MAX,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message: "Too many attempts. Please wait a few minutes and try again." } },
  });
  app.use(["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/register-partner", "/api/v1/contact", "/api/v1/leads"], (req, res, next) =>
    req.method === "POST" ? sensitive(req, res, next) : next(),
  );

  // Photos uploaded by agents, served as /uploads/properties/<file>.
  app.use(
    "/uploads/properties",
    express.static(UPLOAD_DIR, { maxAge: "7d", index: false, dotfiles: "deny", fallthrough: false }),
  );

  app.use("/api/v1", healthRouter);
  app.use("/api/v1/auth", createAuthRouter({ authService, engagementService }));
  app.use(
    "/api/v1",
    createContactRouter({
      contactService,
      authService,
      engagementService,
      requireRole: createRequireRole(authService),
    }),
  );
  const requireRole = createRequireRole(authService);
  app.use("/api/v1", createUploadsRouter({ requireRole }));
  app.use("/api/v1", createEngagementRouter({ engagementService, propertyService, requireRole }));
  app.use(
    "/api/v1",
    createWorkspaceRouter({
      propertyService,
      contactService,
      authService,
      engagementService,
      requireRole: createRequireRole(authService),
    }),
  );
  app.use("/api/v1", createCatalogRouter({ contactService, propertyService, engagementService, authService }));
  // Serve the website for every non-API path so deep links (/dashboard/admin) work on refresh.
  if (isProduction && existsSync(path.join(FRONTEND_DIST, "index.html"))) {
    app.use(express.static(FRONTEND_DIST, { index: false, maxAge: "1d", setHeaders: (res, file) => {
      if (file.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
    } }));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) return next();
      return res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;

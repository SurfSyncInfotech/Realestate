import { Router } from "express";
import { z } from "zod";

const propertySchema = z.object({
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(20).max(4000),
  listingType: z.enum(["sale", "rent", "lease"]),
  propertyType: z.enum(["apartment", "villa", "house", "plot", "office", "retail", "warehouse", "other"]),
  typeLabel: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(180),
  price: z.coerce.number().positive().max(100000000000),
  areaSqFt: z.coerce.number().positive().max(10000000),
  beds: z.coerce.number().int().min(0).max(30).optional().default(0),
  baths: z.coerce.number().int().min(0).max(30).optional().default(0),
  furnishing: z.enum(["unfurnished", "semi_furnished", "furnished"]).optional(),
  possession: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(80).optional(),
  luxury: z.coerce.boolean().optional(),
  newProject: z.coerce.boolean().optional(),
  highlights: z.array(z.string().trim().min(1).max(120)).max(10).optional().default([]),
  amenities: z.array(z.string().trim().max(60)).max(20).optional().default([]),
  // Uploaded photos ("/uploads/properties/x.jpg"), https links, or a bundled photo id.
  images: z
    .array(
      z
        .string()
        .trim()
        .max(500)
        .refine(
          (u) => /^\/uploads\/properties\/[a-f0-9]+\.(jpg|png|webp)$/.test(u) || /^https:\/\//.test(u) || /^[0-9]+-[a-f0-9]+$/.test(u),
          "Upload a JPG, PNG or WebP photo.",
        ),
    )
    .max(8)
    .optional()
    .default([]),
});

const adminSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(128),
});

const reviewSchema = z.object({
  status: z.enum(["published", "rejected", "pending", "archived"]),
  verified: z.boolean().optional(),
});

function bad(res, message) {
  return res.status(400).json({ error: { code: "VALIDATION_ERROR", message } });
}

export function createWorkspaceRouter({ propertyService, authService, engagementService, requireRole }) {
  const router = Router();
  const anyUser = requireRole();
  const partner = requireRole("agent", "builder", "admin");
  const admin = requireRole("admin");

  /* ---------- customer: saved properties and enquiries ---------- */
  router.get("/me/saved", anyUser, async (req, res, next) => {
    try {
      return res.json({ data: await propertyService.listSaved(req.user.id) });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/me/saved/ids", anyUser, async (req, res, next) => {
    try {
      return res.json({ data: await propertyService.savedIds(req.user.id) });
    } catch (error) {
      return next(error);
    }
  });

  router.put("/me/saved/:id", anyUser, async (req, res, next) => {
    try {
      return res.json({ data: await propertyService.save(req.user.id, req.params.id) });
    } catch (error) {
      return next(error);
    }
  });

  router.delete("/me/saved/:id", anyUser, async (req, res, next) => {
    try {
      return res.json({ data: await propertyService.unsave(req.user.id, req.params.id) });
    } catch (error) {
      return next(error);
    }
  });

  /* ---------- agents, builders (and admins): own listings ---------- */
  router.get("/partner/properties", partner, async (req, res, next) => {
    try {
      return res.json({ data: await propertyService.listOwned(req.user.id) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/partner/properties", partner, async (req, res, next) => {
    const parsed = propertySchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return bad(res, `${issue.path.join(".") || "Form"}: ${issue.message}`);
    }
    try {
      const created = await propertyService.create(req.user, parsed.data);
      if (created.status === "pending") {
        await engagementService?.notifyAdmins({
          type: "listing",
          title: "New listing to review",
          body: `${parsed.data.title} (${parsed.data.city}) submitted by ${req.user.firstName}`,
          link: "/dashboard/admin?tab=review",
        });
      }
      return res.status(201).json({
        data: created,
        message:
          created.status === "published"
            ? "Property published."
            : "Property submitted. It will go live once our team has verified it.",
      });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/partner/properties/:id", partner, async (req, res, next) => {
    const parsed = propertySchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return bad(res, `${issue.path.join(".") || "Form"}: ${issue.message}`);
    }
    try {
      const result = await propertyService.updateOwned(req.user, req.params.id, parsed.data);
      if (result.status === "pending") {
        await engagementService?.notifyAdmins({
          type: "listing",
          title: "Edited listing to re-verify",
          body: `${parsed.data.title} (${parsed.data.city}) edited by ${req.user.firstName}`,
          link: "/dashboard/admin?tab=review",
        });
      }
      return res.json({
        data: result,
        message: result.status === "pending" ? "Changes saved. The listing will be re-verified before it shows again." : "Changes saved.",
      });
    } catch (error) {
      return next(error);
    }
  });

  router.delete("/partner/properties/:id", partner, async (req, res, next) => {
    try {
      return res.json({ data: await propertyService.archiveOwned(req.user, req.params.id), message: "Listing removed from the website." });
    } catch (error) {
      return next(error);
    }
  });

  /* ---------- admin: review queue ---------- */
  router.get("/admin/properties", admin, async (req, res, next) => {
    try {
      return res.json({ data: await propertyService.listByStatus(req.query.status) });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/admin/properties/:id", admin, async (req, res, next) => {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, "Provide a valid status.");
    try {
      const result = await propertyService.setStatus(req.params.id, parsed.data.status, {
        verified: parsed.data.verified,
      });
      if (result.ownerId) {
        const live = parsed.data.status === "published";
        await engagementService?.notify(result.ownerId, {
          type: "listing",
          title: live ? "Your listing is live" : `Your listing was ${parsed.data.status}`,
          body: result.title,
          link: "/dashboard/agent?tab=listings",
        });
      }
      return res.json({ data: { id: result.id, status: result.status } });
    } catch (error) {
      return next(error);
    }
  });

  /* ---------- admin: approve agent and builder accounts ---------- */
  router.get("/admin/partners", admin, async (req, res, next) => {
    try {
      return res.json({ data: await authService.listPartners(req.query.status) });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/admin/partners/:id", admin, async (req, res, next) => {
    const parsed = z.object({ status: z.enum(["active", "suspended", "deleted"]) }).safeParse(req.body);
    const id = Number(req.params.id);
    if (!parsed.success || !Number.isInteger(id)) return bad(res, "Provide a valid status.");
    try {
      await authService.setUserStatus(id, parsed.data.status);
      return res.json({ data: { id, status: parsed.data.status } });
    } catch (error) {
      return next(error);
    }
  });

  /* ---------- admin: all registered users ---------- */
  router.get("/admin/users", admin, async (req, res, next) => {
    try {
      const role = z.enum(["all", "customer", "agent", "builder", "admin"]).catch("all").parse(req.query.role);
      const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
      return res.json({ data: await authService.listUsers({ role, q }) });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/admin/users/:id", admin, async (req, res, next) => {
    const parsed = z.object({ status: z.enum(["active", "suspended"]) }).safeParse(req.body);
    const id = Number(req.params.id);
    if (!parsed.success || !Number.isInteger(id)) return bad(res, "Provide a valid status.");
    if (id === req.user.id) return bad(res, "You cannot change your own account.");
    try {
      await authService.setAccountStatus(id, parsed.data.status);
      return res.json({ data: { id, status: parsed.data.status } });
    } catch (error) {
      return next(error);
    }
  });

  /* ---------- admin: manage administrators ---------- */
  router.get("/admin/admins", admin, async (req, res, next) => {
    try {
      return res.json({ data: await authService.listAdmins() });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/admin/admins", admin, async (req, res, next) => {
    const parsed = adminSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, "Enter a first name, a valid email and a password of at least 8 characters.");
    try {
      const created = await authService.createAdmin(parsed.data);
      await engagementService?.notifyAdmins({
        type: "partner",
        title: "A new administrator was added",
        body: `${created.firstName} ${created.lastName ?? ""} (${created.email}) by ${req.user.firstName}`.trim(),
        link: "/dashboard/admin?tab=admins",
      });
      return res.status(201).json({ data: created, message: "Administrator added. They can sign in at /admin." });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/admin/admins/:id", admin, async (req, res, next) => {
    const parsed = z.object({ status: z.enum(["active", "suspended"]) }).safeParse(req.body);
    const id = Number(req.params.id);
    if (!parsed.success || !Number.isInteger(id)) return bad(res, "Provide a valid status.");
    if (id === req.user.id) return bad(res, "You cannot suspend your own account.");
    try {
      await authService.setAdminStatus(id, parsed.data.status);
      return res.json({ data: { id, status: parsed.data.status } });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

import { Router } from "express";
import { z } from "zod";
import { readSessionToken } from "./auth.js";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional().default(""),
  topic: z
    .enum(["general", "buying", "renting", "selling", "partnership", "support"])
    .default("general"),
  message: z.string().trim().min(5).max(2000),
});

const statusSchema = z.object({ status: z.enum(["new", "read", "replied", "archived"]) });

function invalid(res, message) {
  return res.status(400).json({ error: { code: "VALIDATION_ERROR", message } });
}

export function createContactRouter({ contactService, authService, engagementService, requireRole }) {
  const router = Router();

  // Public: anyone can send a message; signed-in users are linked to it.
  router.post("/contact", async (req, res, next) => {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalid(res, "Please provide your name, a valid email and a message of at least 5 characters.");
    }
    try {
      let userId = null;
      try {
        userId = (await authService.getCurrentUser(readSessionToken(req))).id;
      } catch {
        userId = null;
      }
      const { id } = await contactService.create({ ...parsed.data, userId });
      await engagementService?.registerLead({ id, name: parsed.data.name, message: parsed.data.message });
      return res.status(201).json({
        data: { id },
        message: "Thank you. Your message has reached our team and we will reply by email.",
      });
    } catch (error) {
      return next(error);
    }
  });

  // Admin only.
  router.get("/admin/overview", requireRole("admin"), async (req, res, next) => {
    try {
      const [stats, messages] = await Promise.all([
        contactService.overview(),
        contactService.list({ limit: 25 }),
      ]);
      return res.json({ data: { stats, messages } });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/admin/messages/:id", requireRole("admin"), async (req, res, next) => {
    const parsed = statusSchema.safeParse(req.body);
    const id = Number(req.params.id);
    if (!parsed.success || !Number.isInteger(id)) return invalid(res, "Provide a valid status.");
    try {
      await contactService.setStatus(id, parsed.data.status);
      return res.json({ data: { id, status: parsed.data.status } });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

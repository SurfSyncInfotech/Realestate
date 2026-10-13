import { Router } from "express";
import { z } from "zod";
import { STAGES } from "../services/engagement.js";

const replySchema = z.object({ body: z.string().trim().min(2).max(3000) });
const visitSchema = z.object({
  scheduledAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Choose a valid date and time.")
    .refine((value) => Date.parse(value) > Date.now() - 60_000, "Choose a date and time in the future."),
  agentUserId: z.coerce.number().int().positive().optional().nullable(),
  propertySlug: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});
const visitStatusSchema = z.object({ status: z.enum(["scheduled", "completed", "cancelled"]) });
const readSchema = z.object({ id: z.coerce.number().int().positive().optional() });
const stageSchema = z.object({
  stage: z.enum(STAGES),
  followUpAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Choose a valid follow-up date.").optional().nullable(),
  note: z.string().trim().max(300).optional(),
});
const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
});

const bad = (res, message) => res.status(400).json({ error: { code: "VALIDATION_ERROR", message } });
const toId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export function createEngagementRouter({ engagementService, propertyService, requireRole }) {
  const router = Router();
  const anyUser = requireRole();
  const staff = requireRole("admin", "agent", "builder"); // admins and listing partners
  const admin = requireRole("admin");
  const wrap = (handler) => async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };

  /* ---------- everyone: notifications ---------- */
  router.get("/me/notifications", anyUser, wrap(async (req, res) => {
    res.json({ data: await engagementService.listNotifications(req.user.id) });
  }));

  router.post("/me/notifications/read", anyUser, wrap(async (req, res) => {
    const parsed = readSchema.safeParse(req.body ?? {});
    if (!parsed.success) return bad(res, "Invalid notification.");
    await engagementService.markRead(req.user.id, parsed.data.id);
    res.json({ data: { ok: true } });
  }));

  /* ---------- customer ---------- */
  router.get("/me/enquiries", anyUser, wrap(async (req, res) => {
    res.json({ data: await engagementService.myEnquiries({ userId: req.user.id, email: req.user.email }) });
  }));

  router.get("/me/visits", anyUser, wrap(async (req, res) => {
    res.json({ data: await engagementService.visitsForCustomer({ userId: req.user.id, email: req.user.email }) });
  }));

  router.patch("/me/visits/:id", anyUser, wrap(async (req, res) => {
    const id = toId(req.params.id);
    const parsed = z.object({ status: z.literal("cancelled") }).safeParse(req.body);
    if (!id || !parsed.success) return bad(res, "You can only cancel a visit.");
    res.json({ data: await engagementService.setVisitStatus(id, "cancelled", { actor: "customer", userId: req.user.id }) });
  }));

  router.get("/me/profile", anyUser, wrap(async (req, res) => {
    res.json({ data: { ...req.user, ...(await engagementService.getProfile(req.user.id)) } });
  }));

  router.patch("/me/profile", anyUser, wrap(async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, "Enter your first name and a valid phone number.");
    res.json({ data: await engagementService.updateProfile(req.user.id, parsed.data), message: "Profile saved." });
  }));

  router.get("/me/recent", anyUser, wrap(async (req, res) => {
    res.json({ data: await propertyService.listRecent(req.user.id) });
  }));

  router.post("/me/recent/:slug", anyUser, wrap(async (req, res) => {
    await propertyService.recordView(req.user.id, req.params.slug);
    res.json({ data: { ok: true } });
  }));

  /* ---------- leads: admin sees all, agents see their own ---------- */
  router.get("/leads", staff, wrap(async (req, res) => {
    res.json({ data: await engagementService.listLeads(req.user, { stage: req.query.stage }) });
  }));

  router.get("/leads/:id/thread", staff, wrap(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return bad(res, "Invalid enquiry.");
    res.json({ data: await engagementService.thread(req.user, id) });
  }));

  router.post("/leads/:id/replies", staff, wrap(async (req, res) => {
    const id = toId(req.params.id);
    const parsed = replySchema.safeParse(req.body);
    if (!id || !parsed.success) return bad(res, "Write a reply of at least 2 characters.");
    const result = await engagementService.reply(req.user, id, parsed.data.body);
    res.status(201).json({
      data: result,
      message: result.emailed
        ? "Reply sent. The customer was notified in their dashboard and emailed."
        : "Reply sent. The customer was notified in their dashboard.",
    });
  }));

  router.post("/leads/:id/visits", staff, wrap(async (req, res) => {
    const id = toId(req.params.id);
    const parsed = visitSchema.safeParse(req.body);
    if (!id || !parsed.success) return bad(res, parsed.error?.issues[0]?.message ?? "Invalid visit.");
    const result = await engagementService.scheduleVisit(req.user, id, parsed.data);
    res.status(201).json({ data: result, message: "Visit scheduled. The customer and agent have been notified." });
  }));

  router.patch("/leads/:id/stage", staff, wrap(async (req, res) => {
    const id = toId(req.params.id);
    const parsed = stageSchema.safeParse(req.body);
    if (!id || !parsed.success) return bad(res, parsed.error?.issues[0]?.message ?? "Choose a valid stage.");
    res.json({ data: await engagementService.setStage(req.user, id, parsed.data) });
  }));

  router.patch("/leads/:id/assign", admin, wrap(async (req, res) => {
    const id = toId(req.params.id);
    const parsed = z.object({ agentUserId: z.coerce.number().int().positive().nullable() }).safeParse(req.body);
    if (!id || !parsed.success) return bad(res, "Choose an agent.");
    res.json({ data: await engagementService.assignAgent(req.user, id, parsed.data.agentUserId) });
  }));

  router.get("/follow-ups", staff, wrap(async (req, res) => {
    res.json({ data: await engagementService.followUps(req.user) });
  }));

  router.get("/analytics", staff, wrap(async (req, res) => {
    res.json({ data: await engagementService.analytics(req.user) });
  }));

  /* ---------- site visits ---------- */
  router.get("/visits", staff, wrap(async (req, res) => {
    res.json({ data: await engagementService.listVisits(req.user, { status: req.query.status }) });
  }));

  router.patch("/visits/:id", staff, wrap(async (req, res) => {
    const id = toId(req.params.id);
    const parsed = visitStatusSchema.safeParse(req.body);
    if (!id || !parsed.success) return bad(res, "Provide a valid status.");
    const actor = req.user.role === "admin" ? "admin" : "agent";
    res.json({ data: await engagementService.setVisitStatus(id, parsed.data.status, { actor, userId: req.user.id }) });
  }));

  return router;
}

import { Router } from "express";
import { z } from "zod";
import { readSessionToken } from "./auth.js";

const propertySearchSchema = z.object({
  mode: z
    .enum(["buy", "rent", "commercial", "luxury", "new-projects", "all"])
    .default("all")
    .transform((value) => (value === "all" ? "all" : value)),
  city: z.preprocess(
    (value) =>
      value === "" || value === undefined ? undefined : String(value),
    z.string().trim().min(1).optional(),
  ),
  query: z.preprocess(
    (value) =>
      value === "" || value === undefined ? undefined : String(value),
    z.string().trim().min(1).optional(),
  ),
  type: z.preprocess(
    (value) =>
      value === "" || value === "all" || value === undefined
        ? undefined
        : String(value),
    z.string().trim().min(1).optional(),
  ),
  maxPrice: z.preprocess((value) => {
    if (value === undefined || value === "" || value === "any") {
      return undefined;
    }
    return Number(value);
  }, z.number().int().positive().optional()),
  sort: z.enum(["featured", "price-low", "price-high", "newest"]).default("featured"),
});

const leadSchema = z.object({
  propertyId: z.string().trim().min(1).max(120).optional(),
  propertyTitle: z.string().trim().min(1).max(160).optional(),
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  phone: z.string().trim().min(7).max(30),
  mode: z.enum(["buy", "rent", "commercial"]).optional(),
  message: z.string().trim().max(800).optional().default(""),
});

function parseWithValidation(schema, data) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = new Error(
        error.issues[0]?.message ?? "Invalid request payload.",
      );
      validationError.status = 400;
      throw validationError;
    }

    throw error;
  }
}

export function createCatalogRouter({
  contactService,
  propertyService,
  engagementService,
  authService,
}) {
  const router = Router();

  router.get("/properties", async (req, res, next) => {
    try {
      const filters = parseWithValidation(propertySearchSchema, req.query);
      const properties = await propertyService.list(filters);

      res.status(200).json({
        data: properties,
        meta: {
          total: properties.length,
          source: "catalogue",
          filters: {
            mode: filters.mode === "all" ? "all" : filters.mode,
            city: filters.city ?? null,
            query: filters.query ?? null,
            type: filters.type ?? null,
            maxPrice: filters.maxPrice ?? null,
            sort: filters.sort,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/properties/:id", async (req, res, next) => {
    try {
      const property = await propertyService.getById(req.params.id);

      if (!property) {
        return res.status(404).json({
          error: {
            code: "PROPERTY_NOT_FOUND",
            message: "This property is no longer available.",
          },
        });
      }

      return res.status(200).json({
        data: property,
        meta: {
          source: "catalogue",
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/leads", async (req, res, next) => {
    try {
      const payload = parseWithValidation(leadSchema, req.body);
      const property = payload.propertyId
        ? await propertyService.getById(payload.propertyId)
        : null;

      if (payload.propertyId && !property) {
        const error = new Error("That property is no longer available.");
        error.status = 404;
        throw error;
      }

      const title =
        property?.title ?? payload.propertyTitle ?? "General enquiry";
      const reference = payload.propertyId ? ` (${payload.propertyId})` : "";
      let signedInUserId = null;
      try {
        signedInUserId =
          (await authService?.getCurrentUser(readSessionToken(req)))?.id ??
          null;
      } catch {
        signedInUserId = null;
      }
      const { id } = await contactService.create({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        topic: payload.mode === "rent" ? "renting" : "buying",
        userId: signedInUserId,
        message: `[Property enquiry: ${title}${reference}] ${payload.message || "Please contact me about this property."}`,
      });
      await engagementService?.registerLead({
        id,
        name: payload.name,
        message: `[Property enquiry: ${title}${reference}] ${payload.message || "Please contact me about this property."}`,
      });

      return res.status(201).json({
        status: "received",
        message:
          "Thank you. Your enquiry has reached our team and an advisor will contact you shortly.",
        data: {
          id,
          propertyId: payload.propertyId ?? null,
          propertyTitle: title,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

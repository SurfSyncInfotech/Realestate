import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";

export const UPLOAD_DIR = fileURLToPath(new URL("../../uploads/properties", import.meta.url));
const MAX_BYTES = 6 * 1024 * 1024;
const MAX_FILES = 8;

// Identify the real image type from the file's first bytes (never trust the
// browser-supplied name or MIME type).
function sniffImage(buffer) {
  if (buffer.length > 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length > 12 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: MAX_FILES } });

// POST /api/v1/partner/uploads   multipart field "photos" (up to 8 images, 6 MB each)
// Returns the public paths, e.g. ["/uploads/properties/ab12….jpg"].
export function createUploadsRouter({ requireRole }) {
  const router = Router();

  router.post("/partner/uploads", requireRole("agent", "builder", "admin"), (req, res, next) => {
    upload.array("photos", MAX_FILES)(req, res, async (error) => {
      if (error) {
        const tooBig = error.code === "LIMIT_FILE_SIZE";
        return res.status(400).json({
          error: {
            code: "UPLOAD_REJECTED",
            message: tooBig ? "Each photo must be 6 MB or smaller." : "Upload up to 8 photos at a time.",
          },
        });
      }
      try {
        const files = req.files ?? [];
        if (files.length === 0) {
          return res.status(400).json({ error: { code: "UPLOAD_REJECTED", message: "Choose at least one photo." } });
        }
        await mkdir(UPLOAD_DIR, { recursive: true });
        const urls = [];
        for (const file of files) {
          const type = sniffImage(file.buffer);
          if (!type) {
            return res.status(400).json({
              error: { code: "UPLOAD_REJECTED", message: `"${file.originalname}" is not a JPG, PNG or WebP image.` },
            });
          }
          const name = `${randomBytes(12).toString("hex")}.${type}`;
          await writeFile(path.join(UPLOAD_DIR, name), file.buffer);
          urls.push(`/uploads/properties/${name}`);
        }
        return res.status(201).json({ data: { urls } });
      } catch (err) {
        return next(err);
      }
    });
  });

  return router;
}

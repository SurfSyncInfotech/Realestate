import { Router } from "express";
import { createDatabase, isDatabaseConfigured } from "@realestate/database";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "realestate-api",
    timestamp: new Date().toISOString(),
  });
});

router.get("/health/database", async (req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      status: "not_configured",
      service: "mysql",
      message: "Configure database/.env to enable MySQL connectivity.",
    });
  }

  const database = createDatabase();
  try {
    await database.raw("SELECT 1 AS connectivity_check");
    return res.status(200).json({
      status: "ok",
      service: "mysql",
      database: "connected",
    });
  } catch (error) {
    req.log.error(
      { errorCode: error.code || error.name },
      "MySQL health check failed",
    );
    return res.status(503).json({
      status: "unavailable",
      service: "mysql",
      message: "MySQL is configured but the connection check failed.",
    });
  } finally {
    await database.destroy();
  }
});

export default router;

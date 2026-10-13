import app from "./app.js";
import { env } from "./config/env.js";
import logger from "./config/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, environment: env.NODE_ENV },
    "API server listening",
  );
});

server.on("error", (err) => {
  logger.fatal({ err, port: env.PORT }, "API server failed to start");
  process.exitCode = 1;
});

function shutdown(signal) {
  logger.info({ signal }, "API server shutting down");
  server.close((err) => {
    if (err) {
      logger.error({ err }, "API server failed to close cleanly");
      process.exitCode = 1;
      return;
    }
    process.exitCode = 0;
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

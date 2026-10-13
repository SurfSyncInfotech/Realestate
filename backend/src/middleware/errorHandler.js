import logger from "../config/logger.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `No route found for ${req.method} ${req.path}.`,
    },
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const isAuthError =
    err.name === "AuthError" ||
    err.name === "CatalogueError" ||
    err.expose === true;
  const status =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    (err.status < 500 || (isAuthError && err.status < 600))
      ? err.status
      : 500;

  if (status === 500) {
    logger.error(
      { err, method: req.method, path: req.path },
      "Unhandled API error",
    );
  }

  res.status(status).json({
    error: {
      code:
        status === 500
          ? "INTERNAL_SERVER_ERROR"
          : isAuthError
            ? err.code
            : "REQUEST_ERROR",
      message:
        status === 500 ? "An unexpected server error occurred." : err.message,
    },
  });
}

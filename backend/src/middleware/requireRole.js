import { readSessionToken } from "../routes/auth.js";

// Express middleware factory: requires a signed-in user whose role is in
// `allowedRoles`. Attaches the user to `req.user`.
export function createRequireRole(authService) {
  return function requireRole(...allowedRoles) {
    return async (req, res, next) => {
      try {
        const user = await authService.getCurrentUser(readSessionToken(req));
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
          return res.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Your account does not have access to this area.",
            },
          });
        }
        req.user = user;
        return next();
      } catch (error) {
        return next(error);
      }
    };
  };
}

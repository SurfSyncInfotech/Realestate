import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { homeForRole } from "../services/auth.js";

// Route guard: sends visitors to sign-in, and signed-in users with the wrong
// role to their own workspace. The API enforces the same rules server-side.
export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="auth-loading" role="status">Checking your session…</p>;
  if (!user) {
    const entrance = roles?.includes("admin") ? "/admin" : roles?.includes("agent") ? "/agent" : "/sign-in";
    return <Navigate to={entrance} replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return children;
}

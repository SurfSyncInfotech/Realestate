import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authService from "../services/auth.js";

const AuthContext = createContext(null);

// Holds the signed-in user for the whole app. `loading` is true until the
// first /auth/me check finishes, so guards don't flash a redirect.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authService
      .fetchCurrentUser()
      .then((u) => active && setUser(u))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const u = await authService.signIn(credentials);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.signOut();
    } finally {
      setUser(null);
    }
  }, []);

  // Merge fields changed elsewhere (e.g. profile edits) into the signed-in user.
  const updateUser = useCallback((fields) => setUser((current) => (current ? { ...current, ...fields } : current)), []);

  const value = useMemo(() => ({ user, loading, login, logout, updateUser }), [user, loading, login, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

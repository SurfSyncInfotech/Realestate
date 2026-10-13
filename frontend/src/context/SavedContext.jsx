import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { fetchSavedIds, saveProperty, unsaveProperty } from "../services/auth.js";

const SavedContext = createContext({ isSaved: () => false, toggle: async () => {}, count: 0 });

// Tracks which properties the signed-in user has saved. Signed-out visitors
// who press a heart are sent to sign in first.
export function SavedProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    let active = true;
    if (!user) {
      setIds(new Set());
      return undefined;
    }
    fetchSavedIds()
      .then((list) => active && setIds(new Set(list)))
      .catch(() => active && setIds(new Set()));
    return () => {
      active = false;
    };
  }, [user]);

  const toggle = useCallback(
    async (id) => {
      if (!user) {
        navigate("/sign-in", { state: { from: window.location.pathname } });
        return;
      }
      const wasSaved = ids.has(id);
      const flip = (set, add) => {
        const next = new Set(set);
        if (add) next.add(id);
        else next.delete(id);
        return next;
      };
      setIds((current) => flip(current, !wasSaved));
      try {
        await (wasSaved ? unsaveProperty(id) : saveProperty(id));
      } catch {
        setIds((current) => flip(current, wasSaved));
      }
    },
    [user, ids, navigate],
  );

  const value = useMemo(() => ({ isSaved: (id) => ids.has(id), toggle, count: ids.size }), [ids, toggle]);
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export const useSaved = () => useContext(SavedContext);

import { useCallback, useEffect, useState } from "react";
import { fetchNotifications, markNotificationsRead } from "../services/auth.js";

const POLL_MS = 30000;

// Loads the signed-in user's notifications and refreshes them every 30 s and
// whenever the tab regains focus, so a new reply or visit shows up quickly.
export default function useNotifications() {
  const [state, setState] = useState({ items: [], unread: 0, loading: true });

  const reload = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setState({ items: data.items, unread: data.unread, loading: false });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, POLL_MS);
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    window.addEventListener("workspace:refresh", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("workspace:refresh", onFocus);
    };
  }, [reload]);

  const markRead = useCallback(
    async (id) => {
      setState((s) => ({
        ...s,
        items: s.items.map((n) => (!id || n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
        unread: id ? Math.max(0, s.unread - 1) : 0,
      }));
      try {
        await markNotificationsRead(id);
      } catch {
        reload();
      }
    },
    [reload],
  );

  return { ...state, reload, markRead };
}

import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, CalendarCheck, CheckCheck, ClipboardCheck, LogOut, MessageSquare, UserCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SiteLayout from "./SiteLayout.jsx";
import SmartImage from "./SmartImage.jsx";
import { img } from "../data/media.js";
import { useAuth } from "../context/AuthContext.jsx";
import useNotifications from "../hooks/useNotifications.js";

// The active workspace tab lives in the URL (?tab=inbox) so notifications and
// links can open the right panel directly, and refresh keeps your place.
export function useTab(initial = "overview") {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || initial;
  const setTab = (next) => setParams(next === initial ? {} : { tab: next });
  return [tab, setTab];
}

const ICONS = { reply: MessageSquare, visit: CalendarCheck, enquiry: MessageSquare, listing: ClipboardCheck, partner: UserCheck };

function timeAgo(value) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function NotificationsPanel({ notifications }) {
  const { items, unread, loading, markRead } = notifications;
  const navigate = useNavigate();
  // Remember which ones were unread when the list opened so they stay highlighted
  // for this visit, while the badge count clears.
  const [fresh, setFresh] = useState(() => new Set());
  const captured = useRef(false);

  useEffect(() => {
    if (loading || captured.current) return;
    captured.current = true;
    setFresh(new Set(items.filter((n) => !n.read_at).map((n) => n.id)));
  }, [loading, items]);

  // Opening the list counts as seeing it: clear the unread badge shortly after.
  useEffect(() => {
    if (loading || unread === 0) return undefined;
    const timer = setTimeout(() => markRead(), 1200);
    return () => clearTimeout(timer);
  }, [loading, unread, markRead]);
  return (
    <Panel
      title={<>Your <em>notifications</em></>}
      subtitle={fresh.size ? `${fresh.size} new` : unread ? `${unread} unread` : "You are all caught up."}
      actions={unread > 0 && (
        <button type="button" className="button button-outline" onClick={() => markRead()}>
          <CheckCheck size={15} /> Mark all as read
        </button>
      )}
    >
      {!loading && items.length === 0 ? (
        <Empty>Nothing here yet. Replies, visit bookings and other updates will appear in this list.</Empty>
      ) : (
        <ul className="ws-notifs">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <li key={n.id} className={fresh.has(n.id) || !n.read_at ? "is-unread" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    markRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <span className="ws-notif-icon"><Icon size={18} aria-hidden="true" /></span>
                  <span className="ws-notif-copy">
                    <strong>{n.title}</strong>
                    {n.body && <span>{n.body}</span>}
                    <small>{timeAgo(n.created_at)}</small>
                  </span>
                  {(fresh.has(n.id) || !n.read_at) && <i className="ws-dot" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// Shared frame for the customer, agent/builder and admin workspaces:
// a sidebar of tabs on the left, the active panel on the right. A
// "Notifications" tab is added automatically.
export default function WorkspaceShell({ roleLabel, tabs, active, onChange, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const notifications = useNotifications();

  async function handleLogout() {
    const entrance = user?.role === "admin" ? "/admin" : ["agent", "builder"].includes(user?.role) ? "/agent" : "/sign-in";
    await logout();
    navigate(entrance);
  }

  // A section's number badge shows only what is new since you last opened it.
  const seenKey = `ws-seen:${user?.id}`;
  const [seen, setSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(seenKey) || "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    setSeen((current) => {
      const next = { ...current };
      let changed = false;
      for (const { id, badge } of tabs) {
        if (badge === undefined) continue;
        // Opened section: everything counts as seen. Other sections: never remember more than exists.
        const target = id === active ? badge : Math.min(current[id] ?? 0, badge);
        if (next[id] !== target) {
          next[id] = target;
          changed = true;
        }
      }
      if (!changed) return current;
      try {
        localStorage.setItem(seenKey, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, [tabs, active, seenKey]);

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "E";
  const allTabs = [...tabs, { id: "notifications", label: "Notifications", icon: Bell, badge: notifications.unread }];

  return (
    <SiteLayout>
      <main className="ws">
        <aside className="ws-side">
          <div className="ws-user">
            <span className="ws-avatar" aria-hidden="true">{initials}</span>
            <div>
              <strong>{user?.firstName} {user?.lastName}</strong>
              <small>{user?.email}</small>
              <span className="ws-role">{roleLabel}</span>
            </div>
            <button
              type="button"
              className={`ws-bell ${notifications.unread ? "has-unread" : ""}`}
              aria-label={`Notifications${notifications.unread ? `, ${notifications.unread} unread` : ""}`}
              onClick={() => onChange("notifications")}
            >
              {notifications.unread ? <BellRing size={18} /> : <Bell size={18} />}
              {notifications.unread > 0 && <em>{notifications.unread > 9 ? "9+" : notifications.unread}</em>}
            </button>
          </div>
          <nav className="ws-tabs" aria-label={`${roleLabel} workspace`}>
            {allTabs.map(({ id, label, icon: Icon, badge: rawBadge }) => {
              const badge = id === "notifications" ? rawBadge : Math.max(0, (rawBadge ?? 0) - (seen[id] ?? 0));
              return (
              <button
                key={id}
                type="button"
                className={active === id ? "is-active" : ""}
                aria-current={active === id ? "page" : undefined}
                onClick={() => onChange(id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                {badge > 0 && <em>{badge}</em>}
              </button>
              );
            })}
          </nav>
          <div className="ws-side-foot">
            <Link to="/">Back to website</Link>
            <button type="button" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" /> Sign out
            </button>
          </div>
        </aside>
        <section className="ws-main">
          {active === "notifications" ? <NotificationsPanel notifications={notifications} /> : children}
        </section>
      </main>
    </SiteLayout>
  );
}

export function Panel({ title, subtitle, actions, children }) {
  return (
    <div className="ws-panel">
      <header className="ws-panel-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="ws-actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

const TONES = ["gold", "green", "blue", "rose", "plum"];

export function StatGrid({ items }) {
  return (
    <div className="ws-stats">
      {items.map(({ label, value, icon: Icon, hint, onClick }, index) => {
        const Tag = onClick ? "button" : "article";
        return (
          <Tag className={`ws-stat tone-${TONES[index % TONES.length]}`} key={label} type={onClick ? "button" : undefined} onClick={onClick}>
            {Icon && <span className="ws-stat-icon"><Icon size={20} aria-hidden="true" /></span>}
            <strong>{value ?? "–"}</strong>
            <span>{label}</span>
            {hint && <small>{hint}</small>}
          </Tag>
        );
      })}
    </div>
  );
}

// Greeting banner at the top of each workspace overview.
export function Hero({ eyebrow, title, subtitle, image, actions }) {
  return (
    <section className="ws-hero">
      {image && <SmartImage src={img(image, 1600)} alt="" loading="eager" />}
      <div className="ws-hero-shade" />
      <div className="ws-hero-copy">
        {eyebrow && <p className="ws-hero-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {actions && <div className="ws-hero-actions">{actions}</div>}
      </div>
    </section>
  );
}

export function Empty({ children }) {
  return <div className="ws-empty">{children}</div>;
}

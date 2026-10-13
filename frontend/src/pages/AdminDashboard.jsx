import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarCheck,
  BarChart3,
  ClipboardCheck,
  Inbox,
  ShieldPlus,
  LayoutDashboard,
  MailOpen,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import WorkspaceShell, { Empty, Hero, Panel, StatGrid, useTab } from "../components/WorkspaceShell.jsx";
import LeadsPanel from "../components/LeadsPanel.jsx";
import AnalyticsPanel from "../components/AnalyticsPanel.jsx";
import { formatWhen } from "../components/EnquiryThread.jsx";
import SmartImage from "../components/SmartImage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { img } from "../data/media.js";
import {
  apiErrorMessage,
  fetchAdminOverview,
  createAdmin,
  fetchAdmins,
  fetchAllVisits,
  fetchListingsByStatus,
  fetchPartners,
  fetchUsers,
  setUserAccountStatus,
  reviewListing,
  setAdminStatus,
  setPartnerStatus,
  setVisitStatus,
} from "../services/auth.js";

const STATUS_LABEL = { published: "Live", pending: "Awaiting review", rejected: "Rejected", archived: "Archived" };

const formatDate = (value) =>
  new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function ListingRow({ property, onReview, busy }) {
  return (
    <li className="ws-row">
      <span className="ws-row-img"><SmartImage src={img(property.images[0] ?? "1600596542815-ffad4c1539a9", 300)} alt="" /></span>
      <div className="ws-row-main">
        <strong>{property.title}</strong>
        <small>{property.location} · {property.priceLabel} · {property.type}</small>
      </div>
      <div className="ws-row-actions">
        <span className={`ws-badge is-${property.status}`}>{STATUS_LABEL[property.status] ?? property.status}</span>
        {property.status === "published" && <Link className="ws-btn" to={`/property/${property.id}`}>View</Link>}
        {property.status !== "published" && (
          <button type="button" className="ws-btn ws-btn-ok" disabled={busy} onClick={() => onReview(property.id, "published", true)}>Approve &amp; verify</button>
        )}
        {property.status === "pending" && (
          <button type="button" className="ws-btn ws-btn-no" disabled={busy} onClick={() => onReview(property.id, "rejected")}>Reject</button>
        )}
        {property.status === "published" && (
          <button type="button" className="ws-btn ws-btn-no" disabled={busy} onClick={() => onReview(property.id, "archived")}>Archive</button>
        )}
      </div>
    </li>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useTab("overview");
  const [overview, setOverview] = useState(null);
  const [listings, setListings] = useState({ items: [], loading: true });
  const [listingFilter, setListingFilter] = useState("pending");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [partners, setPartners] = useState({ items: [], loading: true });
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [visits, setVisits] = useState({ items: [], loading: true });
  const [visitFilter, setVisitFilter] = useState("scheduled");
  const [users, setUsers] = useState({ items: [], loading: true });
  const [userFilter, setUserFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [admins, setAdmins] = useState({ items: [], loading: true });
  const [adminForm, setAdminForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [adminState, setAdminState] = useState({ busy: false, ok: "", error: "" });

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await fetchAdminOverview());
    } catch (e) {
      setError(apiErrorMessage(e, "Admin data could not be loaded."));
    }
  }, []);

  const loadListings = useCallback(async (status) => {
    setListings((l) => ({ ...l, loading: true }));
    try {
      setListings({ items: await fetchListingsByStatus(status), loading: false });
    } catch (e) {
      setError(apiErrorMessage(e, "Listings could not be loaded."));
      setListings({ items: [], loading: false });
    }
  }, []);

  const loadPartners = useCallback(async (status) => {
    try {
      setPartners({ items: await fetchPartners(status), loading: false });
    } catch (e) {
      setError(apiErrorMessage(e, "Partner accounts could not be loaded."));
      setPartners({ items: [], loading: false });
    }
  }, []);

  const loadVisits = useCallback(async (status) => {
    try {
      setVisits({ items: await fetchAllVisits(status), loading: false });
    } catch (e) {
      setError(apiErrorMessage(e, "Visits could not be loaded."));
      setVisits({ items: [], loading: false });
    }
  }, []);

  const loadUsers = useCallback(async (role, q) => {
    try {
      setUsers({ items: await fetchUsers({ role, q }), loading: false });
    } catch (e) {
      setError(apiErrorMessage(e, "Users could not be loaded."));
      setUsers({ items: [], loading: false });
    }
  }, []);

  async function toggleUser(id, status) {
    try {
      await setUserAccountStatus(id, status);
      loadUsers(userFilter, userSearch);
    } catch (e) {
      setError(apiErrorMessage(e, "That change could not be saved."));
    }
  }

  const loadAdmins = useCallback(async () => {
    try {
      setAdmins({ items: await fetchAdmins(), loading: false });
    } catch (e) {
      setError(apiErrorMessage(e, "Administrators could not be loaded."));
      setAdmins({ items: [], loading: false });
    }
  }, []);

  async function addAdmin(event) {
    event.preventDefault();
    setAdminState({ busy: true, ok: "", error: "" });
    try {
      const result = await createAdmin(adminForm);
      setAdminState({ busy: false, ok: result.message, error: "" });
      setAdminForm({ firstName: "", lastName: "", email: "", password: "" });
      loadAdmins();
    } catch (e) {
      setAdminState({ busy: false, ok: "", error: apiErrorMessage(e, "The administrator could not be added.") });
    }
  }

  async function toggleAdmin(id, status) {
    try {
      await setAdminStatus(id, status);
      loadAdmins();
    } catch (e) {
      setAdminState({ busy: false, ok: "", error: apiErrorMessage(e, "That change could not be saved.") });
    }
  }

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { loadAdmins(); }, [loadAdmins]);
  useEffect(() => {
    const timer = setTimeout(() => loadUsers(userFilter, userSearch), userSearch ? 300 : 0);
    return () => clearTimeout(timer);
  }, [userFilter, userSearch, loadUsers]);
  useEffect(() => { loadListings(listingFilter); }, [listingFilter, loadListings]);
  useEffect(() => { loadPartners(partnerFilter); }, [partnerFilter, loadPartners]);
  useEffect(() => { loadVisits(visitFilter); }, [visitFilter, loadVisits]);

  // Active agents/builders can be assigned to a visit.
  const [activeAgents, setActiveAgents] = useState([]);
  useEffect(() => {
    fetchPartners("active").then(setActiveAgents).catch(() => setActiveAgents([]));
  }, [partners.items.length]);

  const [refresh, setRefresh] = useState({ busy: false, at: null });
  async function refreshAll() {
    setRefresh({ busy: true, at: refresh.at });
    setError("");
    window.dispatchEvent(new Event("workspace:refresh")); // notifications too
    await Promise.all([
      loadOverview(),
      loadListings(listingFilter),
      loadPartners(partnerFilter),
      loadVisits(visitFilter),
      loadAdmins(),
      loadUsers(userFilter, userSearch),
    ]);
    setRefresh({ busy: false, at: new Date() });
  }

  async function review(id, status, verified) {
    setBusy(true);
    setError("");
    try {
      await reviewListing(id, status, verified);
      await Promise.all([loadListings(listingFilter), loadOverview()]);
    } catch (e) {
      setError(apiErrorMessage(e, "That change could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  async function decidePartner(id, status) {
    setBusy(true);
    setError("");
    try {
      await setPartnerStatus(id, status);
      await loadPartners(partnerFilter);
    } catch (e) {
      setError(apiErrorMessage(e, "That change could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  async function changeVisit(id, status) {
    try {
      await setVisitStatus(id, status);
      loadVisits(visitFilter);
    } catch (e) {
      setError(apiErrorMessage(e, "The visit could not be updated."));
    }
  }

  const stats = overview?.stats;
  const pendingPartners = useMemo(() => partners.items.filter((p) => p.status === "pending").length, [partners.items]);

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "inbox", label: "Leads & inbox", icon: Inbox, badge: stats?.newMessages ?? 0 },
    { id: "visits", label: "Site visits", icon: CalendarCheck, badge: stats?.upcomingVisits ?? 0 },
    { id: "review", label: "Listings", icon: ClipboardCheck, badge: stats?.pendingListings ?? 0 },
    { id: "users", label: "Users", icon: Users },
    { id: "partners", label: "Agents & builders", icon: UserCheck, badge: pendingPartners },
    { id: "admins", label: "Administrators", icon: ShieldPlus },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <WorkspaceShell roleLabel="Administrator" tabs={tabs} active={tab} onChange={setTab}>
      {error && <p className="ws-msg bad" role="alert" style={{ marginBottom: 16 }}>{error}</p>}

      {tab === "overview" && (
        <>
          <Hero
            image="1600607687920-4e2a09cf159d"
            eyebrow="Administration"
            title={<>Welcome, {user.firstName}. <em>Here is today.</em></>}
            subtitle="Everything that needs a decision: enquiries to answer, visits to schedule, listings to verify and partners to approve."
            actions={
              <>
                <button type="button" className="button button-light" onClick={() => setTab("admins")}><ShieldPlus size={16} /> Register an admin</button>
                <button type="button" className="button button-ghost" onClick={refreshAll} disabled={refresh.busy}>
                  <RefreshCw size={16} className={refresh.busy ? "is-spinning" : ""} /> {refresh.busy ? "Refreshing…" : "Refresh"}
                </button>
                {refresh.at && !refresh.busy && <span className="ws-updated" role="status">Updated {refresh.at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
              </>
            }
          />
          <StatGrid
            items={[
              { label: "Registered users", value: stats?.users, icon: Users, hint: "View all accounts", onClick: () => { setUserFilter("all"); setTab("users"); } },
              { label: "Live listings", value: stats?.properties, icon: Building2, hint: "Manage listings", onClick: () => { setListingFilter("published"); setTab("review"); } },
              { label: "Agents & builders", value: partners.items.filter((p) => p.status === "active").length || undefined, icon: UserCheck, onClick: () => setTab("partners") },
              { label: "Upcoming visits", value: stats?.upcomingVisits, icon: CalendarCheck, onClick: () => setTab("visits") },
              { label: "Awaiting reply", value: stats?.newMessages, icon: MailOpen, onClick: () => setTab("inbox") },
            ]}
          />
          <section>
            <div className="ws-section-head"><h2>Needs your attention</h2></div>
            <div className="ws-attn">
              <button type="button" className={`ws-attn-card ${stats?.newMessages ? "is-hot" : ""}`} onClick={() => setTab("inbox")}>
                <MailOpen size={22} aria-hidden="true" />
                <strong>{stats?.newMessages ?? 0}</strong>
                <span>new enquiry message(s) to answer</span>
              </button>
              <button type="button" className={`ws-attn-card ${stats?.pendingListings ? "is-hot" : ""}`} onClick={() => setTab("review")}>
                <ClipboardCheck size={22} aria-hidden="true" />
                <strong>{stats?.pendingListings ?? 0}</strong>
                <span>listing(s) waiting for verification</span>
              </button>
              <button type="button" className={`ws-attn-card ${pendingPartners ? "is-hot" : ""}`} onClick={() => setTab("partners")}>
                <UserCheck size={22} aria-hidden="true" />
                <strong>{pendingPartners}</strong>
                <span>agent / builder application(s) to approve</span>
              </button>
            </div>
          </section>
          {(overview?.messages ?? []).length > 0 && (
            <section>
              <div className="ws-section-head">
                <h2>Latest messages</h2>
                <button type="button" className="ws-link" onClick={() => setTab("inbox")}>Open inbox</button>
              </div>
              <ul className="ws-inbox">
                {overview.messages.slice(0, 3).map((m) => (
                  <li key={m.id} className={`admin-message status-${m.status}`}>
                    <div className="admin-message-top"><strong>{m.name}</strong><span className="admin-topic">{m.topic}</span><time>{formatDate(m.created_at)}</time></div>
                    <p>{m.message.slice(0, 160)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {tab === "inbox" && (
        <LeadsPanel
          isAdmin
          agents={activeAgents}
          title={<>Leads &amp; <em>inbox</em></>}
          subtitle="Every enquiry, callback and site-visit request. Reply to the customer, assign an agent, book the visit and move the lead through the pipeline."
          emptyText="No enquiries yet. Messages from the Contact page and property enquiries appear here."
          onChanged={() => { loadOverview(); loadVisits(visitFilter); }}
        />
      )}

      {tab === "admins" && (
        <Panel title={<>Admin<em>istrators</em></>} subtitle="People who can sign in at /admin. Add colleagues here; they can sign in straight away.">
          <form className="ws-form" onSubmit={addAdmin}>
            <fieldset>
              <legend>Register a new administrator</legend>
              <div className="ws-cols">
                <label>First name<input required value={adminForm.firstName} onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })} /></label>
                <label>Last name<input value={adminForm.lastName} onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })} /></label>
              </div>
              <div className="ws-cols">
                <label>Email address<input type="email" required autoComplete="off" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} /></label>
                <label>Temporary password <small>(min. 8 characters)</small><input type="password" required minLength={8} autoComplete="new-password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} /></label>
              </div>
            </fieldset>
            {adminState.ok && <p className="ws-msg ok" role="status">{adminState.ok}</p>}
            {adminState.error && <p className="ws-msg bad" role="alert">{adminState.error}</p>}
            <div className="ws-form-actions">
              <button className="button button-dark" type="submit" disabled={adminState.busy}>{adminState.busy ? "Adding…" : "Add administrator"}</button>
              <span className="pd-muted">Share the password with them securely and ask them to keep it private.</span>
            </div>
          </form>
          <section>
            <div className="ws-section-head"><h2>Current administrators</h2></div>
            <ul className="ws-list">
              {admins.items.map((a) => (
                <li className="ws-row" style={{ gridTemplateColumns: "48px minmax(0,1fr) auto" }} key={a.id}>
                  <span className="ws-avatar" style={{ width: 44, height: 44 }} aria-hidden="true">{`${a.firstName?.[0] ?? ""}${a.lastName?.[0] ?? ""}`.toUpperCase() || "A"}</span>
                  <div className="ws-row-main">
                    <strong>{a.firstName} {a.lastName}{a.id === user.id ? " (you)" : ""}</strong>
                    <small>{a.email} · {a.lastLoginAt ? `last sign-in ${formatDate(a.lastLoginAt)}` : "never signed in"}</small>
                  </div>
                  <div className="ws-row-actions">
                    <span className={`ws-badge ${a.status === "active" ? "is-published" : "is-rejected"}`}>{a.status}</span>
                    {a.id !== user.id && a.status === "active" && <button type="button" className="ws-btn ws-btn-no" onClick={() => toggleAdmin(a.id, "suspended")}>Suspend</button>}
                    {a.id !== user.id && a.status !== "active" && <button type="button" className="ws-btn ws-btn-ok" onClick={() => toggleAdmin(a.id, "active")}>Reactivate</button>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </Panel>
      )}

      {tab === "analytics" && (
        <AnalyticsPanel title={<>Marketplace <em>analytics</em></>} subtitle="Listings, views, leads and deals across the whole platform." />
      )}

      {tab === "visits" && (
        <Panel title={<>Site <em>visits</em></>} subtitle="Every visit booked from an enquiry. Book new ones from the Inbox.">
          <div className="ws-seg" role="group" aria-label="Filter visits">
            {["scheduled", "completed", "cancelled", "all"].map((s) => (
              <button key={s} type="button" className={visitFilter === s ? "is-active" : ""} aria-pressed={visitFilter === s} onClick={() => setVisitFilter(s)}>{s}</button>
            ))}
          </div>
          {!visits.loading && visits.items.length === 0 ? (
            <Empty>No {visitFilter === "all" ? "" : visitFilter} visits. Open an enquiry in the <button type="button" className="ws-link" onClick={() => setTab("inbox")}>Inbox</button> to book one.</Empty>
          ) : (
            <ul className="ws-list">
              {visits.items.map((v) => (
                <li className="ws-row" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }} key={v.id}>
                  <div className="ws-row-main">
                    <strong>{formatWhen(v.scheduled_at)}</strong>
                    <small>{v.property_title ?? "Property visit"} · {v.customer_name} ({v.customer_email}{v.customer_phone ? `, ${v.customer_phone}` : ""}){v.agent_first ? ` · agent ${v.agent_first} ${v.agent_last ?? ""}` : " · no agent assigned"}</small>
                  </div>
                  <div className="ws-row-actions">
                    <span className={`ws-badge ${v.status === "scheduled" ? "is-pending" : v.status === "completed" ? "is-published" : "is-rejected"}`}>{v.status}</span>
                    {v.status === "scheduled" && <button type="button" className="ws-btn ws-btn-ok" onClick={() => changeVisit(v.id, "completed")}>Mark done</button>}
                    {v.status === "scheduled" && <button type="button" className="ws-btn ws-btn-no" onClick={() => changeVisit(v.id, "cancelled")}>Cancel</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === "review" && (
        <Panel title={<>Listing <em>review</em></>} subtitle="Approve agent and builder submissions before they appear on the website.">
          <div className="ws-seg" role="group" aria-label="Filter listings">
            {["pending", "published", "rejected", "archived", "all"].map((s) => (
              <button key={s} type="button" className={listingFilter === s ? "is-active" : ""} aria-pressed={listingFilter === s} onClick={() => setListingFilter(s)}>{s}</button>
            ))}
          </div>
          {!listings.loading && listings.items.length === 0 ? (
            <Empty>No {listingFilter === "all" ? "" : listingFilter} listings.</Empty>
          ) : (
            <ul className="ws-list">
              {listings.items.map((p) => <ListingRow key={p.id} property={p} onReview={review} busy={busy} />)}
            </ul>
          )}
        </Panel>
      )}

      {tab === "users" && (
        <Panel title={<>Registered <em>users</em></>} subtitle="Every account on the website. Suspend an account to block sign-in, and reactivate it any time.">
          <div className="ws-toolbar">
            <div className="ws-seg" role="group" aria-label="Filter users by type">
              {["all", "customer", "agent", "builder", "admin"].map((r) => (
                <button key={r} type="button" className={userFilter === r ? "is-active" : ""} aria-pressed={userFilter === r} onClick={() => setUserFilter(r)}>{r}</button>
              ))}
            </div>
            <input className="ws-search" type="search" placeholder="Search name or email…" aria-label="Search users" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          </div>
          {!users.loading && users.items.length === 0 ? (
            <Empty>No users match.</Empty>
          ) : (
            <ul className="ws-list">
              {users.items.map((u) => (
                <li className="ws-row" style={{ gridTemplateColumns: "48px minmax(0,1fr) auto" }} key={u.id}>
                  <span className="ws-avatar" style={{ width: 44, height: 44 }} aria-hidden="true">{`${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase() || "U"}</span>
                  <div className="ws-row-main">
                    <strong>{u.firstName} {u.lastName} <span className="admin-topic">{u.role ?? "no role"}</span>{u.id === user.id ? " (you)" : ""}</strong>
                    <small>{u.email}{u.phone ? ` · ${u.phone}` : ""} · joined {formatDate(u.createdAt)}{u.lastLoginAt ? ` · last sign-in ${formatDate(u.lastLoginAt)}` : " · never signed in"}</small>
                  </div>
                  <div className="ws-row-actions">
                    <span className={`ws-badge ${u.status === "active" ? "is-published" : u.status === "pending" ? "is-pending" : "is-rejected"}`}>{u.status}</span>
                    {u.role !== "admin" && u.id !== user.id && (u.status === "suspended"
                      ? <button type="button" className="ws-btn ws-btn-ok" onClick={() => toggleUser(u.id, "active")}>Reactivate</button>
                      : <button type="button" className="ws-btn ws-btn-no" onClick={() => toggleUser(u.id, "suspended")}>Suspend</button>)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === "partners" && (
        <Panel title={<>Agents &amp; <em>builders</em></>} subtitle="Everyone who lists on the marketplace. Approve applications and see how many properties each has listed.">
          <div className="ws-seg" role="group" aria-label="Filter partners">
            {["all", "pending", "active", "suspended"].map((s) => (
              <button key={s} type="button" className={partnerFilter === s ? "is-active" : ""} aria-pressed={partnerFilter === s} onClick={() => setPartnerFilter(s)}>{s}</button>
            ))}
          </div>
          {!partners.loading && partners.items.length === 0 ? (
            <Empty>No {partnerFilter === "all" ? "" : partnerFilter} partner accounts yet. Applications from <strong>/agent/register</strong> appear here.</Empty>
          ) : (
            <ul className="ws-list">
              {partners.items.map((p) => (
                <li className="ws-row" style={{ gridTemplateColumns: "48px minmax(0,1fr) auto" }} key={p.id}>
                  <span className="ws-avatar" style={{ width: 44, height: 44 }} aria-hidden="true">{`${p.firstName?.[0] ?? ""}${p.lastName?.[0] ?? ""}`.toUpperCase() || "A"}</span>
                  <div className="ws-row-main">
                    <strong>{p.firstName} {p.lastName} <span className="admin-topic">{p.role}</span></strong>
                    <small>{p.email} · {p.listings} listing{p.listings === 1 ? "" : "s"} · joined {formatDate(p.createdAt)}</small>
                  </div>
                  <div className="ws-row-actions">
                    <span className={`ws-badge ${p.status === "active" ? "is-published" : p.status === "pending" ? "is-pending" : "is-rejected"}`}>{p.status}</span>
                    {p.status !== "active" && <button type="button" className="ws-btn ws-btn-ok" disabled={busy} onClick={() => decidePartner(p.id, "active")}>Approve</button>}
                    {p.status === "pending" && <button type="button" className="ws-btn ws-btn-no" disabled={busy} onClick={() => decidePartner(p.id, "deleted")}>Reject</button>}
                    {p.status === "active" && <button type="button" className="ws-btn ws-btn-no" disabled={busy} onClick={() => decidePartner(p.id, "suspended")}>Suspend</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </WorkspaceShell>
  );
}

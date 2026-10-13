import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Heart,
  LayoutDashboard,
  MessageSquare,
  PhoneCall,
  Search,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import WorkspaceShell, { Empty, Hero, Panel, StatGrid, useTab } from "../components/WorkspaceShell.jsx";
import { STAGE_LABEL, formatWhen } from "../components/EnquiryThread.jsx";
import ListingCard from "../components/ListingCard.jsx";
import SmartImage from "../components/SmartImage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSaved } from "../context/SavedContext.jsx";
import { categories, img } from "../data/media.js";
import { listProperties } from "../services/properties.js";
import {
  apiErrorMessage,
  cancelMyVisit,
  fetchMyEnquiries,
  fetchMyVisits,
  fetchProfile,
  fetchRecent,
  fetchSavedProperties,
  updateProfile,
} from "../services/auth.js";

const dateFormat = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const STATUS_STEP = { new: 1, read: 2, replied: 3, archived: 3 };
const STATUS_COPY = { new: "Received", read: "Being reviewed", replied: "Replied", archived: "Closed" };
const VISIT_BADGE = { scheduled: "is-pending", completed: "is-published", cancelled: "is-rejected" };
const TYPE_ICON = { callback: PhoneCall, "site visit": CalendarCheck, enquiry: MessageSquare };

// Conversation cards: your message, our replies, the visit we booked, and where
// the lead is in the process.
function Timeline({ items }) {
  return (
    <ul className="ws-timeline">
      {items.map((e) => {
        const Icon = TYPE_ICON[e.request_type] ?? MessageSquare;
        const step = STATUS_STEP[e.status] ?? 1;
        return (
          <li key={e.id}>
            <span className="ws-tl-icon"><Icon size={20} aria-hidden="true" /></span>
            <div>
              {e.property?.title && <strong className="lead-property">{e.property.title}</strong>}
              <p>{e.message.replace(/^\[[^\]]*\]\s*/, "")}</p>
              <small>{dateFormat(e.created_at)} · {e.request_type}</small>
              {(e.replies ?? []).map((r) => (
                <div className="th-reply" key={r.id}>
                  <small>Estate &amp; Co. replied · {dateFormat(r.created_at)}</small>
                  <p>{r.body}</p>
                </div>
              ))}
              {(e.visits ?? []).map((v) => (
                <div className="th-visit-chip" key={v.id}>
                  <CalendarCheck size={16} aria-hidden="true" />
                  <span>Visit {v.status === "scheduled" ? "booked" : v.status}: <strong>{formatWhen(v.scheduled_at)}</strong>{v.property_title ? ` · ${v.property_title}` : ""}</span>
                </div>
              ))}
              <div className="ws-steps-bar" aria-hidden="true">
                {[1, 2, 3].map((n) => <i key={n} className={n <= step ? "on" : ""} />)}
              </div>
            </div>
            <span className={`ws-badge ${e.status === "replied" ? "is-published" : ""}`}>{STATUS_COPY[e.status]}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ProfileForm() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName ?? "", phone: "" });
  const [state, setState] = useState({ busy: false, ok: "", error: "" });

  useEffect(() => {
    fetchProfile().then((p) => setForm((f) => ({ ...f, phone: p.phone ?? "" }))).catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, ok: "", error: "" });
    try {
      const result = await updateProfile(form);
      updateUser({ firstName: result.data.firstName, lastName: result.data.lastName });
      setState({ busy: false, ok: result.message, error: "" });
    } catch (e) {
      setState({ busy: false, ok: "", error: apiErrorMessage(e, "Your profile could not be saved.") });
    }
  }

  return (
    <form className="ws-form" onSubmit={submit}>
      <fieldset>
        <legend>Your details</legend>
        <div className="ws-cols">
          <label>First name<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
          <label>Last name<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
        </div>
        <div className="ws-cols">
          <label>Email address<input value={user.email} disabled /></label>
          <label>Phone number <small>(so advisors can call you)</small><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></label>
        </div>
      </fieldset>
      {state.ok && <p className="ws-msg ok" role="status">{state.ok}</p>}
      {state.error && <p className="ws-msg bad" role="alert">{state.error}</p>}
      <div className="ws-form-actions">
        <button className="button button-dark" type="submit" disabled={state.busy}>{state.busy ? "Saving…" : "Save profile"}</button>
      </div>
    </form>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const { isSaved } = useSaved();
  const [tab, setTab] = useTab("overview");
  const [saved, setSaved] = useState({ items: [], loading: true, error: "" });
  const [recent, setRecent] = useState({ items: [], loading: true });
  const [enquiries, setEnquiries] = useState({ items: [], loading: true, error: "" });
  const [visits, setVisits] = useState({ items: [], loading: true, error: "" });
  const [picks, setPicks] = useState([]);

  useEffect(() => {
    let active = true;
    fetchSavedProperties()
      .then((items) => active && setSaved({ items, loading: false, error: "" }))
      .catch((e) => active && setSaved({ items: [], loading: false, error: apiErrorMessage(e, "Saved properties could not be loaded.") }));
    fetchRecent()
      .then((items) => active && setRecent({ items, loading: false }))
      .catch(() => active && setRecent({ items: [], loading: false }));
    fetchMyEnquiries()
      .then((items) => active && setEnquiries({ items, loading: false, error: "" }))
      .catch((e) => active && setEnquiries({ items: [], loading: false, error: apiErrorMessage(e, "Enquiries could not be loaded.") }));
    fetchMyVisits()
      .then((items) => active && setVisits({ items, loading: false, error: "" }))
      .catch((e) => active && setVisits({ items: [], loading: false, error: apiErrorMessage(e, "Visits could not be loaded.") }));
    listProperties({ mode: "luxury" })
      .then((r) => active && setPicks(r.data.slice(0, 3)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Properties un-hearted elsewhere disappear from the list straight away.
  const savedItems = saved.items.filter((p) => isSaved(p.id));
  const open = enquiries.items.filter((e) => e.status !== "archived").length;
  const replied = enquiries.items.filter((e) => e.status === "replied").length;
  const callbacks = enquiries.items.filter((e) => e.request_type === "callback");
  const visitRequests = enquiries.items.filter((e) => e.request_type === "site visit");
  const upcoming = visits.items.filter((v) => v.status === "scheduled" && new Date(v.scheduled_at) > new Date());

  async function cancelVisit(id) {
    try {
      await cancelMyVisit(id);
      setVisits((v) => ({ ...v, items: v.items.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)) }));
    } catch (e) {
      setVisits((v) => ({ ...v, error: apiErrorMessage(e, "The visit could not be cancelled.") }));
    }
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "profile", label: "My profile", icon: UserRound },
    { id: "saved", label: "Saved properties", icon: Heart, badge: savedItems.length },
    { id: "recent", label: "Recently viewed", icon: Clock },
    { id: "visits", label: "Site visit requests", icon: CalendarCheck, badge: upcoming.length },
    { id: "callbacks", label: "Callback requests", icon: PhoneCall },
    { id: "enquiries", label: "My inquiries", icon: MessageSquare, badge: open },
  ];

  return (
    <WorkspaceShell roleLabel="Customer" tabs={tabs} active={tab} onChange={setTab}>
      {tab === "overview" && (
        <>
          <Hero
            image="1600607687939-ce8a6c25118c"
            eyebrow="Your property search"
            title={<>Welcome back, <em>{user.firstName}.</em></>}
            subtitle="Pick up where you left off: your shortlist, your conversations with our advisors and homes picked for you."
            actions={
              <>
                <Link className="button button-light" to="/search?mode=buy"><Search size={16} /> Browse properties</Link>
                <Link className="button button-ghost" to="/contact"><PhoneCall size={16} /> Talk to an advisor</Link>
              </>
            }
          />

          <StatGrid
            items={[
              { label: "Saved properties", value: savedItems.length, icon: Heart, hint: savedItems.length ? "View shortlist" : "Tap a heart to save", onClick: () => setTab("saved") },
              { label: "Open inquiries", value: open, icon: MessageSquare, hint: "Awaiting our team", onClick: () => setTab("enquiries") },
              { label: "Replies received", value: replied, icon: CheckCircle2, hint: "From our advisors", onClick: () => setTab("enquiries") },
              { label: "Upcoming visits", value: upcoming.length, icon: CalendarCheck, hint: upcoming[0] ? formatWhen(upcoming[0].scheduled_at) : "None booked", onClick: () => setTab("visits") },
            ]}
          />

          <section>
            <div className="ws-section-head"><h2>Start exploring</h2></div>
            <div className="ws-tiles">
              {categories.map((c) => (
                <Link className="ws-tile" key={c.mode} to={`/search?mode=${c.mode}`}>
                  <SmartImage src={img(c.id, 500)} alt="" />
                  <span>{c.label}<small>{c.blurb}</small></span>
                </Link>
              ))}
            </div>
          </section>

          {picks.length > 0 && (
            <section>
              <div className="ws-section-head">
                <h2>Picked for you</h2>
                <Link className="ws-link" to="/search?mode=luxury">See all luxury homes</Link>
              </div>
              <div className="ws-grid">
                {picks.map((p) => <ListingCard key={p.id} listing={p} />)}
              </div>
            </section>
          )}

          <section>
            <div className="ws-section-head">
              <h2>Recent inquiries</h2>
              {enquiries.items.length > 3 && <button type="button" className="ws-link" onClick={() => setTab("enquiries")}>View all</button>}
            </div>
            {enquiries.items.length === 0 ? (
              <Empty>
                You have not sent an inquiry yet. Open a property and choose <strong>Enquiry</strong>,{" "}
                <strong>Callback</strong> or <strong>Site visit</strong> and it will be tracked here.
              </Empty>
            ) : (
              <Timeline items={enquiries.items.slice(0, 3)} />
            )}
          </section>
        </>
      )}

      {tab === "profile" && (
        <Panel title={<>My <em>profile</em></>} subtitle="Keep your contact details current so our advisors can reach you.">
          <ProfileForm />
        </Panel>
      )}

      {tab === "saved" && (
        <Panel title={<>Saved <em>properties</em></>} subtitle="Your shortlist. Tap the heart on any property to add or remove it.">
          {saved.error && <p className="ws-msg bad" role="alert">{saved.error}</p>}
          {!saved.loading && savedItems.length === 0 ? (
            <Empty>
              Nothing saved yet. <Link to="/search?mode=buy">Browse properties</Link> and tap the heart on the ones you love.
            </Empty>
          ) : (
            <div className="ws-grid">
              {savedItems.map((p) => <ListingCard key={p.id} listing={p} />)}
            </div>
          )}
        </Panel>
      )}

      {tab === "recent" && (
        <Panel title={<>Recently <em>viewed</em></>} subtitle="Properties you opened lately, newest first.">
          {!recent.loading && recent.items.length === 0 ? (
            <Empty>You have not viewed any properties yet. <Link to="/search?mode=buy">Start browsing</Link>.</Empty>
          ) : (
            <div className="ws-grid">
              {recent.items.map((p) => <ListingCard key={p.id} listing={p} />)}
            </div>
          )}
        </Panel>
      )}

      {tab === "visits" && (
        <Panel title={<>Site visit <em>requests</em></>} subtitle="Visits you asked for and the ones our team booked. Please carry a photo ID.">
          {visits.error && <p className="ws-msg bad" role="alert">{visits.error}</p>}
          {visits.items.length > 0 && (
            <section>
              <div className="ws-section-head"><h2>Booked visits</h2></div>
              <ul className="ws-list">
                {visits.items.map((v) => (
                  <li className="ws-row" style={{ gridTemplateColumns: "44px minmax(0,1fr) auto" }} key={v.id}>
                    <span className="ws-tl-icon"><CalendarCheck size={20} aria-hidden="true" /></span>
                    <div className="ws-row-main">
                      <strong style={{ whiteSpace: "normal" }}>{formatWhen(v.scheduled_at)}</strong>
                      <small>{v.property_title ?? "Property visit"}{v.agent_first ? ` · with ${v.agent_first} ${v.agent_last ?? ""}` : ""}{v.notes ? ` · ${v.notes}` : ""}</small>
                      {v.property_slug && <Link className="ws-link" to={`/property/${v.property_slug}`}>View property</Link>}
                    </div>
                    <div className="ws-row-actions">
                      <span className={`ws-badge ${VISIT_BADGE[v.status]}`}>{v.status}</span>
                      {v.status === "scheduled" && <button type="button" className="ws-btn ws-btn-no" onClick={() => cancelVisit(v.id)}>Cancel</button>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <div className="ws-section-head"><h2>Your requests</h2></div>
            {visitRequests.length === 0 ? (
              <Empty>No site-visit requests yet. Open a property and choose <strong>Site visit</strong>; our team confirms a time here.</Empty>
            ) : (
              <Timeline items={visitRequests} />
            )}
          </section>
        </Panel>
      )}

      {tab === "callbacks" && (
        <Panel title={<>Callback <em>requests</em></>} subtitle="Times you asked an advisor to call you back, and how they responded.">
          {callbacks.length === 0 ? (
            <Empty>No callback requests yet. Open a property and choose <strong>Callback</strong>.</Empty>
          ) : (
            <Timeline items={callbacks} />
          )}
        </Panel>
      )}

      {tab === "enquiries" && (
        <Panel title={<>My <em>inquiries</em></>} subtitle="Every message you sent, with our replies. Stage: Received, Being reviewed, Replied.">
          {enquiries.error && <p className="ws-msg bad" role="alert">{enquiries.error}</p>}
          {!enquiries.loading && enquiries.items.length === 0 ? (
            <Empty>No inquiries yet. Open any property to send one.</Empty>
          ) : (
            <Timeline items={enquiries.items} />
          )}
          {enquiries.items.length > 0 && (
            <p className="pd-muted">Lead status: {enquiries.items.map((e) => STAGE_LABEL[e.stage]).filter((v, i, a) => a.indexOf(v) === i).join(", ")}</p>
          )}
        </Panel>
      )}
    </WorkspaceShell>
  );
}

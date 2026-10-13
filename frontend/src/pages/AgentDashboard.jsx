import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BellRing,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Pencil,
  PlusCircle,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import WorkspaceShell, { Empty, Hero, Panel, StatGrid, useTab } from "../components/WorkspaceShell.jsx";
import LeadsPanel from "../components/LeadsPanel.jsx";
import AnalyticsPanel from "../components/AnalyticsPanel.jsx";
import PhotoUploader from "../components/PhotoUploader.jsx";
import { formatWhen } from "../components/EnquiryThread.jsx";
import SmartImage from "../components/SmartImage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { AMENITY_SLUGS } from "../../../database/src/catalogue.js";
import { img } from "../data/media.js";
import {
  apiErrorMessage,
  createListing,
  deleteListing,
  fetchAgentVisits,
  fetchFollowUps,
  fetchLeads,
  fetchMyListings,
  setAgentVisitStatus,
  updateListing,
} from "../services/auth.js";

const AMENITIES = Object.keys(AMENITY_SLUGS);
const STATUS_LABEL = { published: "Live", pending: "Awaiting review", rejected: "Rejected", archived: "Removed" };

const emptyForm = {
  title: "", listingType: "sale", propertyType: "apartment", city: "", location: "", price: "", areaSqFt: "",
  beds: "", baths: "", furnishing: "", possession: "", tag: "", description: "", highlights: "", images: [],
  luxury: false, newProject: false, amenities: [],
};

const lines = (text) => text.split("\n").map((l) => l.trim()).filter(Boolean);

// Turn an existing listing into the form's editable shape.
function formFromListing(p) {
  return {
    title: p.title, listingType: p.listingType, propertyType: p.propertyType, city: p.city, location: p.location,
    price: String(p.price), areaSqFt: String(p.areaSqFt), beds: p.beds ? String(p.beds) : "", baths: p.baths ? String(p.baths) : "",
    furnishing: p.furnishing ?? "", possession: p.possession ?? "", tag: p.tag ?? "", description: p.description,
    highlights: (p.highlights ?? []).join("\n"),
    images: p.images ?? [],
    luxury: Boolean(p.luxury), newProject: Boolean(p.newProject), amenities: p.amenities ?? [],
  };
}

function ListingForm({ editing, onSaved, onCancel }) {
  const [form, setForm] = useState(editing ? formFromListing(editing) : emptyForm);
  const [state, setState] = useState({ busy: false, ok: "", error: "" });
  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const toggleAmenity = (name) =>
    setForm((f) => ({ ...f, amenities: f.amenities.includes(name) ? f.amenities.filter((a) => a !== name) : [...f.amenities, name] }));

  async function submit(event) {
    event.preventDefault();
    if (form.images.length === 0) {
      setState({ busy: false, ok: "", error: "Add at least one photo of the property." });
      return;
    }
    setState({ busy: true, ok: "", error: "" });
    const payload = {
      title: form.title, description: form.description, listingType: form.listingType, propertyType: form.propertyType,
      city: form.city, location: form.location, price: Number(form.price), areaSqFt: Number(form.areaSqFt),
      beds: Number(form.beds || 0), baths: Number(form.baths || 0), furnishing: form.furnishing || undefined,
      possession: form.possession || undefined, tag: form.tag || undefined, luxury: form.luxury, newProject: form.newProject,
      highlights: lines(form.highlights), amenities: form.amenities, images: form.images,
    };
    try {
      const result = editing ? await updateListing(editing.id, payload) : await createListing(payload);
      setState({ busy: false, ok: result.message, error: "" });
      if (!editing) setForm(emptyForm);
      onSaved?.();
    } catch (error) {
      setState({ busy: false, ok: "", error: apiErrorMessage(error, "The property could not be saved. Please try again.") });
    }
  }

  return (
    <form className="ws-form" onSubmit={submit}>
      <fieldset>
        <legend>The basics</legend>
        <label>Title<input required minLength={5} maxLength={180} value={form.title} onChange={set("title")} placeholder="e.g. Sunlit 3BHK with garden terrace" /></label>
        <div className="ws-cols">
          <label>Listing type
            <select value={form.listingType} onChange={set("listingType")}>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
              <option value="lease">Commercial lease</option>
            </select>
          </label>
          <label>Property type
            <select value={form.propertyType} onChange={set("propertyType")}>
              {["apartment", "villa", "house", "plot", "office", "retail", "warehouse", "other"].map((t) => (
                <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </label>
          <label>Short tag <small>(optional)</small><input maxLength={80} value={form.tag} onChange={set("tag")} placeholder="Sea-facing" /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Location &amp; size</legend>
        <div className="ws-cols">
          <label>City<input required value={form.city} onChange={set("city")} placeholder="Pune" /></label>
          <label>Locality &amp; city<input required value={form.location} onChange={set("location")} placeholder="Baner, Pune" /></label>
        </div>
        <div className="ws-cols">
          <label>{form.listingType === "sale" ? "Price (₹)" : "Rent per month (₹)"}<input required type="number" min="1" value={form.price} onChange={set("price")} /></label>
          <label>Area (sq ft)<input required type="number" min="1" value={form.areaSqFt} onChange={set("areaSqFt")} /></label>
          <label>Bedrooms<input type="number" min="0" max="30" value={form.beds} onChange={set("beds")} /></label>
          <label>Bathrooms<input type="number" min="0" max="30" value={form.baths} onChange={set("baths")} /></label>
        </div>
        <div className="ws-cols">
          <label>Furnishing
            <select value={form.furnishing} onChange={set("furnishing")}>
              <option value="">Not specified</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="semi_furnished">Semi-furnished</option>
              <option value="furnished">Furnished</option>
            </select>
          </label>
          <label>Possession<input maxLength={80} value={form.possession} onChange={set("possession")} placeholder="Ready to move" /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Description &amp; features</legend>
        <label>Description<textarea required minLength={20} maxLength={4000} rows={5} value={form.description} onChange={set("description")} placeholder="Describe the property, the neighbourhood and what makes it special." /></label>
        <label>Highlights <small>(one per line, up to 10)</small><textarea rows={4} value={form.highlights} onChange={set("highlights")} placeholder={"Private terrace\nWalk to metro"} /></label>
        <div>
          <p style={{ margin: "0 0 8px", fontWeight: 500 }}>Amenities</p>
          <div className="ws-checks">
            {AMENITIES.map((name) => (
              <label key={name}><input type="checkbox" checked={form.amenities.includes(name)} onChange={() => toggleAmenity(name)} /> {name}</label>
            ))}
          </div>
        </div>
        <div className="ws-checks">
          <label><input type="checkbox" checked={form.luxury} onChange={set("luxury")} /> Luxury residence</label>
          <label><input type="checkbox" checked={form.newProject} onChange={set("newProject")} /> New launch</label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Photographs</legend>
        <PhotoUploader value={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} />
      </fieldset>

      {state.ok && <p className="ws-msg ok" role="status">{state.ok}</p>}
      {state.error && <p className="ws-msg bad" role="alert">{state.error}</p>}
      <div className="ws-form-actions">
        <button className="button button-dark" type="submit" disabled={state.busy}>
          {state.busy ? "Saving…" : editing ? "Save changes" : "Submit for review"} <ArrowUpRight size={15} />
        </button>
        {editing && <button type="button" className="ws-btn" onClick={onCancel}>Cancel</button>}
        <span className="pd-muted">{editing ? "Edited listings are re-verified before they show again." : "Listings go live after our team verifies them."}</span>
      </div>
    </form>
  );
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useTab("overview");
  const [editing, setEditing] = useState(null);
  const [listings, setListings] = useState({ items: [], loading: true, error: "" });
  const [visits, setVisits] = useState({ items: [], loading: true });
  const [summary, setSummary] = useState({ leads: [], followUps: [] });

  const load = useCallback(() => {
    fetchMyListings()
      .then((items) => setListings({ items, loading: false, error: "" }))
      .catch((e) => setListings({ items: [], loading: false, error: apiErrorMessage(e, "Your listings could not be loaded.") }));
  }, []);

  const loadVisits = useCallback(() => {
    fetchAgentVisits()
      .then((items) => setVisits({ items, loading: false }))
      .catch(() => setVisits({ items: [], loading: false }));
  }, []);

  const loadSummary = useCallback(() => {
    Promise.all([fetchLeads("all"), fetchFollowUps()])
      .then(([leads, followUps]) => setSummary({ leads, followUps }))
      .catch(() => setSummary({ leads: [], followUps: [] }));
  }, []);

  useEffect(() => {
    load();
    loadVisits();
    loadSummary();
  }, [load, loadVisits, loadSummary]);

  async function markVisit(id, status) {
    await setAgentVisitStatus(id, status).catch(() => {});
    loadVisits();
    loadSummary();
  }

  async function remove(property) {
    if (!window.confirm(`Remove "${property.title}" from the website? You can no longer receive enquiries on it.`)) return;
    try {
      await deleteListing(property.id);
      load();
    } catch (e) {
      setListings((l) => ({ ...l, error: apiErrorMessage(e, "The listing could not be removed.") }));
    }
  }

  const count = (status) => listings.items.filter((l) => l.status === status).length;
  const visible = listings.items.filter((l) => l.status !== "archived");
  const upcomingVisits = visits.items.filter((v) => v.status === "scheduled");
  const newLeads = summary.leads.filter((l) => l.stage === "new").length;
  const dueFollowUps = summary.followUps.filter((f) => new Date(f.follow_up_at) <= new Date()).length;
  const steps = [
    { title: "Your account is approved", text: "You can sign in and list properties.", done: true },
    { title: "Add your first property", text: "Photos, price, location and a good description.", done: listings.items.length > 0 },
    { title: "Pass the review", text: "Our team verifies the listing, usually within one working day.", done: count("published") > 0 },
    { title: "Receive leads", text: "Live listings reach buyers; you are notified of every lead.", done: summary.leads.length > 0 },
  ];
  const done = steps.filter((st) => st.done).length;
  const roleLabel = user.role === "builder" ? "Builder" : "Agent";

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "add", label: "Add property", icon: PlusCircle },
    { id: "listings", label: "My properties", icon: ListChecks, badge: visible.length },
    { id: "leads", label: "Leads", icon: Users, badge: newLeads },
    { id: "inquiries", label: "Customer inquiries", icon: MessageSquare },
    { id: "visits", label: "Site visits", icon: CalendarCheck, badge: upcomingVisits.length },
    { id: "followups", label: "Follow-ups", icon: BellRing, badge: dueFollowUps },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <WorkspaceShell roleLabel={roleLabel} tabs={tabs} active={tab} onChange={(next) => { setEditing(null); setTab(next); }}>
      {tab === "overview" && (
        <>
          <Hero
            image="1486406146926-c627a92ad1ab"
            eyebrow={`${roleLabel} workspace`}
            title={<>Hello, <em>{user.firstName}.</em></>}
            subtitle="List properties, work your leads from first contact to closed deal, and see how your portfolio performs."
            actions={
              <>
                <button type="button" className="button button-light" onClick={() => setTab("add")}><PlusCircle size={16} /> Add a property</button>
                <button type="button" className="button button-ghost" onClick={() => setTab("leads")}><Users size={16} /> Open leads</button>
              </>
            }
          />
          <StatGrid
            items={[
              { label: "Live listings", value: count("published"), icon: ShieldCheck, hint: `${listings.items.length} in total`, onClick: () => setTab("listings") },
              { label: "New leads", value: newLeads, icon: Users, hint: `${summary.leads.length} in total`, onClick: () => setTab("leads") },
              { label: "Upcoming visits", value: upcomingVisits.length, icon: CalendarCheck, hint: upcomingVisits[0] ? formatWhen(upcomingVisits[0].scheduled_at) : "None booked", onClick: () => setTab("visits") },
              { label: "Follow-ups due", value: dueFollowUps, icon: BellRing, hint: `${summary.followUps.length} scheduled`, onClick: () => setTab("followups") },
              { label: "Awaiting review", value: count("pending"), icon: Clock, hint: "Usually within a day", onClick: () => setTab("listings") },
            ]}
          />
          <section>
            <div className="ws-section-head">
              <h2>Getting started</h2>
              <span className="pd-muted">{done} of {steps.length} complete</span>
            </div>
            <div className="ws-progress" aria-hidden="true"><i style={{ width: `${(done / steps.length) * 100}%` }} /></div>
            <ul className="ws-check" style={{ marginTop: 16 }}>
              {steps.map((step, i) => (
                <li key={step.title} className={step.done ? "done" : ""}>
                  <span className="ws-check-dot">{step.done ? <CheckCircle2 size={18} /> : i + 1}</span>
                  <div><strong>{step.title}</strong><span>{step.text}</span></div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {tab === "add" && (
        <Panel title={<>Add a <em>property</em></>} subtitle="Fill in the details below. You can list apartments, villas, plots and commercial space.">
          <ListingForm onSaved={() => { load(); }} />
        </Panel>
      )}

      {tab === "listings" && !editing && (
        <Panel title={<>My <em>properties</em></>} subtitle="Edit or remove your listings and follow their review status." actions={<button type="button" className="button button-dark" onClick={() => setTab("add")}><PlusCircle size={15} /> Add property</button>}>
          {listings.error && <p className="ws-msg bad" role="alert">{listings.error}</p>}
          {!listings.loading && visible.length === 0 && !listings.error ? (
            <Empty>You have not added a property yet. <button type="button" className="text-link" onClick={() => setTab("add")}>Add your first listing</button>.</Empty>
          ) : (
            <ul className="ws-list">
              {visible.map((p) => (
                <li className="ws-row" key={p.id}>
                  <span className="ws-row-img"><SmartImage src={img(p.images[0] ?? "1600596542815-ffad4c1539a9", 300)} alt="" /></span>
                  <div className="ws-row-main">
                    <strong>{p.title}</strong>
                    <small>{p.location} · {p.priceLabel}</small>
                  </div>
                  <div className="ws-row-actions">
                    <span className={`ws-badge is-${p.status}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
                    {p.status === "published" && <Link className="ws-btn" to={`/property/${p.id}`}>View</Link>}
                    <button type="button" className="ws-btn" onClick={() => setEditing(p)}><Pencil size={14} aria-hidden="true" /> Edit</button>
                    <button type="button" className="ws-btn ws-btn-no" onClick={() => remove(p)}><Trash2 size={14} aria-hidden="true" /> Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === "listings" && editing && (
        <Panel title={<>Edit <em>property</em></>} subtitle={editing.title}>
          <ListingForm editing={editing} onSaved={() => { load(); }} onCancel={() => setEditing(null)} />
        </Panel>
      )}

      {tab === "leads" && (
        <LeadsPanel
          title={<>Your <em>leads</em></>}
          subtitle="Everyone who enquired about your properties. Contact them, book a visit, follow up and close the deal."
          emptyText="No leads yet. When a customer enquires about one of your live properties it appears here and you are notified."
          onChanged={() => { loadSummary(); loadVisits(); }}
        />
      )}

      {tab === "inquiries" && (
        <LeadsPanel
          mode="enquiries"
          title={<>Customer <em>inquiries</em></>}
          subtitle="Questions customers asked about your properties. Reply here and they are notified."
          emptyText="No inquiries yet."
          onChanged={() => loadSummary()}
        />
      )}

      {tab === "visits" && (
        <Panel title={<>Site <em>visits</em></>} subtitle="Visits booked for your properties. Meet the customer at the property at the booked time, then mark it done.">
          {!visits.loading && visits.items.length === 0 ? (
            <Empty>No visits yet. Book one from a lead, or our team may assign one to you.</Empty>
          ) : (
            <ul className="ws-list">
              {visits.items.map((v) => (
                <li className="ws-row" style={{ gridTemplateColumns: "44px minmax(0,1fr) auto" }} key={v.id}>
                  <span className="ws-tl-icon"><CalendarCheck size={20} aria-hidden="true" /></span>
                  <div className="ws-row-main">
                    <strong style={{ whiteSpace: "normal" }}>{formatWhen(v.scheduled_at)}</strong>
                    <small>{v.property_title ?? "Property visit"} · {v.customer_name}{v.customer_phone ? ` · ${v.customer_phone}` : ""} · {v.customer_email}{v.notes ? ` · ${v.notes}` : ""}</small>
                  </div>
                  <div className="ws-row-actions">
                    <span className={`ws-badge ${v.status === "scheduled" ? "is-pending" : v.status === "completed" ? "is-published" : "is-rejected"}`}>{v.status}</span>
                    {v.status === "scheduled" && <button type="button" className="ws-btn ws-btn-ok" onClick={() => markVisit(v.id, "completed")}>Mark done</button>}
                    {v.status === "scheduled" && <button type="button" className="ws-btn ws-btn-no" onClick={() => markVisit(v.id, "cancelled")}>Cancel</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === "followups" && (
        <LeadsPanel
          mode="follow-ups"
          title={<>Follow-<em>ups</em></>}
          subtitle="Leads with a reminder. Completing a visit schedules a follow-up automatically; overdue ones are highlighted."
          emptyText="No follow-ups scheduled. Set one from a lead's stage panel."
          onChanged={() => loadSummary()}
        />
      )}

      {tab === "analytics" && (
        <AnalyticsPanel title={<>Your <em>analytics</em></>} subtitle="Views, leads, visits and deals across your properties." />
      )}
    </WorkspaceShell>
  );
}

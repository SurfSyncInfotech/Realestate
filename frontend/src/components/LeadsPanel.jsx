import { useCallback, useEffect, useState } from "react";
import { BellRing, CalendarCheck, MessageSquare, PhoneCall } from "lucide-react";
import { Panel, Empty } from "./WorkspaceShell.jsx";
import EnquiryThread, { STAGES, STAGE_LABEL, formatWhen } from "./EnquiryThread.jsx";
import { apiErrorMessage, fetchFollowUps, fetchLeads, updateMessageStatus } from "../services/auth.js";

const TYPE_ICON = { callback: PhoneCall, "site visit": CalendarCheck, enquiry: MessageSquare };
const TYPE_LABEL = { callback: "Callback request", "site visit": "Site visit request", enquiry: "Enquiry" };
const STAGE_TONE = { new: "is-pending", contacted: "", visit_scheduled: "is-pending", follow_up: "is-pending", closed_won: "is-published", closed_lost: "is-rejected" };

// The lead pipeline. Admins see every lead and can assign agents; agents see the
// leads on their own properties.
//   mode "leads"      - everything, filterable by stage
//   mode "enquiries"  - only plain enquiries (customer inquiries)
//   mode "follow-ups" - leads with a follow-up reminder
export default function LeadsPanel({ title, subtitle, mode = "leads", isAdmin = false, agents = [], onChanged, emptyText }) {
  const [state, setState] = useState({ items: [], loading: true, error: "" });
  const [stage, setStage] = useState("all");
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const items = mode === "follow-ups" ? await fetchFollowUps() : await fetchLeads(stage);
      setState({ items, loading: false, error: "" });
    } catch (error) {
      setState({ items: [], loading: false, error: apiErrorMessage(error, "Leads could not be loaded.") });
    }
  }, [mode, stage]);

  useEffect(() => {
    load();
  }, [load]);

  const items = state.items.filter((l) => (mode === "enquiries" ? l.request_type === "enquiry" : true));
  const now = Date.now();

  return (
    <Panel title={title} subtitle={subtitle}>
      {mode !== "follow-ups" && (
        <div className="ws-seg" role="group" aria-label="Filter by stage">
          {[["all", "All"], ...STAGES].map(([value, label]) => (
            <button key={value} type="button" className={stage === value ? "is-active" : ""} aria-pressed={stage === value} onClick={() => setStage(value)}>{label}</button>
          ))}
        </div>
      )}
      {state.error && <p className="ws-msg bad" role="alert">{state.error}</p>}
      {!state.loading && items.length === 0 ? (
        <Empty>{emptyText ?? "Nothing here yet."}</Empty>
      ) : (
        <ul className="ws-inbox">
          {items.map((lead) => {
            const isOpen = open === lead.id;
            const Icon = TYPE_ICON[lead.request_type] ?? MessageSquare;
            const overdue = lead.follow_up_at && new Date(lead.follow_up_at).getTime() < now;
            return (
              <li key={lead.id} className={`admin-message stage-${lead.stage}`}>
                <div className="admin-message-top">
                  <strong>{lead.name}</strong>
                  <span className="admin-topic"><Icon size={12} aria-hidden="true" /> {TYPE_LABEL[lead.request_type]}</span>
                  <span className={`ws-badge ${STAGE_TONE[lead.stage]}`}>{STAGE_LABEL[lead.stage]}</span>
                  <time>{formatWhen(lead.created_at)}</time>
                </div>
                {lead.property_title && <p className="lead-property">{lead.property_title}</p>}
                <p>{(isOpen ? lead.message : lead.message.slice(0, 200)).replace(/^\[[^\]]*\]\s*/, "")}</p>
                {lead.follow_up_at && (
                  <p className={`lead-follow ${overdue ? "is-overdue" : ""}`}>
                    <BellRing size={14} aria-hidden="true" /> Follow-up {overdue ? "overdue: " : "on "}{formatWhen(lead.follow_up_at)}{lead.follow_up_note ? ` · ${lead.follow_up_note}` : ""}
                  </p>
                )}
                <div className="admin-message-bottom">
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                  {lead.phone && <a href={`tel:${lead.phone}`}>{lead.phone}</a>}
                  {lead.agent_first && <span className="pd-muted">Agent: {lead.agent_first} {lead.agent_last}</span>}
                  <button
                    type="button"
                    className="ws-btn ws-btn-ok"
                    aria-expanded={isOpen}
                    onClick={() => {
                      setOpen(isOpen ? null : lead.id);
                      if (!isOpen && isAdmin && lead.status === "new") updateMessageStatus(lead.id, "read").then(() => onChanged?.()).catch(() => {});
                    }}
                  >
                    {isOpen ? "Close" : "Open lead"}
                  </button>
                </div>
                {isOpen && (
                  <EnquiryThread
                    message={lead}
                    agents={agents}
                    isAdmin={isAdmin}
                    onChanged={() => { load(); onChanged?.(); }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

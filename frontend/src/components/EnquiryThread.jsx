import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Flag, Send, UserRoundCheck } from "lucide-react";
import { Link } from "react-router-dom";
import {
  apiErrorMessage,
  assignLead,
  fetchThread,
  scheduleVisit,
  sendReply,
  setLeadStage,
  setVisitStatus,
} from "../services/auth.js";

export const formatWhen = (value) =>
  new Date(value).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm"
const localInputValue = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export const STAGES = [
  ["new", "New lead"],
  ["contacted", "Contacted"],
  ["visit_scheduled", "Visit scheduled"],
  ["follow_up", "Follow-up"],
  ["closed_won", "Deal closed"],
  ["closed_lost", "Closed (lost)"],
];
export const STAGE_LABEL = Object.fromEntries(STAGES);
const VISIT_LABEL = { scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled" };

// One lead's conversation: replies, the stage in the pipeline (with follow-up
// reminder), and the site-visit scheduler. Used by admins (all leads, can assign
// an agent) and by agents (their own leads).
export default function EnquiryThread({ message, agents = [], isAdmin = false, onChanged }) {
  const [thread, setThread] = useState(null);
  const [reply, setReply] = useState("");
  const [visit, setVisit] = useState({ when: localInputValue(new Date(Date.now() + 86400000 * 2)), agentUserId: "", notes: "" });
  const [stage, setStage] = useState({ value: message.stage ?? "new", followUpAt: message.follow_up_at ? localInputValue(new Date(message.follow_up_at)) : "", note: message.follow_up_note ?? "" });
  const [state, setState] = useState({ busy: false, ok: "", error: "" });

  const load = useCallback(async () => {
    try {
      const data = await fetchThread(message.id);
      setThread(data);
      setStage({
        value: data.progress?.stage ?? "new",
        followUpAt: data.progress?.follow_up_at ? localInputValue(new Date(data.progress.follow_up_at)) : "",
        note: data.progress?.follow_up_note ?? "",
      });
    } catch (error) {
      setState({ busy: false, ok: "", error: apiErrorMessage(error, "The conversation could not be loaded.") });
    }
  }, [message.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action, success) {
    setState({ busy: true, ok: "", error: "" });
    try {
      const result = await action();
      setState({ busy: false, ok: success?.(result) ?? "", error: "" });
      await load();
      onChanged?.();
    } catch (error) {
      setState({ busy: false, ok: "", error: apiErrorMessage(error, "That could not be saved. Please try again.") });
    }
  }

  const submitReply = (event) => {
    event.preventDefault();
    run(async () => {
      const result = await sendReply(message.id, reply);
      setReply("");
      return result;
    }, (result) => result.message);
  };

  const submitVisit = (event) => {
    event.preventDefault();
    run(
      () =>
        scheduleVisit(message.id, {
          scheduledAt: new Date(visit.when).toISOString(),
          agentUserId: visit.agentUserId ? Number(visit.agentUserId) : null,
          notes: visit.notes || undefined,
          propertySlug: thread?.property?.slug || undefined,
        }),
      (result) => result.message,
    ).then(() => setVisit((v) => ({ ...v, notes: "" })));
  };

  const saveStage = (event) => {
    event.preventDefault();
    run(
      () =>
        setLeadStage(message.id, {
          stage: stage.value,
          followUpAt: stage.followUpAt ? new Date(stage.followUpAt).toISOString() : null,
          note: stage.note || undefined,
        }),
      () => `Lead moved to "${STAGE_LABEL[stage.value]}".`,
    );
  };

  if (!thread) {
    return <p className="pd-muted">{state.error || "Loading conversation…"}</p>;
  }
  const property = thread.property;
  const assigned = thread.progress?.assigned_agent_user_id ?? "";

  return (
    <div className="th">
      <div className="th-chat" role="log" aria-label="Conversation">
        <div className="th-bubble th-in">
          <small>{message.name} · {formatWhen(message.created_at)}</small>
          {property.slug && (
            <Link className="th-property" to={`/property/${property.slug}`} target="_blank">Property: {property.title}</Link>
          )}
          <p>{message.message.replace(/^\[[^\]]*\]\s*/, "")}</p>
        </div>
        {thread.replies.map((r) => (
          <div className="th-bubble th-out" key={r.id}>
            <small>{r.first_name ? `${r.first_name} (Estate & Co.)` : "Estate & Co."} · {formatWhen(r.created_at)}</small>
            <p>{r.body}</p>
          </div>
        ))}
      </div>

      <form className="th-form" onSubmit={submitReply}>
        <label>
          Reply to {message.name}
          <textarea required minLength={2} maxLength={3000} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thank you for your enquiry. We would be happy to arrange a visit…" />
        </label>
        <button className="ws-btn ws-btn-ok" type="submit" disabled={state.busy}><Send size={15} /> Send reply</button>
        <small className="pd-muted">{message.name} sees your reply in their dashboard and gets a notification.</small>
      </form>

      <form className="th-visits th-stage" onSubmit={saveStage}>
        <h3><Flag size={18} aria-hidden="true" /> Lead stage</h3>
        <div className="th-stage-track" aria-hidden="true">
          {STAGES.slice(0, 5).map(([value]) => (
            <i key={value} className={STAGES.findIndex(([v]) => v === stage.value) >= STAGES.findIndex(([v]) => v === value) && stage.value !== "closed_lost" ? "on" : ""} />
          ))}
        </div>
        <div className="th-visit-form">
          <label>Stage
            <select value={stage.value} onChange={(e) => setStage({ ...stage, value: e.target.value })}>
              {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Follow-up on <small>(optional)</small>
            <input type="datetime-local" value={stage.followUpAt} onChange={(e) => setStage({ ...stage, followUpAt: e.target.value })} />
          </label>
          <label className="th-wide">Follow-up note <small>(optional)</small>
            <input maxLength={300} value={stage.note} onChange={(e) => setStage({ ...stage, note: e.target.value })} placeholder="Ask about budget and financing" />
          </label>
          <button className="ws-btn ws-btn-ok" type="submit" disabled={state.busy}>Save stage</button>
        </div>
        {isAdmin && (
          <label className="th-assign">
            <span><UserRoundCheck size={16} aria-hidden="true" /> Assigned agent</span>
            <select
              value={assigned}
              onChange={(e) => run(() => assignLead(message.id, e.target.value ? Number(e.target.value) : null), () => "Agent assigned and notified.")}
            >
              <option value="">Not assigned</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} ({a.role})</option>)}
            </select>
          </label>
        )}
      </form>

      <div className="th-visits">
        <h3><CalendarCheck size={18} aria-hidden="true" /> Site visits</h3>
        {thread.visits.length > 0 && (
          <ul className="th-visit-list">
            {thread.visits.map((v) => (
              <li key={v.id}>
                <div>
                  <strong>{formatWhen(v.scheduled_at)}</strong>
                  <small>{v.property_title ?? "Property visit"}{v.agent_first ? ` · with ${v.agent_first} ${v.agent_last ?? ""}` : ""}{v.notes ? ` · ${v.notes}` : ""}</small>
                </div>
                <span className={`ws-badge ${v.status === "scheduled" ? "is-pending" : v.status === "completed" ? "is-published" : "is-rejected"}`}>{VISIT_LABEL[v.status]}</span>
                {v.status === "scheduled" && (
                  <span className="ws-row-actions">
                    <button type="button" className="ws-btn" onClick={() => run(() => setVisitStatus(v.id, "completed"))}>Mark done</button>
                    <button type="button" className="ws-btn ws-btn-no" onClick={() => run(() => setVisitStatus(v.id, "cancelled"))}>Cancel</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <form className="th-visit-form" onSubmit={submitVisit}>
          <label>Date &amp; time
            <input type="datetime-local" required value={visit.when} min={localInputValue(new Date())} onChange={(e) => setVisit({ ...visit, when: e.target.value })} />
          </label>
          {isAdmin && (
            <label>Accompanying agent
              <select value={visit.agentUserId} onChange={(e) => setVisit({ ...visit, agentUserId: e.target.value })}>
                <option value="">{assigned ? "Assigned agent" : "No agent assigned"}</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} ({a.role})</option>)}
              </select>
            </label>
          )}
          <label className="th-wide">Note for the customer <small>(optional)</small>
            <input maxLength={500} value={visit.notes} onChange={(e) => setVisit({ ...visit, notes: e.target.value })} placeholder="Meet at the main gate, please carry an ID" />
          </label>
          <button className="ws-btn ws-btn-ok" type="submit" disabled={state.busy}><CalendarCheck size={15} /> Schedule visit</button>
        </form>
      </div>

      {state.ok && <p className="ws-msg ok" role="status">{state.ok}</p>}
      {state.error && <p className="ws-msg bad" role="alert">{state.error}</p>}
    </div>
  );
}

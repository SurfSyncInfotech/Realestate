import { useEffect, useState } from "react";
import { Building2, CalendarCheck, Eye, Handshake, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Empty, Panel, StatGrid } from "./WorkspaceShell.jsx";
import { STAGES } from "./EnquiryThread.jsx";
import { apiErrorMessage, fetchAnalytics } from "../services/auth.js";

// Listings, views, leads by stage and visits. Admins see the whole marketplace,
// agents see their own portfolio.
export default function AnalyticsPanel({ title, subtitle }) {
  const [state, setState] = useState({ data: null, error: "" });

  useEffect(() => {
    fetchAnalytics()
      .then((data) => setState({ data, error: "" }))
      .catch((e) => setState({ data: null, error: apiErrorMessage(e, "Analytics could not be loaded.") }));
  }, []);

  const d = state.data;
  const max = d ? Math.max(1, ...Object.values(d.byStage)) : 1;

  return (
    <Panel title={title} subtitle={subtitle}>
      {state.error && <p className="ws-msg bad" role="alert">{state.error}</p>}
      {d && (
        <>
          <StatGrid
            items={[
              { label: "Listings", value: d.totals.listings, icon: Building2, hint: `${d.totals.live} live` },
              { label: "Property views", value: d.totals.views, icon: Eye },
              { label: "Leads", value: d.totals.leads, icon: Users },
              { label: "Visits booked", value: d.totals.visitsScheduled + d.totals.visitsCompleted, icon: CalendarCheck, hint: `${d.totals.visitsCompleted} completed` },
              { label: "Deals closed", value: d.totals.won, icon: Handshake, hint: `${d.totals.conversion}% of leads` },
            ]}
          />
          <div className="ws-card">
            <h2><TrendingUp size={18} aria-hidden="true" /> Lead pipeline</h2>
            <ul className="an-bars">
              {STAGES.map(([value, label]) => (
                <li key={value}>
                  <span>{label}</span>
                  <div className="an-bar"><i style={{ width: `${(d.byStage[value] / max) * 100}%` }} className={`an-${value}`} /></div>
                  <strong>{d.byStage[value]}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="ws-card">
            <h2>Performance by property</h2>
            {d.properties.length === 0 ? (
              <Empty>No properties yet.</Empty>
            ) : (
              <div className="an-table-wrap">
                <table className="an-table">
                  <thead><tr><th>Property</th><th>Status</th><th>Views</th><th>Leads</th></tr></thead>
                  <tbody>
                    {d.properties.map((p) => (
                      <tr key={p.id}>
                        <td>{p.status === "published" ? <Link to={`/property/${p.id}`}>{p.title}</Link> : p.title}</td>
                        <td><span className={`ws-badge is-${p.status}`}>{p.status}</span></td>
                        <td>{p.views}</td>
                        <td>{p.leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

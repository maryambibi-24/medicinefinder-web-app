import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashShell from "../components/DashShell";
import "./admin.css";

const API = "http://localhost:5000/api/admin";
// is_verified: 0 = waiting, 1 = approved, 2 = rejected
const TABS = [
  { key: 0, label: "Pending" },
  { key: 1, label: "Approved" },
  { key: 2, label: "Rejected" },
];

export default function AdminPharmacies() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  const load = useCallback(async () => {
    try {
      setError("");
      const { data } = await axios.get(`${API}/pharmacies`, { headers: headers() });
      setList(data);
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) {
        localStorage.clear();
        navigate("/login");
      } else {
        setError("Could not load pharmacies. Is the server running?");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id, action) => {
    try {
      setBusyId(id);
      await axios.patch(
        `${API}/pharmacies/${id}`,
        { action, reason: action === "reject" ? reason : undefined },
        { headers: headers() }
      );
      setRejectingId(null);
      setReason("");
      await load();
    } catch {
      setError("Could not update this pharmacy. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const count = (key) => list.filter((p) => Number(p.is_verified) === key).length;
  const shown = list.filter((p) => Number(p.is_verified) === tab);
  const time = (t) => (t ? t.slice(0, 5) : "—");
  const day = (d) => new Date(d).toLocaleDateString();

  return (
    <DashShell tag="Admin">
      <h1>Pharmacy verification</h1>
      <p className="dash-sub">Check each license number, then approve or reject the pharmacy. Pharmacies appear in search only after approval.</p>

      <div className="adm-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? "on" : ""}
            onClick={() => { setTab(t.key); setRejectingId(null); }}
          >
            {t.label} <span>{count(t.key)}</span>
          </button>
        ))}
      </div>

      {error && <div className="adm-error" role="alert">{error}</div>}
      {loading && <p className="adm-empty">Loading…</p>}
      {!loading && !shown.length && !error && (
        <p className="adm-empty">No {TABS[tab].label.toLowerCase()} pharmacies.</p>
      )}

      <div className="adm-list">
        {shown.map((p) => (
          <article className="adm-card" key={p.id}>
            <div className="adm-info">
              <h2>{p.name}</h2>
              <p className="adm-lic">License: <b>{p.license_number}</b></p>
              <p>{p.address}, {p.city}</p>
              <p>Open {time(p.opening_time)} to {time(p.closing_time)}</p>
              <p>
                Location:{" "}
                {p.latitude !== null
                  ? <a href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`} target="_blank" rel="noreferrer">View on map</a>
                  : "Not set"}
              </p>
              <p className="adm-owner">
                Owner: {p.owner_name} · {p.owner_email}{p.owner_phone ? ` · ${p.owner_phone}` : ""}
              </p>
              <p className="adm-date">
                Registered {day(p.created_at)}{p.reviewed_at ? ` · Reviewed ${day(p.reviewed_at)}` : ""}
              </p>
              {Number(p.is_verified) === 2 && p.rejection_reason && (
                <p className="adm-reason">Reason: {p.rejection_reason}</p>
              )}
            </div>

            <div className="adm-actions">
              {rejectingId === p.id ? (
                <div className="adm-reject">
                  <label>
                    Reason (shown to the pharmacy)
                    <textarea
                      rows={3}
                      maxLength={255}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="For example: license number could not be verified"
                    />
                  </label>
                  <div className="adm-row">
                    <button className="adm-no" disabled={busyId === p.id} onClick={() => decide(p.id, "reject")}>
                      Confirm reject
                    </button>
                    <button className="adm-cancel" onClick={() => { setRejectingId(null); setReason(""); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="adm-row">
                  {tab !== 1 && (
                    <button className="adm-ok" disabled={busyId === p.id} onClick={() => decide(p.id, "approve")}>
                      Approve
                    </button>
                  )}
                  {tab !== 2 && (
                    <button className="adm-no" onClick={() => { setRejectingId(p.id); setReason(""); }}>
                      Reject
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </DashShell>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import DashShell from "../components/DashShell";
import PharmacyLocation from "../components/PharmacyLocation";
import PharmacyReservations from "../components/PharmacyReservations";
import PharmacyUrgent from "../components/PharmacyUrgent";
import { API_BASE } from "../api";

const API = `${API_BASE}/pharmacy`;
const time = (t) => (t ? t.slice(0, 5) : "—");
const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");

// Pharmacy dashboard: shows the verification status first, then the pharmacy tools
export default function PharmacyHome() {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const load = useCallback(async (manual = false) => {
    try {
      if (manual) setChecking(true);
      const { data } = await axios.get(`${API}/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setInfo(data);
      setError("");
      // keep the saved login in step with the latest status
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user) localStorage.setItem("user", JSON.stringify({ ...user, verificationStatus: data.status }));
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) {
        localStorage.clear();
        navigate("/login");
      } else {
        setError("Could not load your pharmacy. Is the server running?");
      }
    } finally {
      setChecking(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  // While waiting for the admin, check again every 20 seconds
  const status = info?.status;
  useEffect(() => {
    if (!status || status === "approved") return undefined;
    const t = setInterval(() => load(), 20000);
    return () => clearInterval(t);
  }, [status, load]);

  const facts = info && (
    <ul className="dash-facts">
      <li><b>Pharmacy:</b> {info.name}</li>
      <li><b>License:</b> {info.license_number}</li>
      <li><b>Address:</b> {info.address}, {info.city}</li>
      <li><b>Hours:</b> {time(info.opening_time)} to {time(info.closing_time)}</li>
      <li><b>Registered:</b> {day(info.created_at)}</li>
      {info.reviewed_at && <li><b>Reviewed:</b> {day(info.reviewed_at)}</li>}
    </ul>
  );

  return (
    <DashShell tag="Pharmacy">
      {error && <div className="dash-reason" role="alert">{error}</div>}
      {!info && !error && <p className="dash-sub">Loading…</p>}

      {status === "pending" && (
        <>
          <h1>Verification in progress</h1>
          <p className="dash-sub">The admin is checking your license. You can start using MedFinder as soon as you are approved.</p>
          <div className="dash-card">
            <span className="dash-badge wait">Waiting for review</span>
            <div className="dash-steps">
              <div className="done"><span>✓</span>Details submitted</div>
              <div className="now"><span>2</span>License under review</div>
              <div><span>3</span>Go live and update stock</div>
            </div>
            {facts}
            <button className="dash-btn" onClick={() => load(true)} disabled={checking}>
              {checking ? "Checking…" : "Check status now"}
            </button>
            <p className="dash-note">This page also checks by itself every 20 seconds.</p>
          </div>
        </>
      )}

      {status === "rejected" && (
        <>
          <h1>Registration not approved</h1>
          <div className="dash-card">
            <span className="dash-badge no">Rejected</span>
            <div className="dash-steps">
              <div className="done"><span>✓</span>Details submitted</div>
              <div className="fail"><span>✕</span>License was not approved</div>
            </div>
            {info.rejection_reason && <div className="dash-reason"><b>Reason:</b> {info.rejection_reason}</div>}
            {facts}
            <a className="dash-btn ghost" href="mailto:support@medfinder.example">Contact support</a>
          </div>
        </>
      )}

      {status === "approved" && (
        <>
          <h1>Welcome, {info.name}</h1>
          <p className="dash-sub"><span className="dash-badge ok">Verified</span> Your pharmacy is live and can appear in search.</p>
          <div className="dash-grid">
            <Link className="dash-tile" to="/pharmacy/stock"><b>Stock</b><span>Add medicines, prices and quantities.</span></Link>
            <a className="dash-tile" href="#urgent"><b>Urgent requests</b><span>Reply to people searching nearby.</span></a>
            <a className="dash-tile" href="#reservations"><b>Reservations</b><span>Medicine customers are holding for pickup.</span></a>
          </div>
          <PharmacyUrgent />
          <PharmacyReservations />
          <div className="dash-card"><h2>Your pharmacy</h2>{facts}</div>
        </>
      )}

      {info && status !== "rejected" && <PharmacyLocation latitude={info.latitude} longitude={info.longitude} />}
    </DashShell>
  );
}

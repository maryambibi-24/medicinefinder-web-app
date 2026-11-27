import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashShell from "../components/DashShell";
import Countdown from "../components/Countdown";
import api from "../api";
import usePoll from "../hooks/usePoll";
import { directionsUrl } from "../geo";
import { ago, money } from "../utils";
import "./search.css";
import "../components/reserve.css";

// What happened to a reservation that is no longer active
function outcome(r) {
  if (r.status === "collected") return { label: "Collected", cls: "ok" };
  if (r.status === "expired") return { label: "Time ran out. Units went back to the pharmacy.", cls: "no" };
  return { label: r.cancelled_by === "pharmacy" ? "Cancelled by the pharmacy" : "Cancelled by you", cls: "no" };
}

// Customer page: medicine I am holding, with a countdown, and my past reservations
export default function MyReservations() {
  const navigate = useNavigate();
  const [state, setState] = useState({ items: null, loadedAt: 0, error: "" });
  const [asking, setAsking] = useState(null); // id of the reservation waiting for "Yes, cancel"
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/reservations/mine");
      setState({ items: data, loadedAt: Date.now(), error: "" });
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) { localStorage.clear(); navigate("/login"); return; }
      setState((s) => ({ ...s, error: !err.response ? "Cannot reach the server. Check that the backend is running." : "Could not load your reservations." }));
    }
  }, [navigate]);

  usePoll(load, 15000);

  const cancel = async (id) => {
    setBusy(id);
    setNotice("");
    try {
      await api.post(`/reservations/${id}/cancel`);
      setNotice("Reservation cancelled. The medicine went back to the pharmacy's shelf.");
    } catch (err) {
      setNotice((typeof err.response?.data === "object" && err.response.data.error) || "Could not cancel. Please try again.");
    } finally {
      setBusy(null);
      setAsking(null);
      load();
    }
  };

  const items = state.items || [];
  const active = items.filter((r) => r.status === "active");
  const history = items.filter((r) => r.status !== "active");

  return (
    <DashShell tag="Customer">
      <Link className="srch-back" to="/dashboard">← Back to dashboard</Link>
      <h1>My reservations</h1>
      <p className="dash-sub">Collect your medicine from the pharmacy before the time runs out. You pay at the pharmacy.</p>

      {state.error && <div className="srch-error" role="alert">{state.error}</div>}
      {notice && <div className="rsv-notice" role="status">{notice}</div>}
      {!state.items && !state.error && <p className="dash-sub">Loading…</p>}

      {state.items && active.length === 0 && (
        <div className="dash-card srch-empty">
          <b>You are not holding anything right now.</b>
          <p className="dash-sub">Open a medicine, choose a pharmacy that has it, and press Reserve.</p>
          <Link className="dash-btn ghost" to="/search">Find medicine</Link>
        </div>
      )}

      <div className="srch-list">
        {active.map((r) => (
          <article className="rsv-card" key={r.id}>
            <div className="srch-info">
              <h2>{r.medicine_name} <span>{r.strength}</span> <em>{r.form}</em></h2>
              <p><b>{r.quantity}</b> × {money(r.unit_price)} = <b>{money(r.total)}</b> to pay at the pharmacy</p>
              <p>{r.pharmacy_name}, {r.address}, {r.city}</p>
              <p className="srch-links">
                {r.pharmacy_phone && <a href={`tel:${r.pharmacy_phone}`}>Call {r.pharmacy_phone}</a>}
                {r.latitude !== null && <a href={directionsUrl(r.latitude, r.longitude)} target="_blank" rel="noreferrer">Get directions</a>}
              </p>
            </div>
            <div className="rsv-side">
              <span className="rsv-label">Time left to collect</span>
              <Countdown secondsLeft={r.seconds_left} loadedAt={state.loadedAt} onDone={load} />
              {asking === r.id ? (
                <div className="rsv-actions">
                  <button type="button" className="rsv-btn danger" onClick={() => cancel(r.id)} disabled={busy === r.id}>
                    {busy === r.id ? "Cancelling…" : "Yes, cancel"}
                  </button>
                  <button type="button" className="rsv-btn ghost" onClick={() => setAsking(null)}>Keep it</button>
                </div>
              ) : (
                <button type="button" className="rsv-btn ghost" onClick={() => setAsking(r.id)}>Cancel reservation</button>
              )}
            </div>
          </article>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <h2>Past reservations</h2>
          <div className="srch-list">
            {history.map((r) => {
              const o = outcome(r);
              return (
                <article className="srch-ph out" key={r.id}>
                  <div className="srch-info">
                    <h2>{r.medicine_name} <span>{r.strength}</span> <em>{r.form}</em></h2>
                    <p>{r.quantity} × {money(r.unit_price)} at {r.pharmacy_name} · {ago(r.created_at)}</p>
                  </div>
                  <div className="srch-price"><span className={`dash-badge ${o.cls}`}>{o.label}</span></div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </DashShell>
  );
}

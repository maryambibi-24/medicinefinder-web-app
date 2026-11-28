import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashShell from "../components/DashShell";
import Countdown from "../components/Countdown";
import PinPicker from "../components/PinPicker";
import useMyLocation from "../hooks/useMyLocation";
import usePoll from "../hooks/usePoll";
import api from "../api";
import { directionsUrl, distanceLabel } from "../geo";
import { ago } from "../utils";
import "./search.css";
import "../components/reserve.css";
import "../components/urgent.css";

const RADII = [1, 2, 5, 10, 25];

// Customer page: ask the pharmacies around me for a medicine, and see who answers
export default function UrgentRequest() {
  const navigate = useNavigate();
  const [loc, setLoc] = useMyLocation();
  const [form, setForm] = useState({ medicineName: "", quantity: "1", radius: "5" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [state, setState] = useState({ items: null, loadedAt: 0, error: "" });
  const [asking, setAsking] = useState(null);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/urgent/mine");
      setState({ items: data, loadedAt: Date.now(), error: "" });
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) { localStorage.clear(); navigate("/login"); return; }
      setState((s) => ({ ...s, error: !err.response ? "Cannot reach the server. Check that the backend is running." : "Could not load your requests." }));
    }
  }, [navigate]);

  // New answers show up by themselves
  usePoll(load, 10000);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    const name = form.medicineName.trim();
    const qty = Number(form.quantity);
    if (name.length < 2) return setError("Enter the name of the medicine.");
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) return setError("Quantity must be a whole number from 1 to 50.");
    if (!loc) return setError("Share your location or click the map, so we know which pharmacies are near you.");

    setBusy(true);
    try {
      const { data } = await api.post("/urgent", { medicineName: name, quantity: qty, radius: Number(form.radius), lat: loc.lat, lng: loc.lng });
      setNotice(`Sent to ${data.notified_count} ${data.notified_count === 1 ? "pharmacy" : "pharmacies"} within ${form.radius} km. Answers appear below.`);
      setForm({ ...form, medicineName: "" });
      load();
    } catch (err) {
      setError(!err.response
        ? "Cannot reach the server. Check that the backend is running."
        : (typeof err.response.data === "object" && err.response.data.error) || "Could not send the request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const close = async (id) => {
    try {
      await api.post(`/urgent/${id}/close`);
      setNotice("Request closed. Your location was removed from it.");
    } catch (err) {
      setNotice((typeof err.response?.data === "object" && err.response.data.error) || "Could not close the request.");
    } finally {
      setAsking(null);
      load();
    }
  };

  const items = state.items || [];

  return (
    <DashShell tag="Customer">
      <Link className="srch-back" to="/dashboard">← Back to dashboard</Link>
      <h1>Urgent request</h1>
      <p className="dash-sub">Cannot find a medicine? Ask the pharmacies near you. Each one answers Available or Not available.</p>
      <p className="urg-safety">In a medical emergency, call your local emergency number first. This page does not replace that.</p>

      <form className="rsv-form" onSubmit={submit} aria-label="New urgent request">
        <h3>What do you need?</h3>
        <div className="rsv-fields">
          <label className="rsv-field" style={{ flex: "2 1 260px" }}>
            Medicine name
            <input type="text" value={form.medicineName} onChange={set("medicineName")} maxLength={100} placeholder="e.g. Insulin, or Panadol 500 mg" />
          </label>
          <label className="rsv-field">
            Quantity
            <input type="number" min="1" max="50" step="1" inputMode="numeric" value={form.quantity} onChange={set("quantity")} />
          </label>
          <label className="rsv-field">
            Search radius
            <select value={form.radius} onChange={set("radius")}>
              {RADII.map((r) => <option key={r} value={r}>Within {r} km</option>)}
            </select>
          </label>
        </div>

        <div>
          <b style={{ fontSize: 14 }}>Where are you?</b>
          <PinPicker
            value={loc}
            onChange={(v) => v && setLoc(v)}
            allowRemove={false}
            height={240}
            hint="Use your location, or click the map to choose the spot to search around."
          />
        </div>

        <p className="urg-privacy">
          Pharmacies see only how far away you are, not your name or exact position. Your position is deleted from the
          request when it closes. A request stays open for 2 hours.
        </p>

        {error && <p className="rsv-error" role="alert">{error}</p>}
        {notice && <p className="rsv-notice" role="status">{notice}</p>}

        <div className="rsv-actions">
          <button type="submit" className="rsv-btn" disabled={busy}>{busy ? "Sending…" : "Send urgent request"}</button>
        </div>
      </form>

      <h2>My requests</h2>
      {state.error && <div className="srch-error" role="alert">{state.error}</div>}
      {!state.items && !state.error && <p className="dash-sub">Loading…</p>}
      {state.items && items.length === 0 && <p className="dash-sub">You have not sent a request yet.</p>}

      <div className="srch-list">
        {items.map((r) => {
          const open = r.status === "open";
          return (
            <article className={`urg-card${open ? "" : " closed"}`} key={r.id}>
              <div className="urg-head">
                <div>
                  <h2>{r.quantity} × {r.medicine_name}</h2>
                  <p>
                    Sent {ago(r.created_at)} to {r.notified_count} {r.notified_count === 1 ? "pharmacy" : "pharmacies"} within {r.radius_km} km
                  </p>
                </div>
                <div className="urg-time">
                  {open ? (
                    <>
                      <span className="rsv-label">Open for another</span>
                      <Countdown secondsLeft={r.seconds_left} loadedAt={state.loadedAt} onDone={load} />
                    </>
                  ) : (
                    <span className="dash-badge no">{r.status === "closed" ? "Closed" : "Time ran out"}</span>
                  )}
                </div>
              </div>

              {r.available.length > 0 ? (
                <ul className="urg-replies" aria-label="Pharmacies that have it">
                  {r.available.map((a) => (
                    <li className="urg-reply" key={a.pharmacy_id}>
                      <b>{a.name} has it</b>
                      <span>
                        {a.distance_km !== null && <><span className="geo-dist">{distanceLabel(a.distance_km)}</span>{" · "}</>}
                        {a.address}, {a.city}
                      </span>
                      <span className="urg-links">
                        {a.phone && <a href={`tel:${a.phone}`}>Call {a.phone}</a>}
                        {a.latitude !== null && <a href={directionsUrl(a.latitude, a.longitude)} target="_blank" rel="noreferrer">Get directions</a>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="urg-wait">
                  {open ? "No pharmacy has said it has it yet. This page updates by itself." : "No pharmacy said it had it."}
                </p>
              )}

              <p className="urg-summary">
                {r.not_available_count} said not available
                {open && r.waiting_count > 0 && ` · ${r.waiting_count} still to answer`}
              </p>

              {open && (asking === r.id ? (
                <div className="rsv-actions">
                  <button type="button" className="rsv-btn danger" onClick={() => close(r.id)}>Yes, close it</button>
                  <button type="button" className="rsv-btn ghost" onClick={() => setAsking(null)}>Keep it open</button>
                </div>
              ) : (
                <div className="rsv-actions">
                  <button type="button" className="rsv-btn ghost" onClick={() => setAsking(r.id)}>I found it, close this request</button>
                </div>
              ))}
            </article>
          );
        })}
      </div>
    </DashShell>
  );
}

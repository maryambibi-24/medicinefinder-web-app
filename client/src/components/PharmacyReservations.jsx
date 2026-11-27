import { useCallback, useState } from "react";
import api from "../api";
import Countdown from "./Countdown";
import usePoll from "../hooks/usePoll";
import { money } from "../utils";
import "./reserve.css";

// Pharmacy dashboard: medicine that customers are holding. Mark it collected or cancel it.
export default function PharmacyReservations() {
  const [state, setState] = useState({ items: null, loadedAt: 0, error: "" });
  const [busy, setBusy] = useState(null);
  const [asking, setAsking] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/reservations/pharmacy");
      setState({ items: data, loadedAt: Date.now(), error: "" });
    } catch {
      setState((s) => ({ ...s, error: "Could not load reservations." }));
    }
  }, []);

  usePoll(load, 15000);

  const act = async (id, action) => {
    setBusy(id);
    setNotice("");
    try {
      await api.post(`/reservations/pharmacy/${id}/${action}`);
      setNotice(action === "collected" ? "Marked as collected." : "Reservation cancelled. The units are back in your stock.");
    } catch (err) {
      setNotice((typeof err.response?.data === "object" && err.response.data.error) || "That did not work. Please try again.");
    } finally {
      setBusy(null);
      setAsking(null);
      load();
    }
  };

  const items = state.items || [];

  return (
    <div className="dash-card" id="reservations">
      <h2>Reservations {items.length > 0 && <span className="dash-badge wait">{items.length} waiting</span>}</h2>
      <p className="dash-sub">
        Customers who are holding medicine and will come to collect it. Held units are already taken out of your stock
        count, and they return to stock if the time runs out.
      </p>

      {state.error && <div className="dash-reason" role="alert">{state.error}</div>}
      {notice && <div className="rsv-notice" role="status">{notice}</div>}
      {!state.items && !state.error && <p className="dash-note">Loading…</p>}
      {state.items && items.length === 0 && <p className="dash-note">Nothing is being held right now.</p>}

      <div className="rsv-rows">
        {items.map((r) => (
          <div className="rsv-row" key={r.id}>
            <div>
              <b>{r.quantity} × {r.medicine_name} {r.strength}</b> <em>{r.form}</em>
              <p>
                {r.customer_name}
                {r.customer_phone && <> · <a href={`tel:${r.customer_phone}`}>{r.customer_phone}</a></>}
                {" · "}{money(r.total)} to collect
              </p>
            </div>
            <div className="rsv-side">
              <span className="rsv-label">Time left</span>
              <Countdown secondsLeft={r.seconds_left} loadedAt={state.loadedAt} onDone={load} />
              {asking === r.id ? (
                <div className="rsv-actions">
                  <button type="button" className="rsv-btn danger" disabled={busy === r.id} onClick={() => act(r.id, "cancel")}>Yes, cancel</button>
                  <button type="button" className="rsv-btn ghost" onClick={() => setAsking(null)}>Keep it</button>
                </div>
              ) : (
                <div className="rsv-actions">
                  <button type="button" className="rsv-btn" disabled={busy === r.id} onClick={() => act(r.id, "collected")}>
                    {busy === r.id ? "Saving…" : "Mark collected"}
                  </button>
                  <button type="button" className="rsv-btn ghost" onClick={() => setAsking(r.id)}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

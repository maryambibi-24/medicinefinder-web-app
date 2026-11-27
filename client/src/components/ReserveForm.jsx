import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Countdown from "./Countdown";
import { money } from "../utils";
import "./reserve.css";

const HOLDS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];
const MAX_QTY = 20;

// Opens under a pharmacy: choose how many units and how long to hold them.
// p is one pharmacy row from the medicine page.
export default function ReserveForm({ p, medicineName, onClose, onReserved }) {
  const max = Math.min(p.quantity, MAX_QTY);
  const [quantity, setQuantity] = useState("1");
  const [hold, setHold] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // { secondsLeft, loadedAt } after a successful reservation

  const qty = Number(quantity);
  const validQty = Number.isInteger(qty) && qty >= 1 && qty <= max;

  const submit = async (e) => {
    e.preventDefault();
    if (!validQty) return setError(`Enter a quantity from 1 to ${max}.`);
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/reservations", { stockId: p.stock_id, quantity: qty, holdMinutes: Number(hold) });
      setDone({ secondsLeft: data.seconds_left, loadedAt: Date.now() });
      onReserved?.();
    } catch (err) {
      setError(!err.response
        ? "Cannot reach the server. Check that the backend is running."
        : (typeof err.response.data === "object" && err.response.data.error) || "Could not reserve. Please try again.");
      onReserved?.(); // the stock may have changed, so show the latest numbers
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <section className="rsv-form rsv-done" role="status" aria-label="Reservation confirmed">
        <h3>Reserved: {qty} × {medicineName}</h3>
        <p>
          {p.pharmacy_name} is holding it for you. Collect it before the time runs out, and pay at the pharmacy.
        </p>
        <p className="rsv-bigclock">
          <span>Time left</span>
          <Countdown secondsLeft={done.secondsLeft} loadedAt={done.loadedAt} />
        </p>
        <div className="rsv-actions">
          <Link className="rsv-btn" to="/reservations">View my reservations</Link>
          <button type="button" className="rsv-btn ghost" onClick={onClose}>Close</button>
        </div>
      </section>
    );
  }

  return (
    <form className="rsv-form" onSubmit={submit} aria-label={`Reserve at ${p.pharmacy_name}`}>
      <h3>Reserve at {p.pharmacy_name}</h3>
      <div className="rsv-fields">
        <label className="rsv-field">
          Quantity
          <input type="number" min="1" max={max} step="1" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <small>{p.quantity} in stock{p.quantity > MAX_QTY ? `, up to ${MAX_QTY} per reservation` : ""}</small>
        </label>
        <label className="rsv-field">
          Hold it for
          <select value={hold} onChange={(e) => setHold(e.target.value)}>
            {HOLDS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>
          <small>The countdown starts when you confirm.</small>
        </label>
      </div>

      <p className="rsv-total">
        {validQty ? <>Total to pay at the pharmacy: <b>{money(qty * p.price)}</b></> : "Enter a quantity to see the total."}
      </p>
      <p className="rsv-note">
        The units are taken out of the pharmacy's stock for you. If you do not collect them in time, they go back on the shelf.
      </p>

      {error && <p className="rsv-error" role="alert">{error}</p>}

      <div className="rsv-actions">
        <button type="submit" className="rsv-btn" disabled={busy || !validQty}>{busy ? "Reserving…" : "Confirm reservation"}</button>
        <button type="button" className="rsv-btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

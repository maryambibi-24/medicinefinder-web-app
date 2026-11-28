import { useCallback, useState } from "react";
import api from "../api";
import Countdown from "./Countdown";
import usePoll from "../hooks/usePoll";
import { distanceLabel } from "../geo";
import "./reserve.css";
import "./urgent.css";

// Pharmacy dashboard: people nearby asking for a medicine. One tap answers.
export default function PharmacyUrgent() {
  const [state, setState] = useState({ items: null, needsPin: false, loadedAt: 0, error: "" });
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/urgent/incoming");
      setState({ items: data.requests, needsPin: data.needsPin, loadedAt: Date.now(), error: "" });
    } catch {
      setState((s) => ({ ...s, error: "Could not load urgent requests." }));
    }
  }, []);

  // Checks for new requests every 10 seconds
  usePoll(load, 10000);

  const answer = async (id, value) => {
    setBusy(id);
    setNotice("");
    try {
      await api.post(`/urgent/${id}/reply`, { answer: value });
      // Show the answer at once, then confirm with the server
      setState((s) => ({ ...s, items: s.items.map((r) => (r.id === id ? { ...r, my_answer: value } : r)) }));
    } catch (err) {
      setNotice((typeof err.response?.data === "object" && err.response.data.error) || "That did not work. Please try again.");
    } finally {
      setBusy(null);
      load();
    }
  };

  const items = state.items || [];
  const unanswered = items.filter((r) => !r.my_answer).length;

  return (
    <div className="dash-card" id="urgent">
      <h2>
        Urgent requests{" "}
        {unanswered > 0 && <span className="dash-badge wait">{unanswered} new</span>}
      </h2>
      <p className="dash-sub">
        People near you who cannot find a medicine. Tap Available if you have it, or Not available. You only see requests
        whose search distance reaches your pharmacy, and only how far away each person is.
      </p>

      {state.error && <div className="dash-reason" role="alert">{state.error}</div>}
      {notice && <div className="rsv-notice" role="status">{notice}</div>}

      {state.needsPin && (
        <div className="rsv-notice" role="status">
          Your pharmacy has no pin on the map, so no requests can reach you. <a href="#location">Place your pin below</a>.
        </div>
      )}

      {!state.items && !state.error && <p className="dash-note">Loading…</p>}
      {state.items && !state.needsPin && items.length === 0 && <p className="dash-note">No open requests near you right now. This list checks by itself.</p>}

      <div className="urg-rows">
        {items.map((r) => (
          <div className={`urg-row${r.my_answer ? " answered" : ""}`} key={r.id}>
            <div>
              <b>{r.quantity} × {r.medicine_name}</b>
              <p>{r.distance_km !== null && <span className="geo-dist">{distanceLabel(r.distance_km)}</span>} · searching within {r.radius_km} km</p>
              <p>Open for another <Countdown secondsLeft={r.seconds_left} loadedAt={state.loadedAt} onDone={load} /></p>
            </div>
            <div className="urg-answer">
              <div className="urg-btns" role="group" aria-label={`Answer for ${r.medicine_name}`}>
                <button type="button" className="urg-btn yes" aria-pressed={r.my_answer === "available"} disabled={busy === r.id} onClick={() => answer(r.id, "available")}>Available</button>
                <button type="button" className="urg-btn no" aria-pressed={r.my_answer === "not_available"} disabled={busy === r.id} onClick={() => answer(r.id, "not_available")}>Not available</button>
              </div>
              {r.my_answer && (
                <p className="urg-said">
                  You answered: <b>{r.my_answer === "available" ? "Available" : "Not available"}</b>. Tap the other button to change it.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

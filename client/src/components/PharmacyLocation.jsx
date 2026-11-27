import { useState } from "react";
import api from "../api";
import PinPicker from "./PinPicker";
import "./geo.css";

// Pharmacy dashboard card: place or move the pharmacy's pin on the map
export default function PharmacyLocation({ latitude, longitude }) {
  const start = latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : null;
  const [pin, setPin] = useState(start);
  const [saved, setSaved] = useState(start);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const same = (a, b) => (!a && !b) || (a && b && a.lat === b.lat && a.lng === b.lng);
  const changed = !same(pin, saved);

  const save = async () => {
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      const body = pin
        ? { latitude: Number(pin.lat.toFixed(6)), longitude: Number(pin.lng.toFixed(6)) }
        : { latitude: null, longitude: null };
      await api.put("/pharmacy/me/location", body);
      setSaved(pin ? { lat: body.latitude, lng: body.longitude } : null);
      setMsg({ type: "ok", text: pin ? "Location saved." : "Location removed." });
    } catch (err) {
      const text = !err.response
        ? "Cannot reach the server. Check that the backend is running."
        : err.response.data?.error || "Could not save the location. Restart the server after updating, then try again.";
      setMsg({ type: "err", text });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dash-card geo-card">
      <h2>Location on the map</h2>
      <p className="dash-sub">
        Customers see how far away you are and can search by distance. Place the pin on your shop entrance.
      </p>

      {!saved && <div className="geo-notice" role="status" style={{ marginTop: 12 }}>
        Your pharmacy has no pin yet, so customers cannot find you by distance.
      </div>}

      <PinPicker value={pin} onChange={(v) => { setPin(v); setMsg({ type: "", text: "" }); }} height={300} />

      <div className="geo-row" style={{ marginTop: 12 }}>
        <button type="button" className="geo-btn" onClick={save} disabled={busy || !changed}>
          {busy ? "Saving…" : "Save location"}
        </button>
        {msg.type === "ok" && <p className="geo-saved" role="status">{msg.text}</p>}
        {msg.type === "err" && <p className="geo-msg" role="alert">{msg.text}</p>}
      </div>
    </div>
  );
}

import { useState } from "react";
import api from "../api";
import { LazyMapPicker } from "./LazyMap";

// Pharmacy dashboard card: set or change where the shop is on the map
export default function PharmacyLocation({ latitude, longitude, onSaved }) {
  const hasSaved = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;
  const [point, setPoint] = useState(hasSaved ? { lat: latitude, lng: longitude } : null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const changed = !!point && (!hasSaved || Math.abs(point.lat - latitude) > 1e-6 || Math.abs(point.lng - longitude) > 1e-6);

  const save = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await api.put("/pharmacy/location", { latitude: point.lat, longitude: point.lng });
      setMessage({ type: "ok", text: "Location saved. Customers can now see how far you are." });
      if (onSaved) onSaved();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Could not save the location." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash-card">
      <h2>Shop location</h2>
      <p className="dash-sub">Customers see how far your pharmacy is from them, and find you on the map.</p>
      {!hasSaved && (
        <div className="srch-banner" role="status">
          <b>Your location is not set yet.</b> Customers cannot see how far you are until you save it.
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <LazyMapPicker value={point} onChange={setPoint} height={300} />
      </div>
      {message.text && (
        <div className={message.type === "ok" ? "stk-notice" : "stk-error"} role="status" style={{ marginTop: 12 }}>{message.text}</div>
      )}
      <button className="dash-btn" onClick={save} disabled={saving || !changed}>
        {saving ? "Saving…" : "Save location"}
      </button>
    </div>
  );
}

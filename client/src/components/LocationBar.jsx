import { useState } from "react";
import { askBrowserLocation } from "../location";
import { LazyMapPicker } from "./LazyMap";

const RADII = [1, 2, 5, 10, 25];

// Lets a customer share or choose their location, and pick how far to search
export default function LocationBar({ loc, onChange, radius, onRadius }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);

  const useMine = async () => {
    setBusy(true);
    setError("");
    try {
      onChange(await askBrowserLocation());
    } catch (err) {
      setError(err.message);
      setPicking(true); // offer the map as the next best option
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dash-card loc-bar">
      <div className="loc-row">
        <div className="loc-text">
          <b>{loc ? "Distances are measured from your location" : "See how far each pharmacy is"}</b>
          <span>{loc ? "Your location stays in this browser." : "Share your location, or choose a place on the map."}</span>
        </div>
        <div className="loc-actions">
          <button type="button" className="loc-btn primary" onClick={useMine} disabled={busy}>
            {busy ? "Locating…" : loc ? "Update my location" : "Use my location"}
          </button>
          <button type="button" className="loc-btn" onClick={() => setPicking(!picking)} aria-expanded={picking}>
            {picking ? "Hide map" : "Choose on map"}
          </button>
          {loc && (
            <button type="button" className="loc-btn" onClick={() => { onChange(null); setPicking(false); }}>Clear</button>
          )}
          {loc && onRadius && (
            <label className="loc-radius">
              Within
              <select value={radius} onChange={(e) => onRadius(e.target.value)}>
                <option value="">Any distance</option>
                {RADII.map((r) => <option key={r} value={r}>{r} km</option>)}
              </select>
            </label>
          )}
        </div>
      </div>
      {error && <p className="srch-error" role="alert">{error}</p>}
      {picking && <LazyMapPicker value={loc} onChange={onChange} height={280} />}
    </div>
  );
}

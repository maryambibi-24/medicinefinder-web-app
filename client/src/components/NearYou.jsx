import { useState } from "react";
import PinPicker from "./PinPicker";
import { getPosition, locateMessage } from "../geo";
import "./geo.css";

const RADII = [1, 2, 5, 10, 25];

// Lets a customer share or choose a location and pick a search radius.
//   loc / onLoc:       { lat, lng } or null
//   radius / onRadius: kilometres as text, "" means any distance
export default function NearYou({ loc, onLoc, radius, onRadius }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const useMine = async () => {
    setMsg("");
    setBusy(true);
    try {
      onLoc(await getPosition());
    } catch (err) {
      setMsg(locateMessage(err));
      setOpen(true); // fall back to choosing on the map
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    onLoc(null);
    onRadius("");
    setOpen(false);
  };

  return (
    <section className="dash-card geo-near" aria-label="Your location">
      {loc ? (
        <div className="geo-row geo-between">
          <p className="geo-text">
            <b>Showing distances from your location.</b>
            <span>Straight-line distance, not road distance.</span>
          </p>
          <label className="srch-field geo-radius">
            Distance
            <select value={radius} onChange={(e) => onRadius(e.target.value)}>
              <option value="">Any distance</option>
              {RADII.map((r) => <option key={r} value={r}>Within {r} km</option>)}
            </select>
          </label>
          <button type="button" className="geo-btn ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "Close map" : "Change location"}
          </button>
          <button type="button" className="geo-btn ghost" onClick={clear}>Clear</button>
        </div>
      ) : (
        <div className="geo-row geo-between">
          <p className="geo-text">
            <b>Find medicine near you.</b>
            <span>Share your location to see distances and filter by radius.</span>
          </p>
          <button type="button" className="geo-btn" onClick={useMine} disabled={busy}>{busy ? "Finding you…" : "Use my location"}</button>
          <button type="button" className="geo-btn ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "Close map" : "Choose on map"}
          </button>
        </div>
      )}

      {msg && <p className="geo-msg" role="alert">{msg}</p>}

      {open && (
        <PinPicker
          value={loc}
          onChange={(v) => v && onLoc(v)}
          allowRemove={false}
          locateLabel="Use my current location"
          hint="Click the map to choose where to search from."
          height={280}
        />
      )}

      <p className="geo-privacy">
        Your location stays in this browser. It is sent to the server only to work out distances and is not saved.
        {loc && radius ? " Pharmacies that have not placed a pin on the map are not shown when you pick a distance." : ""}
      </p>
    </section>
  );
}

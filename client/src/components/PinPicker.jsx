import { useState } from "react";
import MapView from "./MapView";
import { getPosition, locateMessage } from "../geo";
import "./geo.css";

// Choose a spot: use the device position, or click or drag on the map.
// value is { lat, lng } or null. onChange gets the new value.
export default function PinPicker({ value, onChange, locateLabel = "Use my current location", allowRemove = true, hint, height = 300 }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const locate = async () => {
    setMsg("");
    setBusy(true);
    try {
      onChange(await getPosition());
    } catch (err) {
      setMsg(locateMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="geo-picker">
      <div className="geo-row">
        <button type="button" className="geo-btn" onClick={locate} disabled={busy}>
          {busy ? "Finding you…" : locateLabel}
        </button>
        {allowRemove && value && (
          <button type="button" className="geo-btn ghost" onClick={() => onChange(null)}>Remove pin</button>
        )}
      </div>
      {msg && <p className="geo-msg" role="alert">{msg}</p>}
      <MapView pick={value} onPick={onChange} height={height} label="Map. Click to place the pin." />
      <p className="geo-hint">
        {value
          ? `Pin placed at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}. Click the map or drag the pin to move it.`
          : hint || "Click the map to place a pin, or use your current location."}
      </p>
    </div>
  );
}

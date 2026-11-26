import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { askBrowserLocation } from "../location";
import "./map.css";

const pin = L.divIcon({ className: "mf-pin", html: "<span></span>", iconSize: [30, 30], iconAnchor: [15, 30] });
const PAKISTAN = [30.3753, 69.3451];

function Clicks({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Moves the map when a place was found or shared (not while dragging the pin)
function Focus({ target }) {
  const map = useMap();
  useEffect(() => { if (target) map.setView([target.lat, target.lng], 16); }, [target, map]);
  return null;
}

// Choose a place: click the map, drag the pin, share the current location or search an address
export default function MapPicker({ value, onChange, height = 300 }) {
  const [focus, setFocus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  const useMine = async () => {
    setBusy(true);
    setMessage("");
    try {
      const p = await askBrowserLocation();
      onChange(p);
      setFocus({ ...p });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const find = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query.trim())}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      if (!data.length) {
        setMessage("Place not found. Try a larger area, or click the map.");
      } else {
        const p = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
        onChange(p);
        setFocus({ ...p });
      }
    } catch {
      setMessage("Could not search for that place. Click the map instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mf-picker">
      <div className="mf-picker-bar">
        <button type="button" className="mf-btn primary" onClick={useMine} disabled={busy}>Use my current location</button>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); find(); } }}
          placeholder="Or search a place, e.g. Gulberg Lahore"
          aria-label="Search for a place"
        />
        <button type="button" className="mf-btn" onClick={find} disabled={busy || !query.trim()}>Search</button>
      </div>

      <div className="mf-map" style={{ height }} aria-label="Map: click to choose a place">
        <MapContainer
          center={value ? [value.lat, value.lng] : PAKISTAN}
          zoom={value ? 16 : 5}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Clicks onPick={(p) => { setMessage(""); onChange(p); }} />
          <Focus target={focus} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pin}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  onChange({ lat: ll.lat, lng: ll.lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {message && <p className="mf-msg" role="alert">{message}</p>}
      <p className="mf-hint">
        {value
          ? `Selected: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}. Click the map or drag the pin to adjust.`
          : "Click the map to place the pin."}
      </p>
    </div>
  );
}

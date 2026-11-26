import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./map.css";

const COLORS = { ok: "#15803d", wait: "#b45309", no: "#64748b" };

// Zooms the map so every pharmacy (and the customer) is visible
function Fit({ points, me }) {
  const map = useMap();
  const key = JSON.stringify([points.map((p) => [p.lat, p.lng]), me]);
  useEffect(() => {
    const all = [...points.map((p) => [p.lat, p.lng]), ...(me ? [[me.lat, me.lng]] : [])];
    if (!all.length) return;
    if (all.length === 1) map.setView(all[0], 15);
    else map.fitBounds(all, { padding: [30, 30], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

// points: [{ id, lat, lng, title, text, tone: "ok" | "wait" | "no" }]; me: { lat, lng } or null
export default function MapView({ points, me, height = 340 }) {
  return (
    <div className="mf-map" style={{ height }} aria-label="Map of pharmacies">
      <MapContainer center={[30.3753, 69.3451]} zoom={5} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Fit points={points} me={me} />
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={11}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: COLORS[p.tone] || COLORS.ok, fillOpacity: 1 }}
          >
            <Popup><b>{p.title}</b><br />{p.text}</Popup>
          </CircleMarker>
        ))}
        {me && (
          <CircleMarker center={[me.lat, me.lng]} radius={8} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#1d4ed8", fillOpacity: 1 }}>
            <Popup>You are here</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

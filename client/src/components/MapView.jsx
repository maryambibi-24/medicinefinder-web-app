import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_CENTER } from "../geo";
import "./geo.css";

// Pins are drawn with CSS, so no image files are needed
const pinIcon = (tone) =>
  L.divIcon({
    className: "geo-pin-wrap",
    html: `<span class="geo-pin ${tone}"></span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });
const meIcon = L.divIcon({ className: "geo-pin-wrap", html: '<span class="geo-me"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });

// Popup built from plain text nodes, so a pharmacy name can never inject HTML
function popupNode(m) {
  const box = document.createElement("div");
  box.className = "geo-pop";
  const title = document.createElement("b");
  title.textContent = m.title;
  box.append(title);
  (m.lines || []).forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    box.append(p);
  });
  if (m.href) {
    const a = document.createElement("a");
    a.href = m.href;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = "Get directions";
    box.append(a);
  }
  return box;
}

// An OpenStreetMap map.
//   markers: [{ lat, lng, tone: "ok" | "wait" | "no", title, lines, href }]
//   me:      the customer's position (blue dot)
//   pick:    a draggable pin, used when someone chooses a spot (needs onPick)
export default function MapView({ markers = [], me = null, pick = null, onPick, height = 320, label = "Map" }) {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const pickRef = useRef(onPick);

  useEffect(() => { pickRef.current = onPick; });

  // Create the map once
  useEffect(() => {
    const m = L.map(box.current).setView(DEFAULT_CENTER, 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;

    // The mouse wheel zooms the map only after it was clicked, so scrolling the page never gets stuck
    m.scrollWheelZoom.disable();
    m.on("focus", () => m.scrollWheelZoom.enable());
    m.on("blur mouseout", () => m.scrollWheelZoom.disable());
    m.on("click", (e) => pickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));

    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // Redraw the pins only when their content really changes
  const sig = JSON.stringify({ markers, me, pick });
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const data = JSON.parse(sig);
    layer.current.clearLayers();
    const points = [];

    data.markers.forEach((mk) => {
      L.marker([mk.lat, mk.lng], { icon: pinIcon(mk.tone || "ok"), title: mk.title, alt: mk.title })
        .bindPopup(() => popupNode(mk))
        .addTo(layer.current);
      points.push([mk.lat, mk.lng]);
    });

    if (data.me) {
      L.marker([data.me.lat, data.me.lng], { icon: meIcon, title: "Your location", alt: "Your location", keyboard: false }).addTo(layer.current);
      points.push([data.me.lat, data.me.lng]);
    }

    if (data.pick) {
      L.marker([data.pick.lat, data.pick.lng], { icon: pinIcon("draft"), draggable: true, title: "Drag to move", alt: "Selected location" })
        .on("dragend", (e) => {
          const p = e.target.getLatLng();
          pickRef.current?.({ lat: p.lat, lng: p.lng });
        })
        .addTo(layer.current);
      points.push([data.pick.lat, data.pick.lng]);
    }

    if (points.length > 1) m.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    else if (points.length === 1) m.setView(points[0], Math.max(m.getZoom(), 15));
  }, [sig]);

  return <div ref={box} className={`geo-map${onPick ? " pickable" : ""}`} style={{ height }} role="region" aria-label={label} />;
}

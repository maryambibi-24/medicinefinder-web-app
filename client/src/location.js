// The customer's location is kept only in this browser (localStorage).
// It is sent to the server only to work out distances, and is never stored there.
import { useState } from "react";

const KEY = "mf_location";

export function getSavedLocation() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && Number.isFinite(v.lat) && Number.isFinite(v.lng)) return { lat: v.lat, lng: v.lng };
  } catch { /* nothing saved */ }
  return null;
}

export function useMyLocation() {
  const [loc, setLoc] = useState(getSavedLocation);
  const update = (next) => {
    if (next) localStorage.setItem(KEY, JSON.stringify({ lat: next.lat, lng: next.lng }));
    else localStorage.removeItem(KEY);
    setLoc(next);
  };
  return [loc, update];
}

// Asks the browser for the current position (the person must allow it)
export function askBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Your browser cannot share its location. Choose a place on the map instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(
        err.code === 1
          ? "Location permission was denied. You can choose a place on the map instead."
          : "Could not get your location. You can choose a place on the map instead."
      )),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

// 0.8 -> "0.8 km", 0.05 -> "under 100 m", 12.4 -> "12 km"
export function formatKm(km) {
  if (km === null || km === undefined) return "";
  if (km < 0.1) return "under 100 m";
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

export const directionsLink = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

// Lat/lng sent to the server: 5 decimals is about 1 metre, plenty for distances
export const coord = (n) => Number(n).toFixed(5);

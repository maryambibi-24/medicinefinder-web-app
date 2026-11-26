import { useCallback, useState } from "react";

// The customer's chosen location. It is kept only in this browser (never saved on the server).
const KEY = "myLocation";

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return v && Number.isFinite(v.lat) && Number.isFinite(v.lng) ? { lat: v.lat, lng: v.lng } : null;
  } catch {
    return null;
  }
}

export default function useMyLocation() {
  const [loc, setLocState] = useState(read);
  const setLoc = useCallback((next) => {
    setLocState(next);
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify({ lat: next.lat, lng: next.lng }));
      else localStorage.removeItem(KEY);
    } catch {
      /* storage blocked: the location still works until the page is closed */
    }
  }, []);
  return [loc, setLoc];
}

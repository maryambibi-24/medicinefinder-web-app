// Location helpers shared by the customer and pharmacy pages

// Pakistan, shown before anyone has picked a spot
export const DEFAULT_CENTER = [30.3753, 69.3451];

// "0.8 km away", "12 km away", "350 m away"
export function distanceLabel(km) {
  if (km === null || km === undefined) return "";
  if (km < 0.1) return "Under 100 m away";
  if (km < 1) return `${Math.round(km * 10) * 100} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

// Asks the browser for the current position
export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

// A plain message for each way finding the position can fail
export function locateMessage(err) {
  if (err?.code === 1) return "Location is blocked in your browser. Allow it for this site, or click the map to choose a spot.";
  if (err?.code === 2) return "Your device could not work out where you are. Click the map to choose a spot instead.";
  if (err?.code === 3) return "Finding your location took too long. Try again, or click the map to choose a spot.";
  return "This browser cannot share your location. Click the map to choose a spot instead.";
}

export const directionsUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

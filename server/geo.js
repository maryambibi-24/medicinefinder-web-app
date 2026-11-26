// Helpers for "nearby" search. Distances are straight-line (great-circle) in kilometres.
const num = (v) => (v === undefined || v === null || String(v).trim() === "" ? NaN : Number(v));
const validLat = (n) => Number.isFinite(n) && Math.abs(n) <= 90;
const validLng = (n) => Number.isFinite(n) && Math.abs(n) <= 180;

// Reads lat, lng and radius from a query string.
// Returns null when there is no valid location, so the search works as before.
function readLocation(query) {
  const lat = num(query.lat);
  const lng = num(query.lng);
  if (!validLat(lat) || !validLng(lng)) return null;
  const r = num(query.radius);
  return { lat, lng, radius: Number.isFinite(r) && r > 0 ? Math.min(r, 500) : null };
}

// SQL for the distance in km from the customer to a pharmacy row.
// lat and lng were checked as numbers above, so they are safe to place in the query.
function distanceSql({ lat, lng }, alias = "p") {
  return `(6371 * 2 * ASIN(SQRT(LEAST(1,
    POW(SIN(RADIANS(${alias}.latitude - ${lat}) / 2), 2) +
    COS(RADIANS(${lat})) * COS(RADIANS(${alias}.latitude)) *
    POW(SIN(RADIANS(${alias}.longitude - ${lng}) / 2), 2)))))`;
}

// Checks a pin sent by a pharmacy.
//   no pin at all  -> { latitude: null, longitude: null }
//   a valid pin    -> { latitude, longitude } rounded to 6 decimals
//   anything else  -> null (invalid)
function readPin(lat, lng) {
  const a = num(lat);
  const b = num(lng);
  if (Number.isNaN(a) && Number.isNaN(b)) return { latitude: null, longitude: null };
  if (!validLat(a) || !validLng(b)) return null;
  return { latitude: Number(a.toFixed(6)), longitude: Number(b.toFixed(6)) };
}

const toNum = (v, digits) => (v === null || v === undefined ? null : Number(Number(v).toFixed(digits)));

module.exports = { readLocation, distanceSql, readPin, toNum };

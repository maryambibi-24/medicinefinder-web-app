// Customer search: find medicines and see which approved pharmacies have them,
// and how far each one is from the customer when a location is given.
const router = require("express").Router();
const db = require("../db");
const { auth } = require("../middleware/auth");

router.use(auth(["user"]));

const text = (v) => String(v ?? "").trim();
const likeOf = (q) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

// A number, or null when the value is missing or not a number
const num = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const km = (v) => (v === null || v === undefined ? null : Math.round(Number(v) * 100) / 100);

// The customer's position from ?lat=&lng=, or null. Values are checked as numbers,
// so it is safe to put them straight into the SQL below.
function origin(q) {
  const lat = num(q.lat);
  const lng = num(q.lng);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
}

// Straight-line distance in km (Haversine formula) from the customer to pharmacy p
const distanceSql = (o) =>
  `(6371 * 2 * ASIN(LEAST(1, SQRT(POWER(SIN(RADIANS(p.latitude - ${o.lat}) / 2), 2) + ` +
  `COS(RADIANS(${o.lat})) * COS(RADIANS(p.latitude)) * POWER(SIN(RADIANS(p.longitude - ${o.lng}) / 2), 2)))))`;

// Optional ?radius= in km (only used together with a location)
function radiusOf(q) {
  const r = num(q.radius);
  return r !== null && r > 0 && r <= 500 ? r : null;
}

const LOWEST = "MIN(CASE WHEN s.quantity > 0 THEN s.price END)"; // lowest in-stock price

// Search medicines by brand or generic name.
// Only pharmacies approved by the admin (is_verified = 1) are ever included.
router.get("/", async (req, res) => {
  const q = text(req.query.q).slice(0, 100);
  const city = text(req.query.city);
  const inStock = req.query.inStock === "1";
  const o = origin(req.query);
  const radius = o ? radiusOf(req.query) : null;
  const dist = o ? distanceSql(o) : null;
  const nearest = dist ? `MIN(CASE WHEN s.quantity > 0 THEN ${dist} END)` : "NULL";

  const SORTS = {
    name: "m.name ASC, m.strength ASC",
    price: `(${LOWEST} IS NULL), ${LOWEST} ASC, m.name ASC`, // nobody has it in stock: last
    recent: "MAX(s.updated_at) DESC, m.name ASC",
    nearest: dist ? `(${nearest} IS NULL), ${nearest} ASC, m.name ASC` : "m.name ASC, m.strength ASC",
  };
  const order = SORTS[req.query.sort] || SORTS.name;

  const where = ["p.is_verified = 1"];
  const params = [];
  if (q) {
    where.push("(m.name LIKE ? OR m.generic_name LIKE ?)");
    params.push(likeOf(q), likeOf(q));
  }
  if (city) { where.push("p.city = ?"); params.push(city); }
  if (inStock) where.push("s.quantity > 0");
  // Pharmacies without a map position cannot be placed inside a radius, so they are left out
  if (radius) where.push(`p.latitude IS NOT NULL AND ${dist} <= ${radius}`);

  try {
    const [rows] = await db.query(
      `SELECT m.id, m.name, m.generic_name, m.form, m.strength,
              COUNT(*) AS pharmacy_count,
              SUM(s.quantity > 0) AS in_stock_count,
              ${LOWEST} AS min_price,
              ${nearest} AS nearest_km,
              MAX(s.updated_at) AS last_updated
         FROM medicines m
         JOIN stock s ON s.medicine_id = m.id
         JOIN pharmacies p ON p.id = s.pharmacy_id
        WHERE ${where.join(" AND ")}
        GROUP BY m.id
        ORDER BY ${order}
        LIMIT 50`,
      params
    );
    res.json(rows.map((r) => ({
      ...r,
      pharmacy_count: Number(r.pharmacy_count),
      in_stock_count: Number(r.in_stock_count || 0),
      min_price: r.min_price === null ? null : Number(r.min_price),
      nearest_km: km(r.nearest_km),
    })));
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Cities where an approved pharmacy exists (for the city filter)
router.get("/cities", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT DISTINCT city FROM pharmacies WHERE is_verified = 1 ORDER BY city");
    res.json(rows.map((r) => r.city));
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// One medicine, the approved pharmacies that list it, and alternatives
router.get("/medicine/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid medicine" });
  const city = text(req.query.city);
  const o = origin(req.query);
  const radius = o ? radiusOf(req.query) : null;
  const dist = o ? distanceSql(o) : null;
  const radiusSql = radius ? ` AND p.latitude IS NOT NULL AND ${dist} <= ${radius}` : "";

  // In stock first, then either the nearest or the cheapest
  const rowOrder = req.query.sort === "nearest" && dist
    ? `(s.quantity = 0), (${dist} IS NULL), ${dist} ASC, s.price ASC, p.name ASC`
    : "(s.quantity = 0), s.price ASC, p.name ASC";

  try {
    const [meds] = await db.query(
      "SELECT id, name, generic_name, form, strength FROM medicines WHERE id = ?", [id]
    );
    if (!meds[0]) return res.status(404).json({ error: "Medicine not found" });

    const [rows] = await db.query(
      `SELECT s.id AS stock_id, s.price, s.quantity, s.updated_at,
              p.id AS pharmacy_id, p.name AS pharmacy_name, p.address, p.city,
              p.opening_time, p.closing_time, p.latitude, p.longitude,
              ${dist ? dist : "NULL"} AS distance_km, u.phone
         FROM stock s
         JOIN pharmacies p ON p.id = s.pharmacy_id
         JOIN users u ON u.id = p.user_id
        WHERE s.medicine_id = ? AND p.is_verified = 1 ${city ? "AND p.city = ?" : ""}${radiusSql}
        ORDER BY ${rowOrder}`,
      city ? [id, city] : [id]
    );

    // Alternatives: other brands with the same active ingredient that are in stock
    // at approved pharmacies. Same strength and form come first, then the cheapest.
    const med = meds[0];
    let alternatives = [];
    if (text(med.generic_name)) {
      const [alts] = await db.query(
        `SELECT m.id, m.name, m.generic_name, m.form, m.strength,
                COUNT(*) AS pharmacy_count,
                MIN(s.price) AS min_price,
                ${dist ? `MIN(${dist})` : "NULL"} AS nearest_km,
                (m.form = ? AND m.strength = ?) AS same_pack,
                (m.form = ?) AS same_form
           FROM medicines m
           JOIN stock s ON s.medicine_id = m.id AND s.quantity > 0
           JOIN pharmacies p ON p.id = s.pharmacy_id AND p.is_verified = 1
          WHERE m.id <> ? AND LOWER(TRIM(m.generic_name)) = LOWER(TRIM(?)) ${city ? "AND p.city = ?" : ""}${radiusSql}
          GROUP BY m.id
          ORDER BY same_pack DESC, same_form DESC, MIN(s.price) ASC, m.name ASC
          LIMIT 8`,
        [med.form, med.strength, med.form, id, med.generic_name, ...(city ? [city] : [])]
      );
      alternatives = alts.map((a) => ({
        id: a.id, name: a.name, generic_name: a.generic_name, form: a.form, strength: a.strength,
        pharmacy_count: Number(a.pharmacy_count),
        min_price: Number(a.min_price),
        nearest_km: km(a.nearest_km),
        same_pack: Number(a.same_pack) === 1,
        same_form: Number(a.same_form) === 1,
      }));
    }

    res.json({
      medicine: med,
      pharmacies: rows.map((r) => ({
        ...r,
        price: Number(r.price),
        latitude: r.latitude === null ? null : Number(r.latitude),
        longitude: r.longitude === null ? null : Number(r.longitude),
        distance_km: km(r.distance_km),
      })),
      alternatives,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

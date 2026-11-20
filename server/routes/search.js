// Customer search: find medicines and see which approved pharmacies have them
const router = require("express").Router();
const db = require("../db");
const { auth } = require("../middleware/auth");

router.use(auth(["user"]));

const text = (v) => String(v ?? "").trim();
const likeOf = (q) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

const LOWEST = "MIN(CASE WHEN s.quantity > 0 THEN s.price END)"; // lowest in-stock price
const SORTS = {
  name: "m.name ASC, m.strength ASC",
  price: `(${LOWEST} IS NULL), ${LOWEST} ASC, m.name ASC`, // medicines nobody has in stock go last
  recent: "MAX(s.updated_at) DESC, m.name ASC",
};

// Search medicines by brand or generic name.
// Only pharmacies approved by the admin (is_verified = 1) are ever included.
router.get("/", async (req, res) => {
  const q = text(req.query.q).slice(0, 100);
  const city = text(req.query.city);
  const inStock = req.query.inStock === "1";
  const order = SORTS[req.query.sort] || SORTS.name;

  const where = ["p.is_verified = 1"];
  const params = [];
  if (q) {
    where.push("(m.name LIKE ? OR m.generic_name LIKE ?)");
    params.push(likeOf(q), likeOf(q));
  }
  if (city) { where.push("p.city = ?"); params.push(city); }
  if (inStock) where.push("s.quantity > 0");

  try {
    const [rows] = await db.query(
      `SELECT m.id, m.name, m.generic_name, m.form, m.strength,
              COUNT(*) AS pharmacy_count,
              SUM(s.quantity > 0) AS in_stock_count,
              ${LOWEST} AS min_price,
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

// One medicine and the approved pharmacies that list it
router.get("/medicine/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid medicine" });
  const city = text(req.query.city);

  try {
    const [meds] = await db.query(
      "SELECT id, name, generic_name, form, strength FROM medicines WHERE id = ?", [id]
    );
    if (!meds[0]) return res.status(404).json({ error: "Medicine not found" });

    const [rows] = await db.query(
      `SELECT s.id AS stock_id, s.price, s.quantity, s.updated_at,
              p.id AS pharmacy_id, p.name AS pharmacy_name, p.address, p.city,
              p.opening_time, p.closing_time, u.phone
         FROM stock s
         JOIN pharmacies p ON p.id = s.pharmacy_id
         JOIN users u ON u.id = p.user_id
        WHERE s.medicine_id = ? AND p.is_verified = 1 ${city ? "AND p.city = ?" : ""}
        ORDER BY (s.quantity = 0), s.price ASC, p.name ASC`,
      city ? [id, city] : [id]
    );

    res.json({ medicine: meds[0], pharmacies: rows.map((r) => ({ ...r, price: Number(r.price) })) });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

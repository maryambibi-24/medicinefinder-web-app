// Pharmacy stock: each verified pharmacy manages only its own medicines
const router = require("express").Router();
const db = require("../db");
const { auth, verifiedPharmacy } = require("../middleware/auth");

router.use(auth(["pharmacy"]), verifiedPharmacy);

const FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler", "Other"];
const text = (v) => String(v ?? "").trim();

// Returns an error message, or null when price and quantity are fine
function checkNumbers(price, quantity) {
  if (!Number.isFinite(price) || price < 0 || price > 1000000) return "Enter a valid price";
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100000) return "Quantity must be a whole number from 0 to 100000";
  return null;
}

// My stock (optional ?search=)
router.get("/", async (req, res) => {
  try {
    const search = text(req.query.search);
    const like = `%${search}%`;
    const [rows] = await db.query(
      `SELECT s.id, s.price, s.quantity, s.updated_at,
              m.id AS medicine_id, m.name, m.generic_name, m.form, m.strength
         FROM stock s
         JOIN medicines m ON m.id = s.medicine_id
        WHERE s.pharmacy_id = ? ${search ? "AND (m.name LIKE ? OR m.generic_name LIKE ?)" : ""}
        ORDER BY m.name, m.strength`,
      search ? [req.pharmacyId, like, like] : [req.pharmacyId]
    );
    res.json(rows.map((r) => ({ ...r, price: Number(r.price) })));
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Medicine suggestions from the shared catalog (for the Add form)
router.get("/suggest", async (req, res) => {
  const q = text(req.query.q);
  if (q.length < 2) return res.json([]);
  try {
    const [rows] = await db.query(
      `SELECT name, generic_name, form, strength FROM medicines
        WHERE name LIKE ? OR generic_name LIKE ?
        ORDER BY name LIMIT 8`,
      [`%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add a medicine to my stock (creates it in the catalog if it is new)
router.post("/", async (req, res) => {
  const name = text(req.body.name);
  const strength = text(req.body.strength);
  const form = text(req.body.form);
  const generic = text(req.body.genericName) || null;
  const price = Number(req.body.price);
  const quantity = Number(req.body.quantity);

  if (!name || name.length > 150) return res.status(400).json({ error: "Enter the medicine name" });
  if (!FORMS.includes(form)) return res.status(400).json({ error: "Choose a valid form" });
  if (strength.length > 40 || (generic && generic.length > 150)) return res.status(400).json({ error: "Strength or generic name is too long" });
  const numberError = checkNumbers(price, quantity);
  if (numberError) return res.status(400).json({ error: numberError });

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Find the medicine in the catalog, or create it
    const [med] = await conn.query(
      `INSERT INTO medicines (name, generic_name, form, strength) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         generic_name = IF(generic_name IS NULL OR generic_name = '', VALUES(generic_name), generic_name),
         id = LAST_INSERT_ID(id)`,
      [name, generic, form, strength]
    );

    const [result] = await conn.query(
      "INSERT INTO stock (pharmacy_id, medicine_id, price, quantity) VALUES (?, ?, ?, ?)",
      [req.pharmacyId, med.insertId, price, quantity]
    );

    await conn.commit();
    res.status(201).json({ message: "Added", id: result.insertId });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "You already list this medicine. Edit it in the table instead." });
    }
    console.log(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

// Update price and quantity of one of my items
router.put("/:id", async (req, res) => {
  const price = Number(req.body.price);
  const quantity = Number(req.body.quantity);
  const numberError = checkNumbers(price, quantity);
  if (numberError) return res.status(400).json({ error: numberError });

  try {
    const [result] = await db.query(
      "UPDATE stock SET price = ?, quantity = ?, updated_at = NOW() WHERE id = ? AND pharmacy_id = ?",
      [price, quantity, req.params.id, req.pharmacyId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Updated" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Remove one of my items
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM stock WHERE id = ? AND pharmacy_id = ?", [req.params.id, req.pharmacyId]);
    if (!result.affectedRows) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Removed" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

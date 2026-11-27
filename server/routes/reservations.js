// Reservations: a customer holds some units of a medicine at one pharmacy for a short time.
// Held units are taken out of the pharmacy's stock. If the customer does not collect them
// in time (or cancels), they go back into stock.
const router = require("express").Router();
const db = require("../db");
const { auth, verifiedPharmacy } = require("../middleware/auth");
const { releaseReservation, expireReservations } = require("../lib/reservations");

const HOLDS = [15, 30, 60, 120]; // minutes a customer can choose
const MAX_QTY = 20;              // most units in one reservation
const MAX_ACTIVE = 5;            // most reservations a customer can hold at once

// An expected problem with a message for the person (not a crash)
class Refuse extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------- Customer ----------

// Hold a medicine at a pharmacy
router.post("/", auth(["user"]), async (req, res) => {
  const stockId = Number(req.body.stockId);
  const quantity = Number(req.body.quantity);
  const hold = Number(req.body.holdMinutes);

  if (!Number.isInteger(stockId) || stockId < 1) return res.status(400).json({ error: "Choose a medicine to reserve" });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
    return res.status(400).json({ error: `Quantity must be a whole number from 1 to ${MAX_QTY}` });
  }
  if (!HOLDS.includes(hold)) return res.status(400).json({ error: "Choose how long to hold it" });

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [[mine]] = await conn.query(
      "SELECT COUNT(*) AS c FROM reservations WHERE user_id = ? AND status = 'active'",
      [req.user.id]
    );
    if (mine.c >= MAX_ACTIVE) {
      throw new Refuse(400, `You can hold up to ${MAX_ACTIVE} reservations at a time. Collect or cancel one first.`);
    }

    // FOR UPDATE locks this stock row, so two people cannot take the last units together
    const [rows] = await conn.query(
      `SELECT s.id, s.price, s.quantity, s.pharmacy_id, s.medicine_id, p.is_verified
         FROM stock s JOIN pharmacies p ON p.id = s.pharmacy_id
        WHERE s.id = ? FOR UPDATE`,
      [stockId]
    );
    const item = rows[0];
    if (!item || Number(item.is_verified) !== 1) throw new Refuse(404, "This medicine is no longer listed.");
    if (item.quantity < quantity) {
      throw new Refuse(409, item.quantity > 0 ? `Only ${item.quantity} left. Choose a smaller quantity.` : "Sorry, it just went out of stock.");
    }

    await conn.query("UPDATE stock SET quantity = quantity - ? WHERE id = ?", [quantity, stockId]);
    const [inserted] = await conn.query(
      `INSERT INTO reservations
         (user_id, pharmacy_id, medicine_id, stock_id, quantity, unit_price, hold_minutes, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW() + INTERVAL ? MINUTE)`,
      [req.user.id, item.pharmacy_id, item.medicine_id, item.id, quantity, item.price, hold, hold]
    );
    // The countdown starts from the database clock, so it does not depend on the customer's device
    const [[t]] = await conn.query(
      "SELECT TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS seconds_left FROM reservations WHERE id = ?",
      [inserted.insertId]
    );

    await conn.commit();
    res.status(201).json({ id: inserted.insertId, seconds_left: Number(t.seconds_left) });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err instanceof Refuse) return res.status(err.status).json({ error: err.message });
    console.log(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

// My reservations (active first, then history)
router.get("/mine", auth(["user"]), async (req, res) => {
  try {
    await expireReservations().catch((err) => console.log(err));
    const [rows] = await db.query(
      `SELECT r.id, r.status, r.quantity, r.unit_price, r.hold_minutes, r.cancelled_by, r.created_at,
              GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), r.expires_at)) AS seconds_left,
              m.name AS medicine_name, m.strength, m.form,
              p.name AS pharmacy_name, p.address, p.city, p.latitude, p.longitude, u.phone AS pharmacy_phone
         FROM reservations r
         JOIN medicines m ON m.id = r.medicine_id
         JOIN pharmacies p ON p.id = r.pharmacy_id
         JOIN users u ON u.id = p.user_id
        WHERE r.user_id = ?
        ORDER BY (r.status = 'active') DESC, r.created_at DESC
        LIMIT 50`,
      [req.user.id]
    );
    res.json(rows.map((r) => ({
      ...r,
      unit_price: Number(r.unit_price),
      total: Number(r.unit_price) * r.quantity,
      seconds_left: r.status === "active" ? Number(r.seconds_left) : 0,
      latitude: r.latitude === null ? null : Number(r.latitude),
      longitude: r.longitude === null ? null : Number(r.longitude),
    })));
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Cancel one of my reservations (the units go back into stock)
router.post("/:id/cancel", auth(["user"]), async (req, res) => {
  try {
    const done = await releaseReservation({
      id: Number(req.params.id), status: "cancelled", by: "customer", from: ["active"], userId: req.user.id,
    });
    if (!done) return res.status(409).json({ error: "This reservation can no longer be cancelled." });
    res.json({ message: "Cancelled" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Pharmacy ----------

// Reservations waiting to be collected at my pharmacy
router.get("/pharmacy", auth(["pharmacy"]), verifiedPharmacy, async (req, res) => {
  try {
    await expireReservations().catch((err) => console.log(err));
    const [rows] = await db.query(
      `SELECT r.id, r.quantity, r.unit_price, r.created_at,
              GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), r.expires_at)) AS seconds_left,
              m.name AS medicine_name, m.strength, m.form,
              u.name AS customer_name, u.phone AS customer_phone
         FROM reservations r
         JOIN medicines m ON m.id = r.medicine_id
         JOIN users u ON u.id = r.user_id
        WHERE r.pharmacy_id = ? AND r.status = 'active'
        ORDER BY r.expires_at ASC
        LIMIT 100`,
      [req.pharmacyId]
    );
    res.json(rows.map((r) => ({ ...r, unit_price: Number(r.unit_price), total: Number(r.unit_price) * r.quantity, seconds_left: Number(r.seconds_left) })));
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// The customer came and took the medicine
router.post("/pharmacy/:id/collected", auth(["pharmacy"]), verifiedPharmacy, async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE reservations SET status = 'collected' WHERE id = ? AND pharmacy_id = ? AND status = 'active'",
      [Number(req.params.id), req.pharmacyId]
    );
    if (!result.affectedRows) return res.status(409).json({ error: "This reservation is no longer active." });
    res.json({ message: "Marked as collected" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// The pharmacy cancels (for example the item was damaged). The units go back into stock.
router.post("/pharmacy/:id/cancel", auth(["pharmacy"]), verifiedPharmacy, async (req, res) => {
  try {
    const done = await releaseReservation({
      id: Number(req.params.id), status: "cancelled", by: "pharmacy", from: ["active"], pharmacyId: req.pharmacyId,
    });
    if (!done) return res.status(409).json({ error: "This reservation is no longer active." });
    res.json({ message: "Cancelled" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

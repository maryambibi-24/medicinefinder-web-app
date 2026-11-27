// Pharmacy owner: see my own pharmacy and its verification status
const router = require("express").Router();
const db = require("../db");
const { auth } = require("../middleware/auth");
const { readPin, toNum } = require("../geo");

const STATUS = ["pending", "approved", "rejected"]; // matches is_verified 0, 1, 2

router.get("/me", auth(["pharmacy"]), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT name, license_number, address, city, opening_time, closing_time, latitude, longitude,
              is_verified, rejection_reason, reviewed_at, created_at
         FROM pharmacies WHERE user_id = ?`,
      [req.user.id]
    );
    const p = rows[0];
    if (!p) return res.status(404).json({ error: "Pharmacy not found" });

    const { is_verified, ...rest } = p;
    res.json({
      ...rest,
      latitude: toNum(rest.latitude, 6),
      longitude: toNum(rest.longitude, 6),
      status: STATUS[Number(is_verified)] || "pending",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Save or remove the pharmacy's map pin. Send { latitude: null, longitude: null } to remove it.
router.put("/me/location", auth(["pharmacy"]), async (req, res) => {
  const pin = readPin(req.body?.latitude, req.body?.longitude);
  if (!pin) return res.status(400).json({ error: "The map location is not valid. Place the pin again." });
  try {
    const [result] = await db.query(
      "UPDATE pharmacies SET latitude = ?, longitude = ? WHERE user_id = ?",
      [pin.latitude, pin.longitude, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Pharmacy not found" });
    res.json(pin);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

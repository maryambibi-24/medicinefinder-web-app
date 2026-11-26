// Pharmacy owner: see my own pharmacy, its verification status and its map position
const router = require("express").Router();
const db = require("../db");
const { auth } = require("../middleware/auth");

const STATUS = ["pending", "approved", "rejected"]; // matches is_verified 0, 1, 2

router.get("/me", auth(["pharmacy"]), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT name, license_number, address, city, opening_time, closing_time,
              latitude, longitude, is_verified, rejection_reason, reviewed_at, created_at
         FROM pharmacies WHERE user_id = ?`,
      [req.user.id]
    );
    const p = rows[0];
    if (!p) return res.status(404).json({ error: "Pharmacy not found" });

    const { is_verified, latitude, longitude, ...rest } = p;
    res.json({
      ...rest,
      latitude: latitude === null ? null : Number(latitude),
      longitude: longitude === null ? null : Number(longitude),
      status: STATUS[Number(is_verified)] || "pending",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Save or change where my pharmacy is on the map
router.put("/location", auth(["pharmacy"]), async (req, res) => {
  const { latitude, longitude } = req.body;
  const lat = Number(latitude);
  const lng = Number(longitude);
  const given = (v) => v !== undefined && v !== null && v !== "";
  if (!given(latitude) || !given(longitude) || !Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Choose a valid place on the map" });
  }
  try {
    const [result] = await db.query(
      "UPDATE pharmacies SET latitude = ?, longitude = ? WHERE user_id = ?",
      [lat, lng, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Pharmacy not found" });
    res.json({ message: "Location saved", latitude: lat, longitude: lng });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

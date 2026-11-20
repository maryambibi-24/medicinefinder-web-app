// Pharmacy owner: see my own pharmacy and its verification status
const router = require("express").Router();
const db = require("../db");
const { auth } = require("../middleware/auth");

const STATUS = ["pending", "approved", "rejected"]; // matches is_verified 0, 1, 2

router.get("/me", auth(["pharmacy"]), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT name, license_number, address, city, opening_time, closing_time,
              is_verified, rejection_reason, reviewed_at, created_at
         FROM pharmacies WHERE user_id = ?`,
      [req.user.id]
    );
    const p = rows[0];
    if (!p) return res.status(404).json({ error: "Pharmacy not found" });

    const { is_verified, ...rest } = p;
    res.json({ ...rest, status: STATUS[Number(is_verified)] || "pending" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

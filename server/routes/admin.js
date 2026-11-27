// Admin only: list pharmacies and approve or reject them
const router = require("express").Router();
const db = require("../db");
const { auth } = require("../middleware/auth");
const { toNum } = require("../geo");

router.use(auth(["admin"]));

// is_verified: 0 = waiting, 1 = approved, 2 = rejected
router.get("/pharmacies", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.name, p.license_number, p.address, p.city,
              p.opening_time, p.closing_time, p.latitude, p.longitude, p.is_verified,
              p.rejection_reason, p.reviewed_at, p.created_at,
              u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
         FROM pharmacies p
         JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC`
    );
    res.json(rows.map((r) => ({ ...r, latitude: toNum(r.latitude, 6), longitude: toNum(r.longitude, 6) })));
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/pharmacies/:id", async (req, res) => {
  const { action, reason } = req.body;
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Action must be approve or reject" });
  }
  const approve = action === "approve";
  try {
    const [result] = await db.query(
      "UPDATE pharmacies SET is_verified = ?, rejection_reason = ?, reviewed_at = NOW() WHERE id = ?",
      [approve ? 1 : 2, approve ? null : (reason || "").trim().slice(0, 255) || null, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Pharmacy not found" });
    res.json({ message: "Updated" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

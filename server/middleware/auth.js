// Protects routes.
//   auth(["pharmacy"])  -> only pharmacy accounts may enter
//   verifiedPharmacy    -> only pharmacies approved by the admin (use after auth)
const jwt = require("jsonwebtoken");
const db = require("../db");

exports.auth = (roles = []) => (req, res, next) => {
  const token = (req.headers.authorization || "").split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (roles.length && !roles.includes(payload.role)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Please sign in" });
  }
};

exports.verifiedPharmacy = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT id, is_verified FROM pharmacies WHERE user_id = ?", [req.user.id]);
    if (!rows[0] || Number(rows[0].is_verified) !== 1) {
      return res.status(403).json({ error: "Your pharmacy is not verified yet" });
    }
    req.pharmacyId = rows[0].id; // the routes use this to touch only this pharmacy's data
    next();
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

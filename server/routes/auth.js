// Register and login (seekers and pharmacies)
const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

router.post("/register", async (req, res) => {
  const { name, email, phone, password, role, pharmacy } = req.body;
  const isPharmacy = role === "pharmacy";

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Fill in your name, email and password" });
  }
  if (!emailOk(email)) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const p = pharmacy || {};
  if (isPharmacy && (!p.name?.trim() || !p.licenseNumber?.trim() || !p.address?.trim() || !p.city?.trim())) {
    return res.status(400).json({ error: "Fill in all the pharmacy details" });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction(); // save the user and pharmacy together, or neither
    const hash = await bcrypt.hash(password, 10);

    const [result] = await conn.query(
      "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), email.trim().toLowerCase(), phone || null, hash, isPharmacy ? "pharmacy" : "user"]
    );

    if (isPharmacy) {
      await conn.query(
        `INSERT INTO pharmacies
           (user_id, name, license_number, address, city, opening_time, closing_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          p.name.trim(),
          p.licenseNumber.trim(),
          p.address.trim(),
          p.city.trim(),
          p.openingTime || null,
          p.closingTime || null,
        ]
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Registered", pendingVerification: isPharmacy });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      const msg = err.sqlMessage.includes("license")
        ? "This license number is already registered"
        : "Email already used";
      return res.status(409).json({ error: msg });
    }
    console.log(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      `SELECT u.*, p.id AS pharmacy_id, p.name AS pharmacy_name, p.is_verified
         FROM users u
         LEFT JOIN pharmacies p ON p.user_id = u.id
        WHERE u.email = ?`,
      [(email || "").trim().toLowerCase()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return res.status(401).json({ error: "Wrong email or password" });
    }

    // Pharmacies can always log in. Their dashboard shows the verification status.
    const verificationStatus =
      user.role === "pharmacy"
        ? ["pending", "approved", "rejected"][Number(user.is_verified)] || "pending"
        : null;

    const token = jwt.sign(
      { id: user.id, role: user.role, pharmacyId: user.pharmacy_id || null },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        pharmacyId: user.pharmacy_id || null,
        pharmacyName: user.pharmacy_name || null,
        verificationStatus,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

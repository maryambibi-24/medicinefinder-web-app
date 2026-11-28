// Urgent requests: a customer asks the pharmacies around them for a medicine they cannot find.
// Each pharmacy inside the chosen distance sees the request and answers Available or Not available.
// Pharmacies see only how far away the customer is, never where they are or who they are.
const router = require("express").Router();
const db = require("../db");
const { auth, verifiedPharmacy } = require("../middleware/auth");
const { readLocation, distanceSql, haversineKm, toNum } = require("../geo");
const { expireUrgentRequests } = require("../lib/urgent");

const RADII = [1, 2, 5, 10, 25]; // km the customer can choose
const OPEN_HOURS = 2;            // how long a request stays open
const MAX_OPEN = 3;              // most open requests one customer can have
const text = (v) => String(v ?? "").trim();

// ---------- Customer ----------

// Send a new request
router.post("/", auth(["user"]), async (req, res) => {
  const name = text(req.body.medicineName);
  const quantity = Number(req.body.quantity);
  const radius = Number(req.body.radius);
  const loc = readLocation({ lat: req.body.lat, lng: req.body.lng });

  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: "Enter the medicine name" });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) return res.status(400).json({ error: "Quantity must be a whole number from 1 to 50" });
  if (!RADII.includes(radius)) return res.status(400).json({ error: "Choose how far to search" });
  if (!loc) return res.status(400).json({ error: "Share or choose your location first" });

  // About 10 metres is precise enough to find nearby pharmacies
  const lat = Number(loc.lat.toFixed(4));
  const lng = Number(loc.lng.toFixed(4));

  try {
    await expireUrgentRequests().catch((err) => console.log(err));

    const [[open]] = await db.query("SELECT COUNT(*) AS c FROM urgent_requests WHERE user_id = ? AND status = 'open'", [req.user.id]);
    if (open.c >= MAX_OPEN) {
      return res.status(400).json({ error: `You can have ${MAX_OPEN} open requests at a time. Close one first.` });
    }

    // Only verified pharmacies that placed a pin can be reached
    const [[near]] = await db.query(
      `SELECT COUNT(*) AS c FROM pharmacies p
        WHERE p.is_verified = 1 AND p.latitude IS NOT NULL AND ${distanceSql({ lat, lng })} <= ${radius}`
    );
    if (!near.c) {
      return res.status(422).json({ error: `No verified pharmacy with a map pin was found within ${radius} km. Try a larger distance.` });
    }

    const [result] = await db.query(
      `INSERT INTO urgent_requests (user_id, medicine_name, quantity, radius_km, latitude, longitude, notified_count, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW() + INTERVAL ${OPEN_HOURS} HOUR)`,
      [req.user.id, name, quantity, radius, lat, lng, near.c]
    );
    res.status(201).json({ id: result.insertId, notified_count: near.c });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// My requests with the pharmacies that said Available
router.get("/mine", auth(["user"]), async (req, res) => {
  try {
    await expireUrgentRequests().catch((err) => console.log(err));
    const [requests] = await db.query(
      `SELECT id, medicine_name, quantity, radius_km, notified_count, status, latitude, longitude, created_at,
              GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), expires_at)) AS seconds_left
         FROM urgent_requests
        WHERE user_id = ? AND (status = 'open' OR created_at > NOW() - INTERVAL 1 DAY)
        ORDER BY (status = 'open') DESC, created_at DESC
        LIMIT 20`,
      [req.user.id]
    );

    const ids = requests.map((r) => r.id);
    const [replies] = ids.length
      ? await db.query(
          `SELECT rp.request_id, rp.answer, rp.updated_at,
                  p.id AS pharmacy_id, p.name, p.address, p.city, p.latitude, p.longitude, u.phone
             FROM urgent_replies rp
             JOIN pharmacies p ON p.id = rp.pharmacy_id
             JOIN users u ON u.id = p.user_id
            WHERE rp.request_id IN (?)`,
          [ids]
        )
      : [[]];

    res.json(requests.map((r) => {
      const mine = replies.filter((x) => x.request_id === r.id);
      const available = mine
        .filter((x) => x.answer === "available")
        .map((x) => ({
          pharmacy_id: x.pharmacy_id,
          name: x.name,
          address: x.address,
          city: x.city,
          phone: x.phone,
          latitude: toNum(x.latitude, 6),
          longitude: toNum(x.longitude, 6),
          answered_at: x.updated_at,
          // The distance can only be worked out while the request still has the customer's position
          distance_km: r.latitude !== null && x.latitude !== null
            ? toNum(haversineKm(Number(r.latitude), Number(r.longitude), Number(x.latitude), Number(x.longitude)), 2)
            : null,
        }))
        .sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));

      return {
        id: r.id,
        medicine_name: r.medicine_name,
        quantity: r.quantity,
        radius_km: r.radius_km,
        notified_count: r.notified_count,
        status: r.status,
        created_at: r.created_at,
        seconds_left: r.status === "open" ? Number(r.seconds_left) : 0,
        available,
        not_available_count: mine.filter((x) => x.answer === "not_available").length,
        waiting_count: Math.max(0, r.notified_count - mine.length),
      };
    }));
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Close my request. It stops asking pharmacies, and my position is deleted from it.
router.post("/:id/close", auth(["user"]), async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE urgent_requests SET status = 'closed', latitude = NULL, longitude = NULL WHERE id = ? AND user_id = ? AND status = 'open'",
      [Number(req.params.id), req.user.id]
    );
    if (!result.affectedRows) return res.status(409).json({ error: "This request is already closed." });
    res.json({ message: "Closed" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Pharmacy ----------

// The pharmacy's own position, or null if it has not placed a pin
async function pharmacyPoint(pharmacyId) {
  const [[ph]] = await db.query("SELECT latitude, longitude FROM pharmacies WHERE id = ?", [pharmacyId]);
  if (!ph || ph.latitude === null || ph.longitude === null) return null;
  return { lat: Number(ph.latitude), lng: Number(ph.longitude) };
}

// Open requests whose chosen distance reaches this pharmacy
router.get("/incoming", auth(["pharmacy"]), verifiedPharmacy, async (req, res) => {
  try {
    await expireUrgentRequests().catch((err) => console.log(err));
    const here = await pharmacyPoint(req.pharmacyId);
    if (!here) return res.json({ needsPin: true, requests: [] });

    const dist = distanceSql(here, "r");
    const [rows] = await db.query(
      `SELECT r.id, r.medicine_name, r.quantity, r.radius_km, r.created_at,
              GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), r.expires_at)) AS seconds_left,
              ${dist} AS distance_km, rp.answer AS my_answer
         FROM urgent_requests r
         LEFT JOIN urgent_replies rp ON rp.request_id = r.id AND rp.pharmacy_id = ?
        WHERE r.status = 'open' AND r.expires_at > NOW() AND r.latitude IS NOT NULL AND ${dist} <= r.radius_km
        ORDER BY (rp.answer IS NOT NULL), r.created_at DESC
        LIMIT 50`,
      [req.pharmacyId]
    );
    res.json({
      needsPin: false,
      requests: rows.map((r) => ({ ...r, seconds_left: Number(r.seconds_left), distance_km: toNum(r.distance_km, 2) })),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// One tap: Available or Not available. Tapping again changes the answer.
router.post("/:id/reply", auth(["pharmacy"]), verifiedPharmacy, async (req, res) => {
  const answer = req.body.answer;
  if (!["available", "not_available"].includes(answer)) return res.status(400).json({ error: "Answer Available or Not available" });

  try {
    const here = await pharmacyPoint(req.pharmacyId);
    if (!here) return res.status(400).json({ error: "Place your pharmacy on the map first." });

    // The request must still be open and must reach this pharmacy
    const [found] = await db.query(
      `SELECT r.id FROM urgent_requests r
        WHERE r.id = ? AND r.status = 'open' AND r.expires_at > NOW() AND r.latitude IS NOT NULL
          AND ${distanceSql(here, "r")} <= r.radius_km`,
      [Number(req.params.id)]
    );
    if (!found.length) return res.status(404).json({ error: "This request has closed or is outside your area." });

    await db.query(
      `INSERT INTO urgent_replies (request_id, pharmacy_id, answer) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE answer = VALUES(answer)`,
      [found[0].id, req.pharmacyId, answer]
    );
    res.json({ answer });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

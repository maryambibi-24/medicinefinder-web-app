const db = require("../db");

// Closes urgent requests whose time ran out. A finished request forgets the customer's position.
async function expireUrgentRequests() {
  const [result] = await db.query(
    "UPDATE urgent_requests SET status = 'expired', latitude = NULL, longitude = NULL WHERE status = 'open' AND expires_at <= NOW()"
  );
  return result.affectedRows;
}

module.exports = { expireUrgentRequests };

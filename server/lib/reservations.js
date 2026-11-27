// Shared by the reservation routes and the server's timer.
const db = require("../db");

// Ends a reservation and puts the held units back into stock, in one transaction.
// It only changes a reservation that is still in one of the "from" states,
// so the same units can never be returned twice.
// Returns true if it was released, false if it was already in another state.
async function releaseReservation({ id, status, by, from, userId, pharmacyId, onlyDue }) {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    let sql = "UPDATE reservations SET status = ?, cancelled_by = ? WHERE id = ? AND status IN (?)";
    const params = [status, by, id, from];
    if (userId) { sql += " AND user_id = ?"; params.push(userId); }
    if (pharmacyId) { sql += " AND pharmacy_id = ?"; params.push(pharmacyId); }
    if (onlyDue) sql += " AND expires_at <= NOW()";

    const [result] = await conn.query(sql, params);
    if (!result.affectedRows) {
      await conn.rollback();
      return false;
    }
    await conn.query(
      "UPDATE stock s JOIN reservations r ON r.stock_id = s.id SET s.quantity = s.quantity + r.quantity WHERE r.id = ?",
      [id]
    );
    await conn.commit();
    return true;
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

// Expires the holds whose time ran out and returns their stock
async function expireReservations() {
  const [due] = await db.query("SELECT id FROM reservations WHERE status = 'active' AND expires_at <= NOW() LIMIT 200");
  for (const r of due) {
    await releaseReservation({ id: r.id, status: "expired", by: "system", from: ["active"], onlyDue: true });
  }
  return due.length;
}

module.exports = { releaseReservation, expireReservations };

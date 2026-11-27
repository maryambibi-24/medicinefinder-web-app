// Creates the reservations table when the server starts. It skips it if it already exists,
// so no manual SQL is needed.
const db = require("../db");

const RESERVATIONS = `CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pharmacy_id INT NOT NULL,
  medicine_id INT NOT NULL,
  stock_id INT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  hold_minutes INT NOT NULL,
  expires_at DATETIME NOT NULL,
  status ENUM('active','collected','cancelled','expired') NOT NULL DEFAULT 'active',
  cancelled_by ENUM('customer','pharmacy','system') NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_res_user (user_id, status),
  INDEX idx_res_pharmacy (pharmacy_id, status),
  INDEX idx_res_expiry (status, expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stock(id) ON DELETE SET NULL
)`;

async function ensureSchema() {
  try {
    await db.query(RESERVATIONS);
  } catch (err) {
    console.log("Could not create the reservations table:", err.code || err.message);
    throw err;
  }
}

module.exports = { ensureSchema };

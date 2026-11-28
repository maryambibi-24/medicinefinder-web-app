// Creates the reservations and urgent-request tables when the server starts.
// It skips any that already exist, so no manual SQL is needed.
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

const URGENT_REQUESTS = `CREATE TABLE IF NOT EXISTS urgent_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  medicine_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  radius_km INT NOT NULL,
  latitude DECIMAL(9,6) NULL,
  longitude DECIMAL(9,6) NULL,
  notified_count INT NOT NULL DEFAULT 0,
  status ENUM('open','closed','expired') NOT NULL DEFAULT 'open',
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_urg_user (user_id, status),
  INDEX idx_urg_open (status, expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

const URGENT_REPLIES = `CREATE TABLE IF NOT EXISTS urgent_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  pharmacy_id INT NOT NULL,
  answer ENUM('available','not_available') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reply (request_id, pharmacy_id),
  FOREIGN KEY (request_id) REFERENCES urgent_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE CASCADE
)`;

async function ensureSchema() {
  // Order matters: urgent_replies points at urgent_requests
  const tables = [
    ["reservations", RESERVATIONS],
    ["urgent_requests", URGENT_REQUESTS],
    ["urgent_replies", URGENT_REPLIES],
  ];
  for (const [name, sql] of tables) {
    try {
      await db.query(sql);
    } catch (err) {
      console.log(`Could not create the ${name} table:`, err.code || err.message);
      throw err;
    }
  }
}

module.exports = { ensureSchema };

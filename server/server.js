// Starts the backend and connects the routes
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./db");
const { ensureSchema } = require("./lib/schema");
const { expireReservations } = require("./lib/reservations");

// A stray error inside one request must never stop the whole server
process.on("unhandledRejection", (err) => console.log("Unhandled error:", err));

const app = express();
app.use(cors());          // lets the React page talk to this server
app.use(express.json());  // lets the server read JSON sent by the page

app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/pharmacy", require("./routes/pharmacy"));
app.use("/api/stock", require("./routes/stock"));
app.use("/api/search", require("./routes/search"));
app.use("/api/reservations", require("./routes/reservations"));

app.get("/", (req, res) => res.send("MedFinder server is running"));

// Used by the /status page in the website to show what is wrong, in plain words
app.get("/api/health", async (req, res) => {
  const out = { server: "ok", database: "ok", locationColumns: "ok" };
  try {
    await db.query("SELECT 1");
  } catch (err) {
    out.database = err.code || "error";
    out.locationColumns = "unknown";
    return res.json(out);
  }
  try {
    await db.query("SELECT latitude, longitude FROM pharmacies LIMIT 1");
  } catch (err) {
    out.locationColumns = err.code === "ER_BAD_FIELD_ERROR" ? "missing" : err.code || "error";
  }
  res.json(out);
});

// What to do about the most common database problems
function dbHint(err) {
  switch (err.code) {
    case "ECONNREFUSED": return "MySQL is not running. Start MySQL in the XAMPP control panel, then restart this server.";
    case "ER_ACCESS_DENIED_ERROR": return "Wrong DB_USER or DB_PASS in server/.env.";
    case "ER_BAD_DB_ERROR": return "The database does not exist yet. Run database.sql once (see README.md).";
    case "ER_NO_SUCH_TABLE": return "Tables are missing. Run database.sql once (see README.md).";
    default: return "";
  }
}

// Older databases do not have the map position columns. Add them automatically so no manual SQL is needed.
async function ensureLocationColumns() {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pharmacies'
        AND COLUMN_NAME IN ('latitude', 'longitude')`
  );
  const have = rows.map((r) => r.COLUMN_NAME);
  if (!have.includes("latitude")) await db.query("ALTER TABLE pharmacies ADD COLUMN latitude DECIMAL(9,6) NULL");
  if (!have.includes("longitude")) await db.query("ALTER TABLE pharmacies ADD COLUMN longitude DECIMAL(9,6) NULL");
  if (have.length < 2) console.log("Added the map location columns to the pharmacies table.");
}

async function checkSetup() {
  if (!fs.existsSync(path.join(__dirname, ".env"))) {
    console.log("WARNING: server/.env is missing. Copy .env.example to .env (start.bat does this for you).");
  } else if (!process.env.JWT_SECRET) {
    console.log("WARNING: JWT_SECRET is empty in server/.env, so logging in will fail.");
  }
  try {
    await db.query("SELECT 1");
    console.log("Database connected");
    await ensureLocationColumns();
    await ensureSchema();
  } catch (err) {
    console.log("Database NOT connected:", err.code || err.message);
    console.log(dbHint(err) || err.message);
  }
}

// Every 30 seconds: holds that ran out are released and their stock returns
setInterval(() => expireReservations().catch((err) => console.log("Expiry check failed:", err.code || err.message)), 30000);

const PORT = 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  checkSetup();
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Port ${PORT} is already in use. Another server window is probably still open.`);
    console.log("Close it (or the program using port 5000) and start this server again.");
  } else {
    console.log("Server could not start:", err.message);
  }
  process.exit(1);
});

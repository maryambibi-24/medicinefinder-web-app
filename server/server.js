// Starts the backend and connects the routes
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());          // lets the React page talk to this server
app.use(express.json());  // lets the server read JSON sent by the page

app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/pharmacy", require("./routes/pharmacy"));
app.use("/api/stock", require("./routes/stock"));

app.get("/", (req, res) => res.send("MedFinder server is running"));

const PORT = 5000;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await db.query("SELECT 1");
    console.log("Database connected");
  } catch (err) {
    console.log("Database NOT connected:", err.message);
    console.log("Run database.sql once to create the database and tables.");
  }
});

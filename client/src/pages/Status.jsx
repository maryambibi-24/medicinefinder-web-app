import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../api";

// What to do for each database problem the server can report
const DB_HELP = {
  ECONNREFUSED: "MySQL is not running. Open the XAMPP control panel and start MySQL.",
  ER_ACCESS_DENIED_ERROR: "The database user or password is wrong. Check DB_USER and DB_PASS in server/.env, then restart the server.",
  ER_BAD_DB_ERROR: "The database does not exist yet. Run server/database.sql once (phpMyAdmin, Import).",
  ER_NO_SUCH_TABLE: "The tables are missing. Run server/database.sql once.",
};

export default function Status() {
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null); // null means the server did not answer

  useEffect(() => {
    let alive = true;
    axios
      .get(`${API_BASE}/health`, { timeout: 6000 })
      .then((res) => alive && setHealth(res.data))
      .catch(() => alive && setHealth(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [tick]);

  const recheck = () => { setLoading(true); setTick(tick + 1); };

  const rows = [
    health
      ? { name: "Server", ok: true, text: "Running." }
      : {
          name: "Server",
          ok: false,
          text: `Not reachable at ${API_BASE}. Start it with start.bat, or run "npm start" inside the server folder. If its window shows an error, that error is the reason.`,
        },
    !health
      ? { name: "Database", ok: null, text: "Cannot be checked until the server runs." }
      : health.database === "ok"
        ? { name: "Database", ok: true, text: "Connected." }
        : { name: "Database", ok: false, text: DB_HELP[health.database] || `Database problem (${health.database}). Read the server window for details.` },
    !health || health.database !== "ok"
      ? { name: "Map location data", ok: null, text: "Cannot be checked until the database is connected." }
      : health.locationColumns === "ok"
        ? { name: "Map location data", ok: true, text: "Ready." }
        : { name: "Map location data", ok: false, text: "Missing. Restart the server and it adds the columns by itself." },
  ];

  return (
    <section className="sec">
      <div className="sec-in" style={{ maxWidth: 720 }}>
        <h2>System status</h2>
        <p className="sec-lead">This checks that the three parts of MedFinder are working.</p>

        <div style={{ display: "grid", gap: 12 }} aria-live="polite">
          {rows.map((r) => (
            <div key={r.name} className="panel" style={{ gap: 4 }}>
              <h3 style={{ fontSize: 18 }}>
                {r.name}{" "}
                <span className={`dash-badge ${r.ok === true ? "ok" : r.ok === false ? "no" : "wait"}`}>
                  {loading ? "Checking…" : r.ok === true ? "OK" : r.ok === false ? "Problem" : "Waiting"}
                </span>
              </h3>
              <p style={{ margin: 0 }}>{loading ? "" : r.text}</p>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 20 }}>
          <button type="button" className="site-btn solid" onClick={recheck} disabled={loading}>Check again</button>
        </p>
      </div>
    </section>
  );
}

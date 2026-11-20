import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashShell from "../components/DashShell";
import api from "../api";
import { ago, isOpenNow, money, stockStatus } from "../utils";
import "./search.css";

const time = (t) => (t ? t.slice(0, 5) : "");

export default function MedicineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const city = params.get("city") || "";

  const [cities, setCities] = useState([]);
  const [res, setRes] = useState({ key: "", data: null, error: "" });
  const key = `${id}|${city}`;
  const loading = res.key !== key;

  useEffect(() => {
    let alive = true;
    api.get(`/search/medicine/${id}`, { params: { city } })
      .then(({ data }) => alive && setRes({ key, data, error: "" }))
      .catch((err) => {
        if (!alive) return;
        const code = err.response?.status;
        if (code === 401 || code === 403) { localStorage.clear(); navigate("/login"); return; }
        const msg = !err.response ? "Cannot reach the server. Check that the backend is running."
          : (typeof err.response.data === "object" && err.response.data.error) || "Could not load this medicine.";
        setRes({ key, data: null, error: msg });
      });
    return () => { alive = false; };
  }, [key, id, city, navigate]);

  useEffect(() => {
    api.get("/search/cities").then(({ data }) => setCities(data)).catch(() => {});
  }, []);

  const med = res.data?.medicine;
  const pharmacies = res.data?.pharmacies || [];
  const cheapest = pharmacies.find((p) => p.quantity > 0)?.stock_id;
  const back = `/search${city ? `?city=${encodeURIComponent(city)}` : ""}`;

  return (
    <DashShell tag="Customer">
      <Link className="srch-back" to={back}>← Back to search</Link>

      {res.error && <div className="srch-error" role="alert">{res.error}</div>}
      {loading && !res.error && <p className="dash-sub">Loading…</p>}

      {med && (
        <>
          <div className="dash-card srch-head">
            <h1>{med.name} <span>{med.strength}</span></h1>
            <p className="dash-sub">{med.generic_name ? `${med.generic_name} · ` : ""}{med.form}</p>
          </div>

          <div className="srch-row">
            <h2>Pharmacies with this medicine</h2>
            <label className="srch-field srch-inline">
              City
              <select value={city} onChange={(e) => setParams(e.target.value ? { city: e.target.value } : {}, { replace: true })}>
                <option value="">All cities</option>
                {cities.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          {!pharmacies.length && !loading && (
            <div className="dash-card srch-empty">
              <b>No pharmacy lists this medicine{city ? ` in ${city}` : ""}.</b>
              <p className="dash-sub">Try another city, or search for a medicine with the same generic name.</p>
            </div>
          )}

          <div className="srch-list">
            {pharmacies.map((p) => {
              const st = stockStatus(p.quantity);
              const open = isOpenNow(p.opening_time, p.closing_time);
              const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.pharmacy_name}, ${p.address}, ${p.city}`)}`;
              return (
                <article className={`srch-ph${p.quantity === 0 ? " out" : ""}`} key={p.stock_id}>
                  <div className="srch-info">
                    <h2>{p.pharmacy_name}{p.stock_id === cheapest && <span className="dash-badge ok srch-best">Lowest price</span>}</h2>
                    <p>{p.address}, {p.city}</p>
                    <p className="srch-meta">
                      {open !== null && <span className={`srch-open ${open ? "yes" : "no"}`}>{open ? "Open now" : "Closed now"}</span>}
                      {p.opening_time && <> {time(p.opening_time)} to {time(p.closing_time)} · </>}
                      stock updated {ago(p.updated_at)}
                    </p>
                    <p className="srch-links">
                      {p.phone && <a href={`tel:${p.phone}`}>Call {p.phone}</a>}
                      <a href={maps} target="_blank" rel="noreferrer">Get directions</a>
                    </p>
                  </div>
                  <div className="srch-price">
                    <b>{money(p.price)}</b>
                    <span className={`dash-badge ${st.cls}`}>{st.label}</span>
                    {st.cls === "wait" && <small>Only {p.quantity} left</small>}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </DashShell>
  );
}

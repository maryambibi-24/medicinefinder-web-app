import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DashShell from "../components/DashShell";
import NearYou from "../components/NearYou";
import useMyLocation from "../hooks/useMyLocation";
import { distanceLabel } from "../geo";
import api from "../api";
import { ago, money } from "../utils";
import "./search.css";

export default function SearchMedicine() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const city = params.get("city") || "";
  const inStock = params.get("stock") === "1";
  const radius = params.get("radius") || "";
  const [loc, setLoc] = useMyLocation();
  const rawSort = params.get("sort") || "name";
  const sort = rawSort === "nearest" && !loc ? "name" : rawSort; // "nearest" needs a location

  const [text, setText] = useState(q); // what is typed in the box
  const [cities, setCities] = useState([]);
  const [res, setRes] = useState({ key: "", items: [], error: "" });

  const key = `${q}|${city}|${inStock}|${sort}|${loc?.lat}|${loc?.lng}|${radius}`;
  const loading = res.key !== key;

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  // Typing updates the address after a short pause, which triggers the search
  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() !== q) update({ q: text.trim() });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const fail = (err, fallback) => {
    if ([401, 403].includes(err.response?.status)) { localStorage.clear(); navigate("/login"); return null; }
    if (!err.response) return "Cannot reach the server. Check that the backend is running.";
    if (err.response.status === 404 && typeof err.response.data !== "object") return "The server does not have the search feature yet. Restart it with npm start after updating.";
    return err.response?.data?.error || fallback;
  };

  useEffect(() => {
    let alive = true;
    api.get("/search", {
      params: {
        q, city, inStock: inStock ? 1 : undefined, sort,
        lat: loc?.lat, lng: loc?.lng, radius: loc && radius ? radius : undefined,
      },
    })
      .then(({ data }) => alive && setRes({ key, items: data, error: "" }))
      .catch((err) => {
        const msg = fail(err, "Search failed. Try again.");
        if (alive && msg) setRes({ key, items: [], error: msg });
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    api.get("/search/cities").then(({ data }) => setCities(data)).catch(() => {});
  }, []);

  const detailLink = (id) => {
    const next = new URLSearchParams();
    if (city) next.set("city", city);
    if (loc && radius) next.set("radius", radius);
    return `/medicine/${id}${next.toString() ? `?${next}` : ""}`;
  };

  return (
    <DashShell tag="Customer">
      <Link className="srch-back" to="/dashboard">← Back to dashboard</Link>
      <h1>Search medicine</h1>

      <div className="dash-card srch-bar">
        <label className="srch-main">
          <span className="srch-sr">Medicine name</span>
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search by brand or generic name, e.g. Panadol or paracetamol"
            autoFocus
          />
        </label>
        <label className="srch-field">
          City
          <select value={city} onChange={(e) => update({ city: e.target.value })}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="srch-field">
          Sort by
          <select value={sort} onChange={(e) => update({ sort: e.target.value === "name" ? "" : e.target.value })}>
            <option value="name">Name</option>
            <option value="price">Lowest price</option>
            <option value="recent">Recently updated</option>
            {loc && <option value="nearest">Nearest</option>}
          </select>
        </label>
        <label className="srch-check">
          <input type="checkbox" checked={inStock} onChange={(e) => update({ stock: e.target.checked ? "1" : "" })} />
          In stock only
        </label>
      </div>

      <NearYou loc={loc} onLoc={setLoc} radius={radius} onRadius={(v) => update({ radius: v })} />

      <p className="dash-sub" aria-live="polite">
        {loading ? "Searching…" : res.error ? "" : q
          ? `${res.items.length} result${res.items.length === 1 ? "" : "s"} for “${q}”`
          : "Medicines available at pharmacies"}
      </p>

      {res.error && <div className="srch-error" role="alert">{res.error}</div>}

      {!loading && !res.error && !res.items.length && (
        <div className="dash-card srch-empty">
          <b>No medicine found{q ? ` for “${q}”` : ""}.</b>
          <p className="dash-sub">
            {loc && radius
              ? `Nothing found within ${radius} km. Try a larger distance, or clear it.`
              : "Try the generic name (for example “paracetamol”), check the spelling, or remove the filters."}
          </p>
        </div>
      )}

      <div className="srch-list">
        {res.items.map((m) => (
          <Link className="srch-card" key={m.id} to={detailLink(m.id)}>
            <div className="srch-info">
              <h2>{m.name} <span>{m.strength}</span> <em>{m.form}</em></h2>
              {m.generic_name && <p>{m.generic_name}</p>}
              <p className="srch-meta">
                {m.nearest_km !== null && <><span className="geo-dist">Nearest pharmacy: {distanceLabel(m.nearest_km)}</span>{" · "}</>}
                {m.in_stock_count > 0
                  ? `In stock at ${m.in_stock_count} of ${m.pharmacy_count} pharmacies`
                  : `Listed at ${m.pharmacy_count} pharmacies`}
                {" · "}updated {ago(m.last_updated)}
              </p>
            </div>
            <div className="srch-price">
              {m.min_price !== null
                ? <><small>From</small><b>{money(m.min_price)}</b></>
                : <><span className="dash-badge no">Out of stock</span><small className="srch-altlink">See alternatives →</small></>}
            </div>
          </Link>
        ))}
      </div>
    </DashShell>
  );
}

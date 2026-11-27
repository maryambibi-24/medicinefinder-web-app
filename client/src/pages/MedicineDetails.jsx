import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashShell from "../components/DashShell";
import MapView from "../components/MapView";
import NearYou from "../components/NearYou";
import ReserveForm from "../components/ReserveForm";
import useMyLocation from "../hooks/useMyLocation";
import { directionsUrl, distanceLabel } from "../geo";
import api from "../api";
import { ago, isOpenNow, money, stockStatus } from "../utils";
import "./search.css";
import "../components/reserve.css";

const time = (t) => (t ? t.slice(0, 5) : "");

export default function MedicineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const city = params.get("city") || "";
  const radius = params.get("radius") || "";
  const [loc, setLoc] = useMyLocation();
  // With a location, nearest pharmacies come first unless the customer chose lowest price
  const sort = loc && params.get("sort") !== "price" ? "nearest" : "price";

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const [cities, setCities] = useState([]);
  const [reserving, setReserving] = useState(null); // stock_id of the pharmacy whose reserve form is open
  const [refresh, setRefresh] = useState(0);        // bumped after a reservation to reload the numbers quietly
  const [res, setRes] = useState({ key: "", data: null, error: "" });
  const key = `${id}|${city}|${loc?.lat}|${loc?.lng}|${radius}|${sort}`;
  const loading = res.key !== key;

  useEffect(() => {
    let alive = true;
    api.get(`/search/medicine/${id}`, {
      params: { city, sort, lat: loc?.lat, lng: loc?.lng, radius: loc && radius ? radius : undefined },
    })
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
  }, [key, id, city, sort, loc, radius, navigate, refresh]);

  useEffect(() => {
    api.get("/search/cities").then(({ data }) => setCities(data)).catch(() => {});
  }, []);

  const med = res.data?.medicine;
  const pharmacies = res.data?.pharmacies || [];
  const alternatives = res.data?.alternatives || [];
  const noStock = !loading && !!med && !pharmacies.some((p) => p.quantity > 0);
  // City and distance travel with the customer to the next page
  const carry = new URLSearchParams();
  if (city) carry.set("city", city);
  if (loc && radius) carry.set("radius", radius);
  const carryQuery = carry.toString() ? `?${carry}` : "";
  const back = `/search${carryQuery}`;

  const inStockList = pharmacies.filter((p) => p.quantity > 0);
  const cheapest = inStockList.reduce((a, b) => (!a || b.price < a.price ? b : a), null)?.stock_id;
  const closest = loc
    ? inStockList.filter((p) => p.distance_km !== null).reduce((a, b) => (!a || b.distance_km < a.distance_km ? b : a), null)?.stock_id
    : null;

  // Pharmacies that have placed a pin are shown on the map
  const markers = pharmacies
    .filter((p) => p.latitude !== null && p.longitude !== null)
    .map((p) => {
      const st = stockStatus(p.quantity);
      return {
        lat: p.latitude,
        lng: p.longitude,
        tone: st.cls,
        title: p.pharmacy_name,
        lines: [
          `${money(p.price)} · ${st.label}`,
          ...(p.distance_km !== null ? [distanceLabel(p.distance_km)] : []),
          `${p.address}, ${p.city}`,
        ],
        href: directionsUrl(p.latitude, p.longitude),
      };
    });
  const unpinned = pharmacies.length - markers.length;

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

          <NearYou loc={loc} onLoc={setLoc} radius={radius} onRadius={(v) => update({ radius: v })} />

          <div className="srch-row">
            <h2>Pharmacies with this medicine</h2>
            <div className="geo-row">
              {loc && (
                <label className="srch-field srch-inline">
                  Sort by
                  <select value={sort} onChange={(e) => update({ sort: e.target.value === "price" ? "price" : "" })}>
                    <option value="nearest">Nearest first</option>
                    <option value="price">Lowest price</option>
                  </select>
                </label>
              )}
              <label className="srch-field srch-inline">
                City
                <select value={city} onChange={(e) => update({ city: e.target.value })}>
                  <option value="">All cities</option>
                  {cities.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </div>

          {markers.length > 0 && (
            <div className="geo-mapwrap">
              <MapView markers={markers} me={loc} height={340} label="Map of pharmacies that have this medicine" />
              <p className="geo-legend">
                <span><i className="ok" />In stock</span>
                <span><i className="wait" />Low stock</span>
                <span><i className="no" />Out of stock</span>
                {loc && <span><i className="me" />You</span>}
              </p>
            </div>
          )}
          {!loading && unpinned > 0 && pharmacies.length > 0 && (
            <p className="geo-hint">
              {unpinned === 1 ? "1 pharmacy has" : `${unpinned} pharmacies have`} not placed a pin on the map yet.
            </p>
          )}

          {!pharmacies.length && !loading && (
            <div className="dash-card srch-empty">
              <b>No pharmacy lists this medicine{city ? ` in ${city}` : ""}{loc && radius ? ` within ${radius} km` : ""}.</b>
              <p className="dash-sub">{loc && radius ? "Try a larger distance, another city, or a medicine with the same generic name." : "Try another city, or search for a medicine with the same generic name."}</p>
            </div>
          )}

          <div className="srch-list">
            {pharmacies.map((p) => {
              const st = stockStatus(p.quantity);
              const open = isOpenNow(p.opening_time, p.closing_time);
              const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.pharmacy_name}, ${p.address}, ${p.city}`)}`;
              return (
                <Fragment key={p.stock_id}>
                <article className={`srch-ph${p.quantity === 0 ? " out" : ""}`}>
                  <div className="srch-info">
                    <h2>
                      {p.pharmacy_name}
                      {p.stock_id === cheapest && <span className="dash-badge ok srch-best">Lowest price</span>}
                      {p.stock_id === closest && <span className="dash-badge wait srch-best">Closest</span>}
                    </h2>
                    <p>{p.address}, {p.city}</p>
                    <p className="srch-meta">
                      {p.distance_km !== null && <><span className="geo-dist">{distanceLabel(p.distance_km)}</span>{" · "}</>}
                      {open !== null && <span className={`srch-open ${open ? "yes" : "no"}`}>{open ? "Open now" : "Closed now"}</span>}
                      {p.opening_time && <> {time(p.opening_time)} to {time(p.closing_time)} · </>}
                      stock updated {ago(p.updated_at)}
                    </p>
                    <p className="srch-links">
                      {p.phone && <a href={`tel:${p.phone}`}>Call {p.phone}</a>}
                      <a href={p.latitude !== null ? directionsUrl(p.latitude, p.longitude) : maps} target="_blank" rel="noreferrer">Get directions</a>
                    </p>
                  </div>
                  <div className="srch-price">
                    <b>{money(p.price)}</b>
                    <span className={`dash-badge ${st.cls}`}>{st.label}</span>
                    {st.cls === "wait" && <small>Only {p.quantity} left</small>}
                    {p.quantity > 0 && reserving !== p.stock_id && (
                      <button type="button" className="rsv-open" onClick={() => setReserving(p.stock_id)}>Reserve</button>
                    )}
                  </div>
                </article>
                {reserving === p.stock_id && (
                  <ReserveForm
                    p={p}
                    medicineName={med.name}
                    onClose={() => setReserving(null)}
                    onReserved={() => setRefresh((n) => n + 1)}
                  />
                )}
                </Fragment>
              );
            })}
          </div>

          {(noStock || alternatives.length > 0) && (
            <section className="srch-alt" id="alternatives" aria-labelledby="alt-title">
              {noStock && (
                <div className="srch-banner" role="status">
                  <b>{med.name} is not in stock{city ? ` in ${city}` : ""}{loc && radius ? ` within ${radius} km` : ""} right now.</b>
                </div>
              )}
              <h2 id="alt-title">{noStock ? "Try these alternatives" : "Other brands with the same ingredient"}</h2>
              {med.generic_name && <p className="dash-sub">Same active ingredient: {med.generic_name}</p>}

              {!alternatives.length && (
                <div className="dash-card srch-empty">
                  <b>No alternative is in stock{city ? ` in ${city}` : ""} right now.</b>
                  <p className="dash-sub">
                    {med.generic_name
                      ? "Try another city, or check again later. Pharmacies update their stock during the day."
                      : "We do not have the active ingredient for this medicine, so we cannot suggest alternatives."}
                  </p>
                </div>
              )}

              <div className="srch-list">
                {alternatives.map((a) => (
                  <Link className="srch-card" key={a.id} to={`/medicine/${a.id}${carryQuery}`}>
                    <div className="srch-info">
                      <h2>{a.name} <span>{a.strength}</span> <em>{a.form}</em></h2>
                      <p className="srch-meta">
                        <span className={`dash-badge ${a.same_pack ? "ok" : "wait"}`}>
                          {a.same_pack ? "Same strength and form" : a.same_form ? "Different strength" : "Different form"}
                        </span>
                        {" "}In stock at {a.pharmacy_count} {a.pharmacy_count === 1 ? "pharmacy" : "pharmacies"}
                      </p>
                    </div>
                    <div className="srch-price"><small>From</small><b>{money(a.min_price)}</b></div>
                  </Link>
                ))}
              </div>

              <p className="srch-note">
                Ask a pharmacist or your doctor before switching to another medicine. Strength and form can differ.
              </p>
            </section>
          )}
        </>
      )}
    </DashShell>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const HOME = { user: "/dashboard", pharmacy: "/pharmacy", admin: "/admin" };

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  // Signed-in customers go straight to search; everyone else logs in first and comes back to it
  const onSearch = (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const target = `/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`;
    if (user?.role === "user") navigate(target);
    else if (user) navigate(HOME[user.role] || "/");
    else navigate("/login", { state: { from: target } });
  };

  return (
    <>
      <section className="hero">
        <div className="hero-in">
          <div>
            <h1>Find your medicine before you leave home</h1>
            <p className="hero-text">
              See which pharmacies near you have it in stock, compare prices, and go to the right one the first time.
            </p>
            <form className="hero-search" onSubmit={onSearch}>
              <label className="srch-sr" htmlFor="home-q" style={{ position: "absolute", left: -9999 }}>Medicine name</label>
              <input id="home-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a medicine, e.g. Panadol" />
              <button className="site-btn solid" type="submit">Search</button>
            </form>
            <p className="hero-hint">Run a pharmacy? <Link to="/register?type=pharmacy">Register it for free</Link></p>
          </div>

          <aside className="demo" aria-label="Example search result">
            <h3>Paracetamol 500 mg</h3>
            <p className="demo-sub">Tablet · 3 pharmacies listed</p>
            <ul>
              <li><b>City Care Pharmacy</b><span className="dash-badge ok">In stock</span><small>Open until 11 pm</small><span className="demo-price">Rs 45</span></li>
              <li><b>Green Cross Pharmacy</b><span className="dash-badge wait">Low stock</span><small>Open until 9 pm</small><span className="demo-price">Rs 48</span></li>
              <li><b>Health Plus Pharmacy</b><span className="dash-badge no">Out of stock</span><small>Closed now</small><span className="demo-price">—</span></li>
            </ul>
            <p className="demo-note">Example only. Real results show pharmacies in your city.</p>
          </aside>
        </div>
      </section>

      <section className="sec">
        <div className="sec-in">
          <h2>Made for both sides of the counter</h2>
          <p className="sec-lead">MedFinder connects people who need medicine with the pharmacies that have it.</p>
          <div className="split">
            <div className="panel">
              <h3>For users</h3>
              <p>Stop calling around or walking from shop to shop.</p>
              <ul className="ticks">
                <li>Search by brand or generic name</li>
                <li>See stock, price and opening hours</li>
                <li>Filter by city and sort by lowest price</li>
              </ul>
              <Link className="site-btn solid" to="/users">See what you get</Link>
            </div>
            <div className="panel dark">
              <h3>For pharmacies</h3>
              <p>Let people nearby see what you have in stock.</p>
              <ul className="ticks">
                <li>List medicines with price and quantity</li>
                <li>Verified by an admin before you go live</li>
                <li>Update stock any time from your dashboard</li>
              </ul>
              <Link className="site-btn light" to="/pharmacies">See how it works for you</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="sec pale">
        <div className="sec-in">
          <h2>How it works</h2>
          <p className="sec-lead">Pharmacies keep their stock up to date, and you search it.</p>
          <ol className="steps">
            <li><span>1</span><div><b>A pharmacy lists its stock</b><p>After the admin verifies its license, a pharmacy adds medicines with prices and quantities.</p></div></li>
            <li><span>2</span><div><b>You search for a medicine</b><p>Type the brand or generic name and see every pharmacy that carries it.</p></div></li>
            <li><span>3</span><div><b>You go to the right pharmacy</b><p>Pick one that is in stock and open, and collect your medicine.</p></div></li>
          </ol>
          <p style={{ marginTop: 20 }}><Link className="site-btn ghost" to="/how-it-works">Read the full guide</Link></p>
        </div>
      </section>

      <section className="cta">
        <h2>Ready to get started?</h2>
        <p>Create a free account as a user or register your pharmacy.</p>
        <div className="site-actions">
          <Link className="site-btn light" to="/register">Create an account</Link>
          <Link className="site-btn line" to="/register?type=pharmacy">Register a pharmacy</Link>
        </div>
      </section>
    </>
  );
}

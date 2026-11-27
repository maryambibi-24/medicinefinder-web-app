import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashShell from "../components/DashShell";
import "./search.css";

// Customer dashboard
export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [q, setQ] = useState("");

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    <DashShell tag="Customer">
      <h1>Welcome, {user.name}</h1>
      <p className="dash-sub">Find medicine at pharmacies near you.</p>

      <form className="dash-card srch-hero" onSubmit={onSearch}>
        <label>
          <span className="srch-sr">Medicine name</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a medicine, e.g. Panadol or paracetamol"
          />
        </label>
        <button className="dash-btn" type="submit">Search</button>
      </form>

      <div className="dash-grid">
        <Link className="dash-tile" to="/search"><b>Browse medicines</b><span>See what pharmacies have in stock.</span></Link>
        <Link className="dash-tile" to="/reservations"><b>My reservations</b><span>Medicine you are holding for pickup, with a countdown.</span></Link>
        <div className="dash-tile"><b>Urgent request</b><span>Ask nearby pharmacies when you cannot find it. Coming soon.</span></div>
      </div>
    </DashShell>
  );
}

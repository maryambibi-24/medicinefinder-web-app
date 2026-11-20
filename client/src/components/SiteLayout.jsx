import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Logo from "./Logo";
import "./auth.css"; // logo styles
import "./site.css";

const HOME = { user: "/dashboard", pharmacy: "/pharmacy", admin: "/admin" };

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/users", label: "Users" },
  { to: "/pharmacies", label: "Pharmacies" },
  { to: "/how-it-works", label: "How it works" },
];

// Frame for the public pages: navigation bar on top, footer at the bottom
export default function SiteLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Close the mobile menu and start each page at the top
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="site">
      <header className="site-bar">
        <div className="site-bar-in">
          <Link to="/" className="site-logo" aria-label="MedFinder home"><Logo size={36} /></Link>

          <button
            className="site-burger"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(!open)}
          >
            <span /><span /><span />
          </button>

          <nav id="site-menu" className={`site-menu${open ? " open" : ""}`} aria-label="Main">
            <ul>
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} end={l.end}>{l.label}</NavLink>
                </li>
              ))}
            </ul>
            <div className="site-actions">
              {user ? (
                <Link className="site-btn solid" to={HOME[user.role] || "/dashboard"}>My dashboard</Link>
              ) : (
                <>
                  <Link className="site-btn line" to="/login">Log in</Link>
                  <Link className="site-btn solid" to="/register">Sign up</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main><Outlet /></main>

      <footer className="site-foot">
        <div className="site-foot-in">
          <div>
            <Logo size={34} />
            <p>Find medicine at pharmacies near you.</p>
          </div>
          <ul>
            {LINKS.map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}
          </ul>
          <p className="site-foot-help">
            Need help? <a href="mailto:support@medfinder.example">support@medfinder.example</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

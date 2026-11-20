import { Link } from "react-router-dom";
import Logo from "./Logo";
import "./auth.css";

// Decorative animated background for the left panel (login page only)
function Scene() {
  const caps = [
    { left: "6%", top: "14%", r: "-28deg", d: "11s", s: 1 },
    { left: "58%", top: "8%", r: "18deg", d: "13s", s: 0.8 },
    { left: "74%", top: "34%", r: "-12deg", d: "9s", s: 1.1 },
    { left: "12%", top: "62%", r: "32deg", d: "12s", s: 0.9 },
    { left: "46%", top: "78%", r: "-35deg", d: "10s", s: 0.75 },
  ];
  return (
    <div className="lg-scene" aria-hidden="true">
      <div className="lg-rings">
        <span /><span /><span />
        <svg className="lg-pin" width="46" height="46" viewBox="0 0 40 40">
          <path d="M20 5.5c-5.2 0-9.5 4-9.5 9.2 0 6.7 9.5 17.8 9.5 17.8s9.5-11.1 9.5-17.8C29.5 9.5 25.2 5.5 20 5.5z" fill="#7dd3fc" />
          <g transform="rotate(-45 20 14.7)">
            <path d="M20 11.7h-3a3 3 0 0 0 0 6h3z" fill="#fff" />
            <path d="M20 11.7h3a3 3 0 0 1 0 6h-3z" fill="#1d4ed8" />
          </g>
        </svg>
      </div>
      {caps.map((c, i) => (
        <b
          key={i}
          className="lg-cap"
          style={{ left: c.left, top: c.top, "--r": c.r, "--d": c.d, "--s": c.s }}
        />
      ))}
    </div>
  );
}

// Shared two-panel layout for the Login and Register pages
export default function AuthLayout({ title, text, aside, steps, activeStep, footer, fancy, words, children }) {
  return (
    <div className={`auth${fancy ? " auth-fancy" : ""}`}>
      <aside className="auth-aside">
        {fancy && <Scene />}
        <Link to="/" aria-label="MedFinder home" style={{ color: "inherit", textDecoration: "none", alignSelf: "flex-start" }}><Logo /></Link>
        <div className="auth-welcome">
          <h1>{title}</h1>
          <p>{text}</p>
          {words && (
            <div className="lg-words" aria-hidden="true">
              {words.map((w) => <span key={w}>{w}</span>)}
            </div>
          )}
          {aside && <div className="auth-aside-link">{aside}</div>}
          {steps && (
            <ol className="auth-steps">
              {steps.map((s, i) => (
                <li key={s} className={i + 1 === activeStep ? "on" : ""}>
                  <span>{i + 1 < activeStep ? "✓" : i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          )}
        </div>
        <p className="auth-foot">{footer}</p>
      </aside>
      <main className="auth-main">{children}</main>
    </div>
  );
}

import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../components/AuthLayout";
import useNoAutofill from "../hooks/useNoAutofill";

const API = "http://localhost:5000/api/auth";

const HOME = { user: "/dashboard", pharmacy: "/pharmacy", admin: "/admin" };

const icon = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const MailIcon = () => (<svg {...icon}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 8 8 6 8-6" /></svg>);
const LockIcon = () => (<svg {...icon}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.registered;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // Fields stay read-only until clicked, so the browser does not auto-fill saved logins
  const [armed, setArmed] = useState(false);

  // The login fields are always empty when the page opens
  const formRef = useRef(null);
  useNoAutofill(formRef, () => { setEmail(""); setPassword(""); });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post(`${API}/login`, { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setDone(true); 
      setTimeout(() => navigate(HOME[data.user.role] || "/dashboard"), 900);
    } catch (err) {
      setError(err.response?.data?.error || "Cannot reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      fancy
      title="Welcome to MedFinder"
      text="Find the medicine you need at a pharmacy near you, or let people nearby find what you have in stock."
      words={["Find medicine nearby", "Reserve before you go", "Get it delivered home"]}
      aside={<>Are you a pharmacy? <Link to="/register?type=pharmacy">Register here</Link></>}
      footer={<>Need help? <a href="mailto:support@medfinder.example">Contact support</a></>}
    >
      <form
        ref={formRef}
        className={`auth-card narrow lg-card${done ? " leave" : ""}`}
        onSubmit={onSubmit}
        autoComplete="off"
        noValidate
      >
        {/* Hidden decoy fields: browsers put saved logins here instead of in the real fields */}
        <div style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden", opacity: 0 }} aria-hidden="true">
          <input type="text" name="decoy-user" tabIndex={-1} autoComplete="username" />
          <input type="password" name="decoy-pass" tabIndex={-1} autoComplete="current-password" />
        </div>

        <h2>Log in</h2>
        <p className="auth-sub">Login as customers, pharmacies and administrators.</p>

        {justRegistered && (
          <div className="alert ok" role="status">Account created. You can log in now.</div>
        )}
        {error && (
          <div className="alert error" role="alert" key={error}>{error}</div>
        )}

        <label className="field">
          Email
          <span className="lg-in">
            <MailIcon />
            <input
              name="mf-login-id"
              type="email"
              autoComplete="off"
              readOnly={!armed}
              onFocus={() => setArmed(true)}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </span>
        </label>

        <div className="field">
          <div className="row">
            <label htmlFor="mf-login-secret">Password</label>
            <a className="link" href="#">Forgot password?</a>
          </div>
          <div className="lg-in pw">
            <LockIcon />
            <input
              id="mf-login-secret"
              name="mf-login-secret"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              readOnly={!armed}
              onFocus={() => setArmed(true)}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button className={`btn lg-btn${done ? " success" : ""}`} type="submit" disabled={loading || done}>
          {done ? (
            <>
              <svg {...icon} strokeWidth={3} className="lg-check"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              Welcome!
            </>
          ) : loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Logging in…
            </>
          ) : (
            "Log in"
          )}
        </button>

        <p className="center">
          New to MedFinder? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";

const API = "http://localhost:5000/api/auth";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post(`${API}/login`, form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user.role === "pharmacy" ? "/pharmacy" : "/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error || "Cannot reach the server. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-aside">
        <span className="login-logo">MedFinder</span>
        <div>
          <h1>Know where your medicine is before you leave home.</h1>
          <ul>
            <li>Live stock from registered pharmacies</li>
            <li>Reserve medicine or get it delivered</li>
            <li>Ask nearby pharmacies when you cannot find it</li>
          </ul>
        </div>
      </aside>

      <main className="login-main">
        <form className="login-card" onSubmit={onSubmit} noValidate>
          <h2>Sign in</h2>
          <p className="login-sub">Use the account you registered with.</p>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={onChange}
            placeholder="name@example.com"
          />

          <label htmlFor="password">Password</label>
          <div className="login-password">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={onChange}
            />
            <button
              type="button"
              className="login-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="login-foot">
            New to MedFinder? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </main>
    </div>
  );
}

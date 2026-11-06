import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css"; // uses the same styles as the Login page

const API = "http://localhost:5000/api/auth";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Fill in your name, email and password.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API}/register`, form);
      navigate("/login");
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
          <h1>One account, every pharmacy near you.</h1>
          <ul>
            <li>Check stock before you travel</li>
            <li>Reserve medicine or get it delivered</li>
            <li>Pharmacies keep their stock up to date</li>
          </ul>
        </div>
      </aside>

      <main className="login-main">
        <form className="login-card" onSubmit={onSubmit} noValidate>
          <h2>Create your account</h2>
          <p className="login-sub">It takes about a minute.</p>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <label htmlFor="name">Full name</label>
          <input id="name" name="name" autoComplete="name" value={form.name} onChange={onChange} />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} />

          <label htmlFor="password">Password (at least 8 characters)</label>
          <input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={onChange} />

          <label htmlFor="role">I am a</label>
          <select id="role" name="role" value={form.role} onChange={onChange} className="login-select">
            <option value="user">Person looking for medicine</option>
            <option value="pharmacy">Pharmacy</option>
          </select>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="login-foot">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </main>
    </div>
  );
}

import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../components/AuthLayout";
import useNoAutofill from "../hooks/useNoAutofill";
import { LazyMapPicker } from "../components/LazyMap";

const API = "http://localhost:5000/api/auth";
const PHARMACY_STEPS = ["Pharmacy details", "We verify your license", "Go live and update stock"];

const empty = {
  name: "", phone: "", email: "", password: "",
  pharmacyName: "", licenseNumber: "", address: "", city: "",
  openingTime: "09:00", closingTime: "23:00",
};

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("type") === "pharmacy" ? "pharmacy" : "user");
  const [form, setForm] = useState(empty);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false); // pharmacy waiting for verification
  const [armed, setArmed] = useState(false); // fields are read-only until clicked (stops browser auto-fill)

  const [point, setPoint] = useState(null); // pharmacy position on the map
  const formRef = useRef(null);
  useNoAutofill(formRef, () => setForm(empty));

  const isPharmacy = role === "pharmacy";
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const field = (label, name, props = {}) => (
    <label className="field">
      {label}
      <input name={name} value={form[name]} onChange={onChange} readOnly={!armed} onFocus={() => setArmed(true)} {...props} />
    </label>
  );

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
    if (isPharmacy && (!form.pharmacyName.trim() || !form.licenseNumber.trim() || !form.address.trim() || !form.city.trim())) {
      setError("Fill in all the pharmacy details.");
      return;
    }
    if (isPharmacy && !point) {
      setError("Choose your pharmacy location on the map.");
      return;
    }
    if (!agree) {
      setError("Please agree to the Terms and Privacy Policy.");
      return;
    }

    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      password: form.password,
      role,
      pharmacy: isPharmacy
        ? {
            name: form.pharmacyName,
            licenseNumber: form.licenseNumber,
            address: form.address,
            city: form.city,
            openingTime: form.openingTime,
            closingTime: form.closingTime,
            latitude: point?.lat,
            longitude: point?.lng,
          }
        : undefined,
    };

    try {
      setLoading(true);
      const { data } = await axios.post(`${API}/register`, payload);
      if (data.pendingVerification) setSubmitted(true);
      else navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.error || "Cannot reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Screen shown after a pharmacy registers
  if (submitted) {
    return (
      <AuthLayout
        title="Thank you"
        text="Your pharmacy details are with us."
        steps={PHARMACY_STEPS}
        activeStep={2}
        footer={<>Track your status: <Link to="/login" style={{ color: "#fff" }}>Log in</Link></>}
      >
        <div className="auth-card narrow">
          <h2>Submitted for verification</h2>
          <p className="auth-sub">
            We are checking your license. You can log in now to follow the verification status.
          </p>
          <div className="status">
            <div className="done"><span>✓</span>Details submitted</div>
            <div className="now"><span>2</span><b>License under review</b></div>
            <div><span>3</span>Go live and update stock</div>
          </div>
          <button className="btn" onClick={() => navigate("/login")}>Log in to check status</button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={isPharmacy ? "Register your pharmacy" : "Create your account"}
      text={
        isPharmacy
          ? "Join MedFinder and let people nearby see what you have in stock."
          : "Search nearby pharmacies, reserve medicine and get it delivered."
      }
      steps={isPharmacy ? PHARMACY_STEPS : undefined}
      activeStep={1}
      footer={<>Already registered? <Link to="/login">Log in</Link></>}
    >
      <form ref={formRef} className="auth-card" onSubmit={onSubmit} autoComplete="off" noValidate>
        <h2>{isPharmacy ? "Pharmacy registration" : "Create your account"}</h2>

        <div className="seg" role="group" aria-label="Account type">
          <button type="button" className={!isPharmacy ? "on" : ""} aria-pressed={!isPharmacy} onClick={() => setRole("user")}>
            Medicine seeker
          </button>
          <button type="button" className={isPharmacy ? "on" : ""} aria-pressed={isPharmacy} onClick={() => setRole("pharmacy")}>
            Pharmacy
          </button>
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}

        {isPharmacy && (
          <>
            <p className="section-title">Pharmacy details</p>
            <div className="grid2">
              {field("Pharmacy name", "pharmacyName", { placeholder: "Pharmacy name" })}
              {field("License number", "licenseNumber", { placeholder: "License number" })}
              {field("Street address", "address", { placeholder: "Street, area" })}
              {field("City", "city", { placeholder: "City" })}
              {field("Opening time", "openingTime", { type: "time" })}
              {field("Closing time", "closingTime", { type: "time" })}
            </div>
            <p className="section-title">Pharmacy location</p>
            <p className="note">Customers use this to see how far you are. Click the map to place the pin, or use your current location if you are at the pharmacy.</p>
            <LazyMapPicker value={point} onChange={setPoint} height={280} />
            <p className="section-title">Owner account</p>
          </>
        )}

        <div className="grid2">
          {field(isPharmacy ? "Owner full name" : "Full name", "name", { placeholder: "Full name", autoComplete: "off" })}
          {field("Mobile number", "phone", { placeholder: "+92 3XX XXXXXXX", autoComplete: "off" })}
          {field("Email", "email", { type: "email", placeholder: "name@example.com", autoComplete: "off" })}
          {field("Password", "password", { type: "password", placeholder: "At least 8 characters", autoComplete: "new-password" })}
        </div>

        <label className="check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a></span>
        </label>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Please wait…" : isPharmacy ? "Submit for verification" : "Create account"}
        </button>

        {isPharmacy && (
          <p className="note">Your pharmacy appears in search after your license is verified.</p>
        )}
      </form>
    </AuthLayout>
  );
}

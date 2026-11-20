import { useNavigate } from "react-router-dom";
import Logo from "./Logo";
import "./auth.css"; // logo styles
import "./dash.css";

// Shared page frame for the customer, pharmacy and admin dashboards
export default function DashShell({ tag, children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="dash">
      <header className="dash-bar">
        <Logo size={38} />
        <span className="dash-tag">{tag}</span>
        <span className="dash-user">{user?.name}</span>
        <button className="dash-out" onClick={logout}>Sign out</button>
      </header>
      <main className="dash-main">{children}</main>
    </div>
  );
}

import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={{ padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}. You are signed in as a user.</p>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}

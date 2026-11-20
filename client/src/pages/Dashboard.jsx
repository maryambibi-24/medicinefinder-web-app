import DashShell from "../components/DashShell";

// Customer dashboard (the search screens come in the next build steps)
export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <DashShell tag="Customer">
      <h1>Welcome, {user.name}</h1>
      <p className="dash-sub">Find medicine at pharmacies near you.</p>
      <div className="dash-grid">
        <div className="dash-tile"><b>Search medicine</b><span>Check live stock and prices. Coming next.</span></div>
        <div className="dash-tile"><b>My reservations</b><span>Medicine you are holding for pickup.</span></div>
        <div className="dash-tile"><b>Urgent request</b><span>Ask nearby pharmacies when you cannot find it.</span></div>
      </div>
    </DashShell>
  );
}

import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PharmacyHome from "./pages/PharmacyHome";
import AdminPharmacies from "./pages/AdminPharmacies";
import PharmacyStock from "./pages/PharmacyStock";

// Only lets signed-in people in. If "role" is given, only that role may enter.
function Protected({ role, children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Protected role="user"><Dashboard /></Protected>} />
      <Route path="/pharmacy" element={<Protected role="pharmacy"><PharmacyHome /></Protected>} />
      <Route path="/pharmacy/stock" element={<Protected role="pharmacy"><PharmacyStock /></Protected>} />
      <Route path="/admin" element={<Protected role="admin"><AdminPharmacies /></Protected>} />
    </Routes>
  );
}

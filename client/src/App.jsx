import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import SiteLayout from "./components/SiteLayout";
import Home from "./pages/Home";
import ForUsers from "./pages/ForUsers";
import ForPharmacies from "./pages/ForPharmacies";
import HowItWorks from "./pages/HowItWorks";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PharmacyHome from "./pages/PharmacyHome";
import AdminPharmacies from "./pages/AdminPharmacies";
import PharmacyStock from "./pages/PharmacyStock";
import SearchMedicine from "./pages/SearchMedicine";
import MedicineDetails from "./pages/MedicineDetails";

// Only lets signed-in people in. If "role" is given, only that role may enter.
function Protected({ role, children }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/users" element={<ForUsers />} />
        <Route path="/pharmacies" element={<ForPharmacies />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Protected role="user"><Dashboard /></Protected>} />
      <Route path="/search" element={<Protected role="user"><SearchMedicine /></Protected>} />
      <Route path="/medicine/:id" element={<Protected role="user"><MedicineDetails /></Protected>} />
      <Route path="/pharmacy" element={<Protected role="pharmacy"><PharmacyHome /></Protected>} />
      <Route path="/pharmacy/stock" element={<Protected role="pharmacy"><PharmacyStock /></Protected>} />
      <Route path="/admin" element={<Protected role="admin"><AdminPharmacies /></Protected>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

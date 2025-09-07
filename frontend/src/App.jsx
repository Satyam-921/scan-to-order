import React from "react";
import { Routes, Route } from "react-router-dom";
import CustomerPage from "./pages/customer_page.jsx";
import OwnerDashboard from "./pages/owner_page.jsx";
// import AdminPage from "./pages/AdminPage.jsx"; // for later

function App() {
  return (
    <Routes>
      <Route path="/order/:restaurant_id" element={<CustomerPage />} />
      <Route path = "/owner_dashboard" element={<OwnerDashboard />} />
      {/* Future route for admin panel */}
      {/* <Route path="/admin" element={<AdminPage />} /> */}
    </Routes>
  );
}

export default App;

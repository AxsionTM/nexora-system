import { Route, Routes } from "react-router-dom";

import LandingPage from "@/pages/LandingPage";
import FoundationStatus from "@/pages/FoundationStatus";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/status" element={<FoundationStatus />} />
      {/* Auth and app routes will be added in later commits */}
      <Route path="/login" element={<LandingPage />} />
      <Route path="/register" element={<LandingPage />} />
      <Route path="/demo" element={<LandingPage />} />
    </Routes>
  );
}

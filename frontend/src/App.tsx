import { Route, Routes } from "react-router-dom";

import FoundationStatus from "@/pages/FoundationStatus";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FoundationStatus />} />
    </Routes>
  );
}

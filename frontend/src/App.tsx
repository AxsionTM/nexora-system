import { useEffect } from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import LandingPage from "@/pages/LandingPage";
import FoundationStatus from "@/pages/FoundationStatus";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import DashboardPage from "@/pages/app/DashboardPage";
import PlaceholderPage from "@/pages/app/PlaceholderPage";
import ProductsPage from "@/pages/app/ProductsPage";
import CustomersPage from "@/pages/app/CustomersPage";
import OrdersPage from "@/pages/app/OrdersPage";
import AnalyticsPage from "@/pages/app/AnalyticsPage";
import ExpensesPage from "@/pages/app/ExpensesPage";
import TeamPage from "@/pages/app/TeamPage";
import SettingsPage from "@/pages/app/SettingsPage";
import AIPage from "@/pages/app/AIPage";
import { useAuthStore } from "@/stores/auth";

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthBootstrap>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/status" element={<FoundationStatus />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthBootstrap>
  );
}

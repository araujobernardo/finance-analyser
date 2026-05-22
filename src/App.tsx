import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AccountProvider } from "./context/AccountContext";
import { NetWorthProvider } from "./context/NetWorthContext";
import { GoalsProvider } from "./context/GoalsContext";
import { BudgetProvider } from "./context/BudgetContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { AlertBanner } from "./components/AlertBanner";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import NetWorthPage from "./pages/NetWorthPage";
import { GoalsPage } from "./pages/GoalsPage";
import BudgetPage from "./pages/BudgetPage";
import { SignUpPage } from "./pages/SignUpPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import "./App.css";

// ── App Shell ────────────────────────────────────────────────────────────────
// Thin provider tree + router. All data state has been moved to contexts
// and page components (FA-CORE-001 T003–T011).

function AppShell() {
  const { user } = useAuth();

  // Key the entire data-provider subtree on the authenticated user's id.
  // When the user changes (login / logout), React unmounts every provider and
  // re-mounts a fresh instance — guaranteeing all context state is reset and
  // re-fetched with the new user's JWT. This is the primary fix for the
  // cross-user data-isolation bug (#677).
  const userKey = user?.id ?? "unauthenticated";

  return (
    <ToastProvider key={userKey}>
      <AccountProvider>
        <GoalsProvider>
          <BudgetProvider>
            <div className="app-shell">
              <Sidebar />
              <div className="app-content">
                <AlertBanner />
                <Routes>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route
                    path="/net-worth"
                    element={
                      <NetWorthProvider>
                        <NetWorthPage />
                      </NetWorthProvider>
                    }
                  />
                  <Route path="/goals" element={<GoalsPage />} />
                  <Route path="/budget" element={<BudgetPage />} />
                </Routes>
              </div>
            </div>
            <Toast />
          </BudgetProvider>
        </GoalsProvider>
      </AccountProvider>
    </ToastProvider>
  );
}

// ── Root App ────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth routes — redirect to /dashboard if already signed in */}
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignUpPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="/verify-email-sent" element={<VerifyEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />
        {/* Protected app shell — all other routes */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

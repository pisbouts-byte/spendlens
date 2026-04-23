import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.ts";
import { Spinner } from "./components/ui/Spinner.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { AppLayout } from "./components/layout/AppLayout.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.tsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { TransactionsPage } from "./pages/TransactionsPage.tsx";
import { CategoriesPage } from "./pages/CategoriesPage.tsx";
import { BudgetsPage } from "./pages/BudgetsPage.tsx";
import { ReportsPage } from "./pages/ReportsPage.tsx";
import { RecurringPage } from "./pages/RecurringPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { AccountsPage } from "./pages/AccountsPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="recurring" element={<RecurringPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

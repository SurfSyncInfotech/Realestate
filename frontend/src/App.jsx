import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import PropertyPage from "./pages/PropertyPage.jsx";
import InformationPage from "./pages/InformationPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import AgentDashboard from "./pages/AgentDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import { ArticlePage, CityPage } from "./pages/DetailPages.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import RequireRole from "./components/RequireRole.jsx";
import RevealManager from "./hooks/RevealManager.jsx";
import ScrollToTop from "./hooks/ScrollToTop.jsx";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <RevealManager />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/property/:id" element={<PropertyPage />} />
        <Route path="/sign-in" element={<AccountPage />} />
        <Route path="/register" element={<AccountPage register />} />
        <Route path="/agent" element={<AccountPage portal="agent" />} />
        <Route path="/agent/register" element={<AccountPage portal="agent" register />} />
        <Route path="/admin" element={<AccountPage portal="admin" />} />

        {/* Signed-in areas. The API enforces the same roles server-side. */}
        <Route
          path="/user-dashboard"
          element={
            <RequireRole roles={["customer"]}>
              <UserDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <RequireRole roles={["admin"]}>
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/agent"
          element={
            <RequireRole roles={["agent", "builder"]}>
              <AgentDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/builder"
          element={
            <RequireRole roles={["agent", "builder"]}>
              <AgentDashboard />
            </RequireRole>
          }
        />
        <Route path="/dashboard/customer" element={<Navigate to="/user-dashboard" replace />} />
        <Route path="/customer/dashboard" element={<Navigate to="/user-dashboard" replace />} />
        <Route path="/agent/dashboard" element={<Navigate to="/dashboard/agent" replace />} />
        <Route path="/builder/dashboard" element={<Navigate to="/dashboard/builder" replace />} />
        <Route path="/admin/dashboard" element={<Navigate to="/dashboard/admin" replace />} />

        <Route path="/about" element={<InformationPage page="about" />} />
        <Route path="/contact" element={<InformationPage page="contact" />} />
        <Route path="/locations" element={<InformationPage page="locations" />} />
        <Route path="/locations/:slug" element={<CityPage />} />
        <Route path="/journal" element={<InformationPage page="journal" />} />
        <Route path="/journal/:slug" element={<ArticlePage />} />
        <Route path="/faq" element={<InformationPage page="faq" />} />
        <Route path="/privacy" element={<InformationPage page="privacy" />} />
        <Route path="/terms" element={<InformationPage page="terms" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import axios from "axios";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FichePatientPage from "./pages/FichePatientPage";
import SharedViewPage from "./pages/SharedViewPage";
import JournalPage from "./pages/JournalPage";
import DashboardPage from "./pages/DashboardPage";
import AnnuairePage from "./pages/AnnuairePage";
import FichesDroitsPage from "./pages/FichesDroitsPage";
import RapportPage from "./pages/RapportPage";
import OnboardingPage from "./pages/OnboardingPage";
import "./App.css";

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem("stumpr_token");
      localStorage.removeItem("stumpr_user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// Auth helper
const isAuthenticated = () => {
  const token = localStorage.getItem("stumpr_token");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem("stumpr_token");
      localStorage.removeItem("stumpr_user");
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

// Protected Route component
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <div className="min-h-screen bg-surface">
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/fiche-patient"
            element={
              <ProtectedRoute>
                <FichePatientPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fiche-patient/:id"
            element={
              <ProtectedRoute>
                <FichePatientPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/journal"
            element={
              <ProtectedRoute>
                <JournalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tableau-de-bord"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/annuaire"
            element={
              <ProtectedRoute>
                <AnnuairePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fiches-droits"
            element={
              <ProtectedRoute>
                <FichesDroitsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rapport"
            element={
              <ProtectedRoute>
                <RapportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/partage/:shareId" element={<SharedViewPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

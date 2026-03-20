import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FichePatientPage from "./pages/FichePatientPage";
import SharedViewPage from "./pages/SharedViewPage";
import JournalPage from "./pages/JournalPage";
import DashboardPage from "./pages/DashboardPage";
import AnnuairePage from "./pages/AnnuairePage";
import "./App.css";

// Auth helper
const isAuthenticated = () => {
  return localStorage.getItem("stumpr_token") !== null;
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
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fc' }}>
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
          <Route path="/partage/:shareId" element={<SharedViewPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

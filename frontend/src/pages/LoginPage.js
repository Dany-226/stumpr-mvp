import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      localStorage.setItem("stumpr_token", response.data.access_token);
      localStorage.setItem("stumpr_user", JSON.stringify(response.data.user));
      toast.success("Connexion réussie !");
      navigate("/fiche-patient");
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur de connexion";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#f8f9fc' }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 
            className="text-4xl font-bold mb-2" 
            style={{ fontFamily: 'Georgia, serif', color: '#1d7a72' }}
          >
            Stumpr
          </h1>
          <p style={{ color: '#3d4a5c' }}>
            Votre espace patient amputé
          </p>
        </div>

        {/* Login Card */}
        <div className="stumpr-card">
          <h2 
            className="text-2xl font-semibold mb-6 text-center"
            style={{ fontFamily: 'Georgia, serif', color: '#1a1f2e' }}
          >
            Connexion
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-5">
              <label className="stumpr-label" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                data-testid="login-email-input"
                className="stumpr-input"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="stumpr-label" htmlFor="password">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  data-testid="login-password-input"
                  className="stumpr-input pr-12"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: '#8892a4' }}
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              data-testid="login-submit-btn"
              className="stumpr-btn-primary w-full flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <LogIn size={18} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="text-center mt-6" style={{ color: '#3d4a5c' }}>
            Pas encore de compte ?{" "}
            <Link
              to="/register"
              data-testid="register-link"
              className="font-semibold hover:underline"
              style={{ color: '#1d7a72' }}
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

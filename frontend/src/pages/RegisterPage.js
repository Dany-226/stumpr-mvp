import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import axios from "axios";
import StumprLogo from "../components/StumprLogo";

const API = `${process.env.REACT_APP_BACKEND_URL || 'https://stumpr-backend.onrender.com'}/api`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, formData);
      localStorage.setItem("stumpr_token", response.data.access_token);
      localStorage.setItem("stumpr_user", JSON.stringify(response.data.user));
      toast.success("Compte créé avec succès !");
      navigate("/onboarding");
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'inscription";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f0e8' }}>
      {/* White header with logo */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e0d9cf', padding: '16px 24px' }}>
        <StumprLogo size={22} />
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Subtitle */}
        <div className="text-center mb-8">
          <p className="text-lg font-medium" style={{ color: '#3d4a5c' }}>
            Créez votre espace patient
          </p>
        </div>

        {/* Register Card */}
        <div className="stumpr-card">
          <h2 
            className="text-2xl font-semibold mb-6 text-center"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#1a1f2e' }}
          >
            Inscription
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="stumpr-label" htmlFor="prenom">
                  Prénom
                </label>
                <input
                  type="text"
                  id="prenom"
                  name="prenom"
                  data-testid="register-prenom-input"
                  className="stumpr-input"
                  placeholder="Jean"
                  value={formData.prenom}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="stumpr-label" htmlFor="nom">
                  Nom
                </label>
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  data-testid="register-nom-input"
                  className="stumpr-input"
                  placeholder="Dupont"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="mb-5">
              <label className="stumpr-label" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                data-testid="register-email-input"
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
                  data-testid="register-password-input"
                  className="stumpr-input pr-12"
                  placeholder="Minimum 6 caractères"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
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
              data-testid="register-submit-btn"
              className="stumpr-btn-primary w-full flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Créer mon compte
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center mt-6" style={{ color: '#3d4a5c' }}>
            Déjà un compte ?{" "}
            <Link
              to="/"
              data-testid="login-link"
              className="font-semibold hover:underline"
              style={{ color: '#1d7a72' }}
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

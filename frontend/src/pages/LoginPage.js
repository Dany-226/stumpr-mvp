import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";
import axios from "axios";
import StumprLogo from "../components/StumprLogo";

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

      const patientsRes = await axios.get(`${API}/patients`, {
        headers: { Authorization: `Bearer ${response.data.access_token}` },
      });
      const patients = patientsRes.data;
      if (Array.isArray(patients) && patients.length > 0) {
        const id = patients[0].id || patients[0]._id;
        navigate(`/fiche-patient/${id}`);
      } else {
        navigate("/onboarding");
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur de connexion";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header
        className="border-b border-outline-variant/10 px-6 py-4"
        style={{ backgroundColor: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}
      >
        <StumprLogo size={22} />
      </header>

      {/* Central zone */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">

          {/* Tagline */}
          <p className="font-headline text-center text-on-surface-variant mb-8 text-lg">
            Vos droits, vos besoins, enfin clairs.
          </p>

          {/* Login Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm w-full max-w-md">
            <h2 className="font-headline font-bold text-2xl text-on-surface text-center mb-6">
              Connexion
            </h2>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="mb-5">
                <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  data-testid="login-email-input"
                  className="w-full bg-surface-container rounded-xl px-4 py-3 border-none outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface placeholder:text-outline"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Password */}
              <div className="mb-6">
                <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="password">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    data-testid="login-password-input"
                    className="w-full bg-surface-container rounded-xl px-4 py-3 border-none outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface placeholder:text-outline pr-12"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant"
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
                className="w-full bg-primary text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#00386c', color: '#ffffff' }}
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
            <p className="text-center mt-6 text-on-surface-variant">
              Pas encore de compte ?{" "}
              <Link
                to="/register"
                data-testid="register-link"
                className="text-secondary font-semibold hover:underline"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

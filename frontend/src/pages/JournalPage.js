import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const JOURNAL_ACTIVITIES = [
  { id: "marche-courte", label: "Marche courte", emoji: "🚶" },
  { id: "marche-longue", label: "Marche longue", emoji: "🏃" },
  { id: "courses", label: "Courses", emoji: "🛒" },
  { id: "conduite", label: "Conduite", emoji: "🚗" },
  { id: "velo", label: "Vélo", emoji: "🚲" },
  { id: "natation", label: "Natation", emoji: "🏊" },
  { id: "sport-collectif", label: "Sport collectif", emoji: "⚽" },
  { id: "randonnee", label: "Randonnée", emoji: "🏔️" },
  { id: "travail", label: "Travail", emoji: "💼" },
  { id: "sport-intense", label: "Sport intense", emoji: "🏆" },
  { id: "repos", label: "Repos", emoji: "🛋️" },
];

const PROTHESE_TYPE_LABELS = {
  principale: "Principale",
  secours: "Secours",
  bain: "Bain / Douche",
  sport: "Sport",
  autre: "Autre",
};

// Pain slider with gradient
const PainSlider = ({ label, value, onChange, max = 10 }) => {
  const getBadgeColor = (val) => {
    if (val <= 2) return { bg: "#e8f7f0", color: "#2d9e6b" };
    if (val <= 5) return { bg: "#fdf8e3", color: "#c9a227" };
    if (val <= 7) return { bg: "#fdf3e3", color: "#e08c2a" };
    return { bg: "#fdeaea", color: "#d64545" };
  };
  const badge = getBadgeColor(value);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium" style={{ color: "#1a1f2e" }}>{label}</label>
        <span className="text-sm font-bold px-3 py-1 rounded-full min-w-[40px] text-center"
          style={{ backgroundColor: badge.bg, color: badge.color }}>{value}</span>
      </div>
      <input type="range" min="0" max={max} step="1" value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="pain-slider w-full"
        style={{ "--slider-gradient": "linear-gradient(to right, #2d9e6b, #c9a227, #e08c2a, #d64545)" }} />
      <div className="flex justify-between text-xs mt-1" style={{ color: "#8892a4" }}>
        <span>0</span><span>{max}</span>
      </div>
    </div>
  );
};

// Wellbeing slider
const WellbeingSlider = ({ label, emoji, value, onChange, labels }) => {
  const getBadgeColor = (val) => {
    if (val <= 1) return { bg: "#fdeaea", color: "#d64545" };
    if (val === 2) return { bg: "#fdf8e3", color: "#c9a227" };
    return { bg: "#e8f7f0", color: "#2d9e6b" };
  };
  const badge = getBadgeColor(value);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium" style={{ color: "#1a1f2e" }}>{emoji} {label}</label>
        <span className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: badge.bg, color: badge.color }}>{labels[value]}</span>
      </div>
      <input type="range" min="0" max="4" step="1" value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="wellbeing-slider w-full"
        style={{ "--slider-gradient": "linear-gradient(to right, #d64545, #e08c2a, #c9a227, #7cb342, #2d9e6b)" }} />
      <div className="flex justify-between text-xs mt-1" style={{ color: "#8892a4" }}>
        {labels.map((l, i) => (
          <span key={i} className={i === value ? "font-bold" : ""}>{i === 0 || i === 4 ? l : ""}</span>
        ))}
      </div>
    </div>
  );
};

// Activity toggle
const ActivityToggle = ({ activity, isActive, onToggle }) => (
  <button type="button" onClick={onToggle}
    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
      isActive ? "border-[#0e6b63] bg-[#e6f3f2]" : "border-[#e0d9cf] bg-[#f5f0e8] hover:border-[#0e6b63]/50"
    }`}
    style={{ color: isActive ? "#0e6b63" : "#8892a4" }}
    data-testid={`activity-${activity.id}`}>
    <span className="text-xl mb-1">{activity.emoji}</span>
    <span className="text-xs font-medium text-center">{activity.label}</span>
  </button>
);

export default function JournalPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState(null);
  const [activeProtheses, setActiveProtheses] = useState([]);
  const [hasEntryToday, setHasEntryToday] = useState(false);

  // Pain state (new model)
  const [douleurGlobale, setDouleurGlobale] = useState(0);
  const [douleurLieeProthese, setDouleurLieeProthese] = useState(false);
  const [protheseSelectionnee, setProtheseSelectionnee] = useState("");
  const [fantomePain, setFantomePain] = useState(0);

  // Wellbeing
  const [fatigue, setFatigue] = useState(2);
  const [sommeil, setSommeil] = useState(2);
  const [humeur, setHumeur] = useState(2);

  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState("");

  const token = localStorage.getItem("stumpr_token");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      // Load patient
      const patientsRes = await axios.get(`${API}/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (patientsRes.data.length > 0) {
        setPatient(patientsRes.data[0]);
      }

      // Load active protheses
      try {
        const prothesesRes = await axios.get(`${API}/patient/protheses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActiveProtheses(prothesesRes.data.filter(p => p.statut === "active"));
      } catch {
        // No patient yet
      }

      // Check today's entry
      const todayRes = await axios.get(`${API}/journal/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHasEntryToday(todayRes.data.has_entry_today);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const toggleActivity = (activityId) => {
    setActivities(prev =>
      prev.includes(activityId) ? prev.filter(a => a !== activityId) : [...prev, activityId]
    );
  };

  const handleSubmit = async () => {
    if (!patient) {
      toast.error("Aucun patient trouvé. Créez d'abord votre fiche patient.");
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${API}/journal`,
        {
          patient_id: patient.id,
          douleurs: {
            globale: douleurGlobale,
            prothese_id: douleurLieeProthese ? protheseSelectionnee || null : null,
            fantome: fantomePain,
            composants: [],
          },
          bien_etre: { fatigue, sommeil, humeur },
          activites: activities,
          notes: notes || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const hasHighPain = douleurGlobale >= 7 || fantomePain >= 7;
      if (hasHighPain) {
        toast.warning("Entrée enregistrée. Alerte douleur détectée.", { duration: 5000 });
      } else {
        toast.success("Journal enregistré !");
      }
      navigate("/tableau-de-bord");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "#e0d9cf", borderTopColor: "#0e6b63" }} />
          <p style={{ color: "#8892a4" }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 px-6 py-4"
        style={{ borderColor: "#e0d9cf" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/fiche-patient")}
              className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ color: "#3d4a5c" }}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold"
              style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#0e6b63" }}>
              Journal quotidien
            </h1>
          </div>
          <button onClick={() => navigate("/tableau-de-bord")}
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{ backgroundColor: "#e6f3f2", color: "#0e6b63" }}
            data-testid="nav-dashboard">
            📊 Tableau de bord
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {hasEntryToday && (
          <div className="mb-6 p-4 rounded-xl border"
            style={{ backgroundColor: "#fdf8e3", borderColor: "#e08c2a" }}>
            <p className="text-sm" style={{ color: "#8b6914" }}>
              ⚠️ Vous avez déjà enregistré une entrée aujourd'hui. Une nouvelle entrée sera ajoutée.
            </p>
          </div>
        )}

        {/* Section: Douleurs */}
        <section className="stumpr-card mb-6" data-testid="section-douleurs">
          <h2 className="text-lg font-bold mb-5"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
            Douleurs du jour
          </h2>

          {/* Douleur globale */}
          <PainSlider
            label="Douleur globale"
            value={douleurGlobale}
            onChange={setDouleurGlobale}
          />

          {/* Option prothèse spécifique */}
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => { setDouleurLieeProthese(v => !v); setProtheseSelectionnee(""); }}
                className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: douleurLieeProthese ? "#0e6b63" : "#c0b8af",
                  backgroundColor: douleurLieeProthese ? "#0e6b63" : "white",
                }}>
                {douleurLieeProthese && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium" style={{ color: "#3d4a5c" }}>
                Cette douleur concerne une prothèse spécifique
              </span>
            </label>

            {douleurLieeProthese && (
              <div className="mt-3 ml-8">
                {activeProtheses.length > 0 ? (
                  <select
                    className="stumpr-select"
                    value={protheseSelectionnee}
                    onChange={(e) => setProtheseSelectionnee(e.target.value)}>
                    <option value="">Sélectionner une prothèse...</option>
                    {activeProtheses.map(p => (
                      <option key={p.id} value={p.id}>
                        Prothèse {PROTHESE_TYPE_LABELS[p.type] || p.type}
                        {p.date_attribution ? ` (depuis ${new Date(p.date_attribution).toLocaleDateString("fr-FR")})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm" style={{ color: "#8892a4" }}>
                    Aucune prothèse active enregistrée.{" "}
                    <button onClick={() => navigate("/fiche-patient")} className="underline" style={{ color: "#0e6b63" }}>
                      Ajouter une prothèse
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section: Douleur fantôme */}
        <section className="stumpr-card mb-6" data-testid="section-fantome">
          <h2 className="text-lg font-bold mb-4"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
            Douleur fantôme 👻
          </h2>
          <PainSlider label="Membre fantôme" value={fantomePain} onChange={setFantomePain} />
        </section>

        {/* Section: Bien-être */}
        <section className="stumpr-card mb-6" data-testid="section-bienetre">
          <h2 className="text-lg font-bold mb-4"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
            Bien-être général
          </h2>
          <WellbeingSlider label="Fatigue" emoji="⚡" value={fatigue} onChange={setFatigue}
            labels={["Épuisé", "Fatigué", "Normal", "Bien", "Pleine forme"]} />
          <WellbeingSlider label="Sommeil" emoji="🌙" value={sommeil} onChange={setSommeil}
            labels={["Très mauvais", "Mauvais", "Correct", "Bon", "Excellent"]} />
          <WellbeingSlider label="Humeur" emoji="😊" value={humeur} onChange={setHumeur}
            labels={["Très bas", "Bas", "Neutre", "Bien", "Excellent"]} />
        </section>

        {/* Section: Activités */}
        <section className="stumpr-card mb-6" data-testid="section-activites">
          <h2 className="text-lg font-bold mb-4"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
            Activités réalisées
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {JOURNAL_ACTIVITIES.map(activity => (
              <ActivityToggle
                key={activity.id}
                activity={activity}
                isActive={activities.includes(activity.id)}
                onToggle={() => toggleActivity(activity.id)}
              />
            ))}
          </div>
        </section>

        {/* Section: Notes */}
        <section className="stumpr-card mb-6" data-testid="section-notes">
          <h2 className="text-lg font-bold mb-4"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
            Notes (optionnel)
          </h2>
          <textarea
            className="stumpr-input w-full"
            rows={3}
            placeholder="Décrivez ce que vous ressentez..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="journal-notes"
          />
        </section>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white transition-all"
          style={{ backgroundColor: saving ? "#8892a4" : "#0e6b63", fontSize: "15px" }}
          data-testid="save-journal-btn">
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={20} />
          )}
          Enregistrer mon journal
        </button>
      </main>

      {/* Slider styles */}
      <style>{`
        .pain-slider, .wellbeing-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 4px;
          background: var(--slider-gradient);
          outline: none;
        }
        .pain-slider::-webkit-slider-thumb,
        .wellbeing-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: white;
          border: 3px solid #0e6b63;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transition: transform 0.1s ease;
        }
        .pain-slider::-webkit-slider-thumb:hover,
        .wellbeing-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
        .pain-slider::-moz-range-thumb,
        .wellbeing-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: white;
          border: 3px solid #0e6b63;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}

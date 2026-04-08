import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL || 'https://stumpr-backend.onrender.com'}/api`;

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

const EVENEMENTS_JOURNAL = [
  {
    groupe: "Appareillage",
    items: [
      { id: "manchon_change", label: "Changement de manchon / liner" },
      { id: "emboiture_changee", label: "Changement d'emboîture" },
      { id: "composant_change", label: "Nouveau composant (pied, genou...)" },
      { id: "reglage_prothese", label: "Réglage ou ajustement de la prothèse" },
      { id: "prothese_secours", label: "Port de la prothèse de secours" },
      { id: "prothese_non_portee", label: "Prothèse non portée aujourd'hui" },
    ],
  },
  {
    groupe: "Moignon",
    items: [
      { id: "irritation_cutanee", label: "Irritation / rougeur cutanée" },
      { id: "plaie_escarre", label: "Plaie ou escarre" },
      { id: "sudation_excessive", label: "Sudation excessive" },
      { id: "oedeme_moignon", label: "Œdème / gonflement du moignon" },
      { id: "douleur_neuropathique", label: "Brûlure / décharge électrique (névrome)" },
      { id: "point_dur_osseux", label: "Point douloureux dur localisé" },
      { id: "reaction_allergique", label: "Réaction allergique / irritation matériau" },
      { id: "infection_suspectee", label: "Infection suspectée (rougeur + chaleur)" },
    ],
  },
  {
    groupe: "Vie quotidienne",
    items: [
      { id: "chute_incident", label: "Chute ou incident mécanique" },
      { id: "activite_intense", label: "Activité inhabituelle / effort intense" },
      { id: "variation_poids", label: "Variation de poids récente" },
      { id: "consultation_medicale", label: "Consultation médicale ou ortho" },
      { id: "changement_traitement", label: "Changement de traitement médicamenteux" },
      { id: "chaleur_voyage", label: "Période de chaleur / voyage" },
    ],
  },
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
        <label className="text-sm font-medium text-on-surface">{label}</label>
        <span className="text-sm font-bold px-3 py-1 rounded-full min-w-[40px] text-center"
          style={{ backgroundColor: badge.bg, color: badge.color }}>{value}</span>
      </div>
      <input type="range" min="0" max={max} step="1" value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="pain-slider w-full"
        style={{ "--slider-gradient": "linear-gradient(to right, #2d9e6b, #c9a227, #e08c2a, #d64545)" }} />
      <div className="flex justify-between text-xs mt-1 text-on-surface-variant">
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
        <label className="text-sm font-medium text-on-surface">{emoji} {label}</label>
        <span className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: badge.bg, color: badge.color }}>{labels[value]}</span>
      </div>
      <input type="range" min="0" max="4" step="1" value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="wellbeing-slider w-full"
        style={{ "--slider-gradient": "linear-gradient(to right, #d64545, #e08c2a, #c9a227, #7cb342, #2d9e6b)" }} />
      <div className="flex justify-between text-xs mt-1 text-on-surface-variant">
        {labels.map((l, i) => (
          <span key={i} className={i === value ? "font-bold" : ""}>{i === 0 || i === 4 ? l : ""}</span>
        ))}
      </div>
    </div>
  );
};

// Activity toggle
const ActivityToggle = ({ activity, isActive, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    style={isActive ? {
      backgroundColor: 'rgba(0,106,99,0.1)',
      border: '2px solid #006a63',
      borderRadius: 12,
      padding: 12,
      color: '#006a63',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    } : {
      backgroundColor: '#ffffff',
      border: '2px solid #e4e9ed',
      borderRadius: 12,
      padding: 12,
      color: '#424750',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    }}
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
  const [evenements, setEvenements] = useState([]);
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
          evenements: evenements,
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
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4 border-secondary border-t-transparent" />
          <p className="text-on-surface-variant">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header
        className="border-b border-outline-variant/10 px-6 py-4 sticky top-0 z-50"
        style={{ backgroundColor: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/fiche-patient")}
              className="text-on-surface-variant hover:bg-surface-container rounded-xl p-2"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-headline font-bold text-xl text-primary">
              Journal quotidien
            </h1>
          </div>
          <button
            onClick={() => navigate("/tableau-de-bord")}
            className="bg-secondary/10 text-secondary rounded-xl px-4 py-2 text-sm font-medium"
            data-testid="nav-dashboard"
          >
            Tableau de bord
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {hasEntryToday && (
          <div className="bg-tertiary-fixed text-on-tertiary-fixed rounded-2xl p-4 mb-6">
            <p className="text-sm">
              ⚠️ Vous avez déjà enregistré une entrée aujourd'hui. Une nouvelle entrée sera ajoutée.
            </p>
          </div>
        )}

        {/* Section: Douleurs */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-6" data-testid="section-douleurs">
          <h2 className="font-headline font-bold text-lg text-on-surface mb-4">
            Douleurs du jour
          </h2>

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
                  borderColor: douleurLieeProthese ? "#006a63" : "#c0b8af",
                  backgroundColor: douleurLieeProthese ? "#006a63" : "white",
                }}>
                {douleurLieeProthese && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium text-on-surface-variant">
                Cette douleur concerne une prothèse spécifique
              </span>
            </label>

            {douleurLieeProthese && (
              <div className="mt-3 ml-8">
                {activeProtheses.length > 0 ? (
                  <select
                    className="w-full bg-surface-container rounded-xl border-none px-4 py-3 outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface cursor-pointer"
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
                  <p className="text-sm text-on-surface-variant">
                    Aucune prothèse active enregistrée.{" "}
                    <button onClick={() => navigate("/fiche-patient")} className="underline text-secondary" style={{ background: "none", border: "none", cursor: "pointer" }}>
                      Ajouter une prothèse
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section: Douleur fantôme */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-6" data-testid="section-fantome">
          <h2 className="font-headline font-bold text-lg text-on-surface mb-4">
            Douleur fantôme
          </h2>
          <PainSlider label="Membre fantôme" value={fantomePain} onChange={setFantomePain} />
        </section>

        {/* Section: Bien-être */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-6" data-testid="section-bienetre">
          <h2 className="font-headline font-bold text-lg text-on-surface mb-4">
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
        <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-6" data-testid="section-activites">
          <h2 className="font-headline font-bold text-lg text-on-surface mb-4">
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

        {/* Section: Événements */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-6" data-testid="section-evenements">
          <h2 className="font-headline font-bold text-lg text-on-surface mb-1">
            Événements du jour
          </h2>
          <p className="text-sm text-on-surface-variant mb-4">
            Ces informations sont transmises à votre équipe médicale.
          </p>
          {EVENEMENTS_JOURNAL.map((groupe) => (
            <div key={groupe.groupe} className="mb-5">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                {groupe.groupe}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {groupe.items.map((evt) => {
                  const isActive = evenements.includes(evt.id);
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      data-testid={`evenement-${evt.id}`}
                      onClick={() =>
                        setEvenements((prev) =>
                          isActive ? prev.filter((e) => e !== evt.id) : [...prev, evt.id]
                        )
                      }
                      style={
                        isActive
                          ? { backgroundColor: 'rgba(0,56,108,0.08)', border: '2px solid #00386c', borderRadius: 10, padding: '8px 10px', color: '#00386c', fontWeight: 600, fontSize: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }
                          : { backgroundColor: '#ffffff', border: '2px solid #e4e9ed', borderRadius: 10, padding: '8px 10px', color: '#424750', fontWeight: 400, fontSize: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }
                      }
                    >
                      {evt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Section: Notes */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-6" data-testid="section-notes">
          <h2 className="font-headline font-bold text-lg text-on-surface mb-4">
            Notes (optionnel)
          </h2>
          <textarea
            className="w-full bg-surface-container rounded-xl border-none px-4 py-3 outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface placeholder:text-outline resize-y"
            rows={3}
            placeholder="Décrivez ce que vous ressentez..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="journal-notes"
          />
        </section>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2"
          style={{ backgroundColor: saving ? '#737781' : '#00386c', color: '#fff' }}
          data-testid="save-journal-btn"
        >
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
          border: 3px solid #006a63;
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
          border: 3px solid #006a63;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}

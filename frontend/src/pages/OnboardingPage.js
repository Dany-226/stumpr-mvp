import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import StumprLogo from "../components/StumprLogo";
import LPPRSearch from "../components/LPPRSearch";
import {
  NIVEAUX_ACTIVITE,
  NIVEAUX_AMPUTATION,
  COTES,
  CAUSES,
  PROTHESE_TYPES,
  COMPOSANT_TYPES,
} from "../constants/patient";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOTAL_STEPS = 3;

// ── Stepper indicator ──────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28 }}>
      {[1, 2, 3].map((n, i) => (
        <div key={n} style={{ display: "flex", alignItems: "center" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            backgroundColor: n <= current ? "#0e6b63" : "#e0d9cf",
            color: n <= current ? "#fff" : "#8892a4",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14,
            transition: "background-color 0.2s",
          }}>
            {n}
          </div>
          {i < 2 && (
            <div style={{
              width: 48, height: 2,
              backgroundColor: n < current ? "#0e6b63" : "#e0d9cf",
              transition: "background-color 0.2s",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1 — Profil ────────────────────────────────────────────────────────
function StepProfil({ data, onChange, errors }) {
  const user = JSON.parse(localStorage.getItem("stumpr_user") || "{}");

  return (
    <div>
      <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: 20, color: "#1a1f2e", marginBottom: 4 }}>
        Mon profil
      </h2>
      <p style={{ color: "#8892a4", fontSize: 14, marginBottom: 24 }}>
        Ces informations permettent de personnaliser vos droits de remboursement.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label className="stumpr-label">Prénom *</label>
          <input
            className={`stumpr-input${errors.prenom ? " border-red-400" : ""}`}
            value={data.prenom}
            onChange={(e) => onChange("prenom", e.target.value)}
            placeholder="Jean"
          />
          {errors.prenom && <p style={{ color: "#e53e3e", fontSize: 12, marginTop: 4 }}>{errors.prenom}</p>}
        </div>
        <div>
          <label className="stumpr-label">Nom *</label>
          <input
            className={`stumpr-input${errors.nom ? " border-red-400" : ""}`}
            value={data.nom}
            onChange={(e) => onChange("nom", e.target.value)}
            placeholder="Dupont"
          />
          {errors.nom && <p style={{ color: "#e53e3e", fontSize: 12, marginTop: 4 }}>{errors.nom}</p>}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="stumpr-label">Email *</label>
        <input
          className="stumpr-input"
          type="email"
          value={data.email || user.email || ""}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="votre@email.com"
        />
        {errors.email && <p style={{ color: "#e53e3e", fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="stumpr-label">Téléphone</label>
        <input
          className="stumpr-input"
          type="tel"
          value={data.telephone}
          onChange={(e) => onChange("telephone", e.target.value)}
          placeholder="06 12 34 56 78"
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="stumpr-label">Date de naissance</label>
        <input
          className="stumpr-input"
          type="date"
          value={data.date_naissance}
          onChange={(e) => onChange("date_naissance", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="stumpr-label">Niveau d'amputation *</label>
        <select
          className={`stumpr-select${errors.niveau_amputation ? " border-red-400" : ""}`}
          value={data.niveau_amputation}
          onChange={(e) => onChange("niveau_amputation", e.target.value)}
        >
          <option value="">Sélectionner...</option>
          {NIVEAUX_AMPUTATION.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {errors.niveau_amputation && <p style={{ color: "#e53e3e", fontSize: 12, marginTop: 4 }}>{errors.niveau_amputation}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label className="stumpr-label">Côté</label>
          <select
            className="stumpr-select"
            value={data.cote}
            onChange={(e) => onChange("cote", e.target.value)}
          >
            <option value="">Sélectionner...</option>
            {COTES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="stumpr-label">Cause</label>
          <select
            className="stumpr-select"
            value={data.cause}
            onChange={(e) => onChange("cause", e.target.value)}
          >
            <option value="">Sélectionner...</option>
            {CAUSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="stumpr-label">Date d'amputation</label>
        <input
          className="stumpr-input"
          type="date"
          value={data.date_amputation}
          onChange={(e) => onChange("date_amputation", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="stumpr-label">Niveau d'activité</label>
        <select
          className="stumpr-select"
          value={data.niveau_activite}
          onChange={(e) => onChange("niveau_activite", e.target.value)}
        >
          <option value="">Sélectionner...</option>
          {NIVEAUX_ACTIVITE.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Step 2 — Prothèse principale ───────────────────────────────────────────
function StepProthese({ data, onChange }) {
  return (
    <div>
      <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: 20, color: "#1a1f2e", marginBottom: 4 }}>
        Ma prothèse principale
      </h2>
      <p style={{ color: "#8892a4", fontSize: 14, marginBottom: 24 }}>
        Vous pourrez en ajouter d'autres dans votre fiche patient.
      </p>

      <label className="stumpr-label">Type de prothèse</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {Object.entries(PROTHESE_TYPES).map(([key, { label, bg, text }]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange("type", key)}
            style={{
              padding: "12px 8px",
              borderRadius: 12,
              border: `2px solid ${data.type === key ? text : "#e0d9cf"}`,
              backgroundColor: data.type === key ? bg : "#fff",
              color: data.type === key ? text : "#3d4a5c",
              fontWeight: data.type === key ? 700 : 500,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="stumpr-label">Date d'attribution</label>
        <input
          className="stumpr-input"
          type="date"
          value={data.date_attribution}
          onChange={(e) => onChange("date_attribution", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="stumpr-label">Notes (optionnel)</label>
        <textarea
          className="stumpr-input"
          rows={3}
          style={{ resize: "vertical" }}
          value={data.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Marque, modèle, remarques..."
        />
      </div>
    </div>
  );
}

// ── Step 3 — Composants ────────────────────────────────────────────────────
function StepComposants({ composants, onAdd, onRemove, onUpdate }) {
  return (
    <div>
      <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: 20, color: "#1a1f2e", marginBottom: 4 }}>
        Composants
      </h2>
      <p style={{ color: "#8892a4", fontSize: 14, marginBottom: 24 }}>
        Ajoutez les composants de votre prothèse (emboîture, pied, manchon…).
      </p>

      {composants.length === 0 && (
        <button
          type="button"
          className="stumpr-btn-outline w-full"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={onAdd}
        >
          <Plus size={16} />
          Ajouter un composant
        </button>
      )}

      {composants.map((comp, idx) => (
        <div key={comp._id} style={{ marginBottom: 8 }}>
          <div className="component-card" style={{ position: "relative", overflow: "visible" }}>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              style={{
                position: "absolute", top: 12, right: 12,
                background: "none", border: "none", cursor: "pointer",
                color: "#e53e3e", padding: 4,
              }}
            >
              <Trash2 size={16} />
            </button>

            <div style={{ marginBottom: 10 }}>
              <label className="stumpr-label">Type de composant</label>
              <select
                className="stumpr-select"
                value={comp.type}
                onChange={(e) => onUpdate(idx, "type", e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {COMPOSANT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label className="stumpr-label">Marque / Modèle</label>
              <input
                className="stumpr-input"
                value={comp.marque}
                onChange={(e) => onUpdate(idx, "marque", e.target.value)}
                placeholder="Ex: Ottobock, Össur..."
              />
            </div>

            <LPPRSearch
              hideTarif
              onSelect={(item) => {
                onUpdate(idx, "lppr_code", item.code);
                onUpdate(idx, "lppr_label", item.nomenclature);
                onUpdate(idx, "lppr_tarif", item.tarif);
                onUpdate(idx, "lppr_duree_ans", item.duree_ans != null ? Math.round(item.duree_ans) : null);
              }}
            />

            {comp.lppr_code && (
              <div style={{
                padding: "8px 12px", borderRadius: 8, backgroundColor: "#e6f3f2",
                fontSize: 13, color: "#0e6b63", marginBottom: 10,
              }}>
                [{comp.lppr_code}] {comp.lppr_label}
              </div>
            )}

            <div>
              <label className="stumpr-label">Date d'attribution</label>
              <input
                className="stumpr-input"
                type="date"
                value={comp.date_attribution}
                onChange={(e) => onUpdate(idx, "date_attribution", e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            className="stumpr-btn-outline w-full"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}
            onClick={onAdd}
          >
            <Plus size={16} />
            Ajouter un composant
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main OnboardingPage ────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("stumpr_user") || "{}");

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [profil, setProfil] = useState({
    prenom: user.prenom || "",
    nom: user.nom || "",
    email: user.email || "",
    telephone: "",
    date_naissance: "",
    niveau_amputation: "",
    cote: "",
    cause: "",
    date_amputation: "",
    niveau_activite: "",
  });
  const [profilErrors, setProfilErrors] = useState({});

  const [prothese, setProthese] = useState({
    type: "principale",
    date_attribution: "",
    notes: "",
  });
  const [skipProthese, setSkipProthese] = useState(false);

  const [composants, setComposants] = useState([]);
  const [skipComposants, setSkipComposants] = useState(false);

  const validateProfil = () => {
    const errs = {};
    if (!profil.prenom.trim()) errs.prenom = "Le prénom est requis";
    if (!profil.nom.trim()) errs.nom = "Le nom est requis";
    if (!profil.email.trim()) errs.email = "L'email est requis";
    if (!profil.niveau_amputation) errs.niveau_amputation = "Le niveau d'amputation est requis";
    return errs;
  };

  const handleNext = () => {
    if (step === 1) {
      const errs = validateProfil();
      if (Object.keys(errs).length > 0) {
        setProfilErrors(errs);
        return;
      }
      setProfilErrors({});
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleFinish = async () => {
    setSubmitting(true);
    const token = localStorage.getItem("stumpr_token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Créer le patient
      const patientRes = await axios.post(`${API}/patients`, profil, { headers });
      const patientId = patientRes.data.id || patientRes.data._id;

      // 2. Créer la prothèse si non skippée
      let proteseId = null;
      if (!skipProthese) {
        const proteseRes = await axios.post(
          `${API}/patient/protheses`,
          { ...prothese, patient_id: patientId },
          { headers }
        );
        proteseId = proteseRes.data.id || proteseRes.data._id;
      }

      // 3. Créer les composants si non skippés et si prothèse créée
      if (!skipComposants && proteseId && composants.length > 0) {
        for (const comp of composants) {
          await axios.post(
            `${API}/patient/protheses/${proteseId}/composants`,
            comp,
            { headers }
          );
        }
      }

      toast.success("Bienvenue sur Stumpr 🎉");
      navigate(`/fiche-patient/${patientId}`);
    } catch (err) {
      const msg = err.response?.data?.detail || "Une erreur est survenue";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const addComposant = () => {
    setComposants((prev) => [...prev, {
      _id: Date.now(),
      type: "", marque: "", date_attribution: "",
      lppr_code: "", lppr_label: "", lppr_tarif: null, lppr_duree_ans: null,
    }]);
  };

  const removeComposant = (idx) => {
    setComposants((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateComposant = (idx, field, value) => {
    setComposants((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const isLastStep = step === TOTAL_STEPS;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f5f0e8" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e0d9cf", padding: "16px 24px" }}>
        <StumprLogo size={22} />
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          {/* Progress label */}
          <p style={{ textAlign: "center", fontSize: 13, color: "#8892a4", marginBottom: 12 }}>
            Étape {step} sur {TOTAL_STEPS}
          </p>

          <StepIndicator current={step} />

          <div className="stumpr-card" style={{ padding: 28 }}>
            {step === 1 && (
              <StepProfil
                data={profil}
                onChange={(field, value) => setProfil((p) => ({ ...p, [field]: value }))}
                errors={profilErrors}
              />
            )}

            {step === 2 && (
              <>
                {!skipProthese ? (
                  <StepProthese
                    data={prothese}
                    onChange={(field, value) => setProthese((p) => ({ ...p, [field]: value }))}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "#8892a4" }}>
                    <p style={{ fontSize: 16, marginBottom: 8 }}>Prothèse ignorée</p>
                    <p style={{ fontSize: 13 }}>Vous pourrez l'ajouter depuis votre fiche patient.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSkipProthese((v) => !v)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#8892a4", fontSize: 13, textDecoration: "underline",
                    marginTop: 8, display: "block", width: "100%", textAlign: "center",
                  }}
                >
                  {skipProthese ? "Renseigner ma prothèse" : "Je renseignerai plus tard"}
                </button>
              </>
            )}

            {step === 3 && (
              <>
                {!skipComposants ? (
                  <StepComposants
                    composants={composants}
                    onAdd={addComposant}
                    onRemove={removeComposant}
                    onUpdate={updateComposant}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "#8892a4" }}>
                    <p style={{ fontSize: 16, marginBottom: 8 }}>Composants ignorés</p>
                    <p style={{ fontSize: 13 }}>Vous pourrez les ajouter depuis votre fiche patient.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSkipComposants((v) => !v)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#8892a4", fontSize: 13, textDecoration: "underline",
                    marginTop: 8, display: "block", width: "100%", textAlign: "center",
                  }}
                >
                  {skipComposants ? "Renseigner mes composants" : "Je renseignerai plus tard"}
                </button>
              </>
            )}

            {/* Navigation buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              {step > 1 && (
                <button
                  type="button"
                  className="stumpr-btn-outline"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={handleBack}
                  disabled={submitting}
                >
                  <ChevronLeft size={16} />
                  Précédent
                </button>
              )}
              {!isLastStep ? (
                <button
                  type="button"
                  className="stumpr-btn-primary"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={handleNext}
                >
                  Suivant
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="stumpr-btn-primary"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={handleFinish}
                  disabled={submitting}
                >
                  {submitting ? <div className="spinner" /> : "Terminer"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

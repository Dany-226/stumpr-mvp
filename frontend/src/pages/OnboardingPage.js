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
  FABRICANTS,
} from "../constants/patient";

const API = `${process.env.REACT_APP_BACKEND_URL || 'https://stumpr-backend.onrender.com'}/api`;
const TOTAL_STEPS = 3;

const INPUT_CLS = "w-full bg-surface-container rounded-xl px-4 py-3 border-none outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface placeholder:text-outline";
const LABEL_CLS = "text-sm font-medium text-on-surface-variant mb-1 block";

// ── Stepper indicator ──────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28 }}>
      {[1, 2, 3].map((n, i) => (
        <div key={n} style={{ display: "flex", alignItems: "center" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            backgroundColor: n <= current ? "#006a63" : "#eaeef2",
            color: n <= current ? "#fff" : "#737781",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14,
            transition: "background-color 0.2s",
          }}>
            {n}
          </div>
          {i < 2 && (
            <div style={{
              width: 48, height: 2,
              backgroundColor: n < current ? "#006a63" : "#eaeef2",
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
      <h2 className="font-headline font-bold text-xl text-on-surface mb-1">
        Mon profil
      </h2>
      <p className="text-sm text-on-surface-variant mb-6">
        Ces informations permettent de personnaliser vos droits de remboursement.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={LABEL_CLS}>Prénom *</label>
          <input
            className={INPUT_CLS}
            value={data.prenom}
            onChange={(e) => onChange("prenom", e.target.value)}
            placeholder="Jean"
          />
          {errors.prenom && <p className="text-error text-xs mt-1">{errors.prenom}</p>}
        </div>
        <div>
          <label className={LABEL_CLS}>Nom *</label>
          <input
            className={INPUT_CLS}
            value={data.nom}
            onChange={(e) => onChange("nom", e.target.value)}
            placeholder="Dupont"
          />
          {errors.nom && <p className="text-error text-xs mt-1">{errors.nom}</p>}
        </div>
      </div>

      <div className="mb-3">
        <label className={LABEL_CLS}>Email *</label>
        <input
          className={INPUT_CLS}
          type="email"
          value={data.email || user.email || ""}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="votre@email.com"
        />
        {errors.email && <p className="text-error text-xs mt-1">{errors.email}</p>}
      </div>

      <div className="mb-3">
        <label className={LABEL_CLS}>Téléphone</label>
        <input
          className={INPUT_CLS}
          type="tel"
          value={data.telephone}
          onChange={(e) => onChange("telephone", e.target.value)}
          placeholder="06 12 34 56 78"
        />
      </div>

      <div className="mb-3">
        <label className={LABEL_CLS}>Date de naissance</label>
        <input
          className={INPUT_CLS}
          type="date"
          value={data.date_naissance}
          onChange={(e) => onChange("date_naissance", e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className={LABEL_CLS}>Niveau d'amputation *</label>
        <select
          className={INPUT_CLS + " cursor-pointer"}
          value={data.niveau_amputation}
          onChange={(e) => onChange("niveau_amputation", e.target.value)}
        >
          <option value="">Sélectionner...</option>
          {NIVEAUX_AMPUTATION.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {errors.niveau_amputation && <p className="text-error text-xs mt-1">{errors.niveau_amputation}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={LABEL_CLS}>Côté</label>
          <select
            className={INPUT_CLS + " cursor-pointer"}
            value={data.cote}
            onChange={(e) => onChange("cote", e.target.value)}
          >
            <option value="">Sélectionner...</option>
            {COTES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Cause</label>
          <select
            className={INPUT_CLS + " cursor-pointer"}
            value={data.cause}
            onChange={(e) => onChange("cause", e.target.value)}
          >
            <option value="">Sélectionner...</option>
            {CAUSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className={LABEL_CLS}>Date d'amputation</label>
        <input
          className={INPUT_CLS}
          type="date"
          value={data.date_amputation}
          onChange={(e) => onChange("date_amputation", e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className={LABEL_CLS}>Niveau d'activité</label>
        <select
          className={INPUT_CLS + " cursor-pointer"}
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
      <h2 className="font-headline font-bold text-xl text-on-surface mb-1">
        Ma prothèse principale
      </h2>
      <p className="text-sm text-on-surface-variant mb-6">
        Vous pourrez en ajouter d'autres dans votre fiche patient.
      </p>

      <label className={LABEL_CLS}>Type de prothèse</label>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {Object.entries(PROTHESE_TYPES).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange("type", key)}
            style={data.type === key ? {
              backgroundColor: 'rgba(0,106,99,0.1)',
              border: '2px solid #006a63',
              borderRadius: 12,
              padding: '12px 8px',
              color: '#006a63',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            } : {
              backgroundColor: '#ffffff',
              border: '2px solid #e4e9ed',
              borderRadius: 12,
              padding: '12px 8px',
              color: '#424750',
              fontWeight: 500,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <label className={LABEL_CLS}>Date d'attribution</label>
        <input
          className={INPUT_CLS}
          type="date"
          value={data.date_attribution}
          onChange={(e) => onChange("date_attribution", e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className={LABEL_CLS}>Notes (optionnel)</label>
        <textarea
          className={INPUT_CLS + " resize-y"}
          rows={3}
          value={data.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Marque, modèle, remarques..."
        />
      </div>
    </div>
  );
}

// ── Fabricant picker (select + libre) ─────────────────────────────────────
function FabricantPicker({ value, onChange }) {
  const [sel, setSel] = useState(
    value && !FABRICANTS.includes(value) ? "Autre" : (value || "")
  );
  const [libre, setLibre] = useState(
    value && !FABRICANTS.includes(value) ? value : ""
  );
  return (
    <>
      <select
        className="w-full bg-surface-container rounded-xl border-none px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface"
        value={sel}
        onChange={(e) => {
          const v = e.target.value;
          setSel(v);
          if (v !== "Autre") onChange(v);
          else onChange(libre);
        }}
      >
        <option value="">— Sélectionner —</option>
        {FABRICANTS.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      {sel === "Autre" && (
        <input
          className="w-full bg-surface-container rounded-xl border-none px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface mt-2"
          placeholder="Préciser le fabricant..."
          value={libre}
          onChange={(e) => { setLibre(e.target.value); onChange(e.target.value); }}
        />
      )}
    </>
  );
}

// ── Step 3 — Composants ────────────────────────────────────────────────────
function StepComposants({ composants, onAdd, onRemove, onUpdate }) {
  return (
    <div>
      <h2 className="font-headline font-bold text-xl text-on-surface mb-1">
        Composants
      </h2>
      <p className="text-sm text-on-surface-variant mb-6">
        Ajoutez les composants de votre prothèse (emboîture, pied, manchon…).
      </p>

      {composants.length === 0 && (
        <button
          type="button"
          className="w-full bg-surface-container text-on-surface rounded-xl py-3 font-bold flex items-center justify-center gap-2 border-none"
          onClick={onAdd}
        >
          <Plus size={16} />
          Ajouter un composant
        </button>
      )}

      {composants.map((comp, idx) => (
        <div key={comp._id} className="mb-2">
          <div className="bg-surface-container-low rounded-2xl p-5 mb-3 relative overflow-visible">
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute top-3 right-3 p-1 text-tertiary hover:bg-tertiary/10 rounded-lg"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Trash2 size={16} />
            </button>

            <div className="mb-3">
              <label className={LABEL_CLS}>Type de composant</label>
              <select
                className={INPUT_CLS + " cursor-pointer"}
                value={comp.type}
                onChange={(e) => onUpdate(idx, "type", e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {COMPOSANT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className={LABEL_CLS}>Fabricant</label>
              <FabricantPicker
                value={comp.marque}
                onChange={(v) => onUpdate(idx, "marque", v)}
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
              <div className="bg-secondary/10 text-secondary rounded-xl px-3 py-2 text-sm mb-3">
                [{comp.lppr_code}] {comp.lppr_label}
              </div>
            )}

            <div>
              <label className={LABEL_CLS}>Date d'attribution</label>
              <input
                className={INPUT_CLS}
                type="date"
                value={comp.date_attribution}
                onChange={(e) => onUpdate(idx, "date_attribution", e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            className="w-full bg-surface-container text-on-surface rounded-xl py-3 font-bold flex items-center justify-center gap-2 border-none mt-2"
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
          const payload = {
            type: comp.type,
            marque: comp.marque || null,
            reference_lppr: comp.lppr_code || null,
            nomenclature: comp.lppr_label || null,
            tarif: comp.lppr_tarif ?? null,
            duree_ans: comp.lppr_duree_ans ?? null,
            date_attribution: comp.date_attribution || null,
          };
          await axios.post(
            `${API}/patient/protheses/${proteseId}/composants`,
            payload,
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
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header
        className="border-b border-outline-variant/10 px-6 py-4"
        style={{ backgroundColor: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}
      >
        <StumprLogo size={22} />
      </header>

      {/* Central zone */}
      <div className="flex-1 flex flex-col items-center px-5 py-8">
        <div className="w-full max-w-lg">

          {/* Progress label */}
          <p className="text-center text-sm text-on-surface-variant mb-3">
            Étape {step} sur {TOTAL_STEPS}
          </p>

          <StepIndicator current={step} />

          {/* Main card */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
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
                  <div className="text-center py-8 text-on-surface-variant">
                    <p className="text-base mb-2">Prothèse ignorée</p>
                    <p className="text-sm">Vous pourrez l'ajouter depuis votre fiche patient.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSkipProthese((v) => !v)}
                  className="text-sm text-on-surface-variant underline mt-2 block w-full text-center"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
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
                  <div className="text-center py-8 text-on-surface-variant">
                    <p className="text-base mb-2">Composants ignorés</p>
                    <p className="text-sm">Vous pourrez les ajouter depuis votre fiche patient.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSkipComposants((v) => !v)}
                  className="text-sm text-on-surface-variant underline mt-2 block w-full text-center"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
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
                  className="bg-surface-container text-on-surface rounded-xl py-3 font-bold flex-1 flex items-center justify-center gap-2 border-none"
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
                  onClick={handleNext}
                  style={{ flex: 1, backgroundColor: '#00386c', color: '#fff', borderRadius: 12, padding: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', cursor: 'pointer' }}
                >
                  Suivant
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={submitting}
                  style={{ flex: 1, backgroundColor: '#00386c', color: '#fff', borderRadius: 12, padding: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', cursor: 'pointer' }}
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

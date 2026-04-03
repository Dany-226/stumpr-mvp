import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Save, FileDown, Share2, LogOut, Plus, Trash2, X,
  Power, ChevronDown, ChevronUp, Eye, EyeOff,
  Footprints, PersonStanding, ShoppingCart, Car, Bike,
  Waves, CircleDot, Mountain, Briefcase, Armchair, Trophy
} from "lucide-react";
import axios from "axios";
import StumprLogo from "../components/StumprLogo";
import LPPRSearch from "../components/LPPRSearch";
import { COMPOSANT_TYPES } from "../constants/patient";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ======================== CONSTANTS ========================

const ACTIVITIES = [
  { id: "marche_courte", label: "Marche courte (< 1km)", icon: Footprints },
  { id: "marche_longue", label: "Marche longue (> 1km)", icon: PersonStanding },
  { id: "courses", label: "Courses / Supermarché", icon: ShoppingCart },
  { id: "conduite", label: "Conduite automobile", icon: Car },
  { id: "velo", label: "Vélo", icon: Bike },
  { id: "natation", label: "Natation", icon: Waves },
  { id: "sport_collectif", label: "Sport collectif", icon: CircleDot },
  { id: "randonnee", label: "Randonnée", icon: Mountain },
  { id: "travail_debout", label: "Travail debout", icon: Briefcase },
  { id: "travail_assis", label: "Travail assis", icon: Armchair },
  { id: "competition", label: "Activité intense / compétition", icon: Trophy },
];

const NIVEAUX_ACTIVITE = ["Sédentaire", "Modéré", "Actif", "Très actif", "Sportif compétition"];
const NIVEAUX_AMPUTATION = [
  "Tibiale (sous le genou)", "Fémorale (au-dessus du genou)", "Désarticulation genou",
  "Désarticulation hanche", "Partielle du pied", "Transradiale (avant-bras)",
  "Humérale (bras)", "Désarticulation coude", "Désarticulation épaule", "Bilatérale"
];
const COTES = ["Gauche", "Droit", "Bilatéral"];
const CAUSES = ["Traumatique", "Vasculaire", "Tumorale", "Congénitale", "Infectieuse", "Autre"];
const SPECIALITES = ["Médecin MPR", "Chirurgien orthopédique", "Médecin généraliste", "Autre"];

const PROTHESE_TYPES = {
  principale: { label: "Principale", bg: "#e6f3f2", text: "#0e6b63" },
  secours:    { label: "Secours",    bg: "#fdf8e3", text: "#c9a227" },
  bain:       { label: "Bain / Douche", bg: "#e8f0fe", text: "#1a73e8" },
  sport:      { label: "Sport",      bg: "#e8f5e9", text: "#2e7d32" },
  autre:      { label: "Autre",      bg: "#f3e5f5", text: "#7b1fa2" },
};


// ======================== SHARED COMPONENTS ========================

const RenewalBadge = ({ renewalDate }) => {
  if (!renewalDate) return null;
  const renewal = new Date(renewalDate);
  const now = new Date();
  const diffMonths = (renewal - now) / (1000 * 60 * 60 * 24 * 30);
  const formatted = renewal.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  if (diffMonths < 0)
    return <span className="bg-tertiary-fixed text-tertiary rounded-full px-3 py-1 text-sm font-bold">Renouvellement dépassé : {formatted}</span>;
  if (diffMonths <= 1)
    return <span className="bg-tertiary-fixed text-tertiary rounded-full px-3 py-1 text-sm font-bold">Renouvellement urgent : {formatted}</span>;
  if (diffMonths <= 6)
    return <span className="bg-secondary-fixed text-on-secondary-fixed rounded-full px-3 py-1 text-sm font-bold">Renouvellement dans {Math.ceil(diffMonths)} mois : {formatted}</span>;
  return <span className="bg-primary-fixed text-on-primary-fixed rounded-full px-3 py-1 text-sm font-bold">Renouvellement estimé : {formatted}</span>;
};


// ======================== PROTHESE COMPONENTS ========================

const AddProtheseModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ type: "principale", date_attribution: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onAdd(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-3xl bg-surface-container-lowest p-6 shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-headline font-bold text-lg text-on-surface">
            Ajouter une prothèse
          </h3>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-surface-container">
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-sm font-medium text-on-surface-variant mb-1 block">Type de prothèse *</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.entries(PROTHESE_TYPES).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: key }))}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: form.type === key ? cfg.bg : "var(--color-surface-container)",
                    color: form.type === key ? cfg.text : "var(--color-on-surface-variant)",
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-on-surface-variant mb-1 block">Date d'attribution</label>
            <input type="date"
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30"
              value={form.date_attribution}
              onChange={(e) => setForm(f => ({ ...f, date_attribution: e.target.value }))} />
          </div>

          <div className="mb-5">
            <label className="text-sm font-medium text-on-surface-variant mb-1 block">Notes (optionnel)</label>
            <textarea
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30"
              rows={2} placeholder="Description, usage..."
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <button type="submit" disabled={saving}
            className="bg-primary text-on-primary rounded-xl px-6 py-3 font-bold hover:opacity-90 w-full flex items-center justify-center gap-2">
            {saving ? <div className="spinner" /> : <Plus size={18} />}
            Ajouter la prothèse
          </button>
        </form>
      </div>
    </div>
  );
};

const AddComposantModal = ({ protheseId, onClose, onAdd }) => {
  const [form, setForm] = useState({
    type: "Emboîture", marque: "", reference_lppr: "", nomenclature: "",
    tarif: null, duree_ans: null, date_attribution: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleLPPRSelect = (item) => {
    setForm(f => ({
      ...f,
      reference_lppr: item.code,
      nomenclature: item.nomenclature,
      tarif: item.tarif || null,
      duree_ans: item.duree_ans != null ? Math.round(item.duree_ans) : null,
      type: item.categorie || f.type,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onAdd(protheseId, form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-3xl bg-surface-container-lowest p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-headline font-bold text-lg text-on-surface">
            Ajouter un composant
          </h3>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-surface-container">
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <LPPRSearch onSelect={handleLPPRSelect} />

          {form.reference_lppr && (
            <div className="mb-4 p-3 rounded-xl text-sm bg-surface-container-low">
              <div className="font-semibold text-secondary">[{form.reference_lppr}]</div>
              <div className="text-on-surface">{form.nomenclature}</div>
              {form.tarif && <div className="text-on-surface-variant">{form.tarif}€ · {form.duree_ans ? `${form.duree_ans} ans` : ""}</div>}
            </div>
          )}

          <div className="mb-4">
            <label className="text-sm font-medium text-on-surface-variant mb-1 block">Type de composant *</label>
            <select
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 cursor-pointer"
              value={form.type}
              onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))} required>
              {COMPOSANT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-on-surface-variant mb-1 block">Marque</label>
            <input type="text"
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
              placeholder="Ex: Ottobock, Össur..."
              value={form.marque}
              onChange={(e) => setForm(f => ({ ...f, marque: e.target.value }))} />
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-on-surface-variant mb-1 block">Date d'attribution</label>
            <input type="date"
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30"
              value={form.date_attribution}
              onChange={(e) => setForm(f => ({ ...f, date_attribution: e.target.value }))} />
          </div>

          <div className="mb-5">
            <label className="text-sm font-medium text-on-surface-variant mb-1 block">Notes</label>
            <textarea
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
              rows={2} placeholder="Observations..."
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <button type="submit" disabled={saving}
            className="bg-primary text-on-primary rounded-xl px-6 py-3 font-bold hover:opacity-90 w-full flex items-center justify-center gap-2">
            {saving ? <div className="spinner" /> : <Plus size={18} />}
            Ajouter le composant
          </button>
        </form>
      </div>
    </div>
  );
};

const ComposantRow = ({ composant, onDelete }) => {
  const typeLabel = COMPOSANT_TYPES.find(t => t.value === composant.type)?.label || composant.type;
  const rawName = composant.nomenclature || typeLabel;
  const displayName = rawName.length > 40 ? rawName.slice(0, 40) + "…" : rawName;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 rounded-xl bg-surface-container-low px-3 mb-1">
      <div className="flex-1">
        <span className="text-sm font-medium text-on-surface">{displayName}</span>
        {composant.nomenclature && (
          <span className="text-xs ml-2 text-on-surface-variant">{typeLabel}</span>
        )}
        {composant.marque && (
          <span className="text-sm ml-2 text-on-surface-variant">— {composant.marque}</span>
        )}
        {composant.reference_lppr && (
          <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
            {composant.reference_lppr}
          </span>
        )}
      </div>
      <div className="mt-1 sm:mt-0 sm:ml-4 flex-shrink-0 flex items-center gap-2">
        <RenewalBadge renewalDate={composant.date_renouvellement_eligible} />
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded-lg hover:bg-error/10 text-error"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const ProtheseCard = ({ prothese, onDeactivate, onAddComposant, onDeleteComposant }) => {
  const [expanded, setExpanded] = useState(true);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const typeConfig = PROTHESE_TYPES[prothese.type] || PROTHESE_TYPES.autre;
  const isActive = prothese.statut === "active";

  return (
    <div
      className={`rounded-2xl mb-4 overflow-hidden shadow-sm ${isActive ? "bg-surface-container-lowest" : "bg-surface-container opacity-70"}`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: typeConfig.bg, color: typeConfig.text }}>
            {typeConfig.label}
          </span>
          {!isActive && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant">Archivée</span>
          )}
          {prothese.date_attribution && (
            <span className="text-xs text-on-surface-variant">
              Depuis le {new Date(prothese.date_attribution).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
        <button onClick={() => setExpanded(e => !e)} className="p-1 rounded-xl hover:bg-surface-container">
          {expanded ? <ChevronUp size={18} className="text-on-surface-variant" /> : <ChevronDown size={18} className="text-on-surface-variant" />}
        </button>
      </div>

      {/* Card body */}
      {expanded && (
        <div className="px-5 pb-4">
          {prothese.notes && (
            <p className="text-sm mb-4 text-on-surface-variant">{prothese.notes}</p>
          )}

          {/* Composants */}
          <div className="mb-4">
            <h5 className="text-xs font-bold uppercase tracking-wide mb-2 text-on-surface-variant">
              Composants ({prothese.composants.length})
            </h5>
            {prothese.composants.length > 0 ? (
              prothese.composants.map((c, index) => <ComposantRow key={c.id || index} composant={c} onDelete={() => onDeleteComposant && onDeleteComposant(prothese.id, c.id || index)} />)
            ) : (
              <p className="text-sm text-on-surface-variant">Aucun composant ajouté.</p>
            )}
          </div>

          {/* Actions */}
          {isActive && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => onAddComposant(prothese.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-secondary-container text-on-secondary-container">
                <Plus size={15} /> Composant
              </button>
              {!confirmDeactivate ? (
                <button
                  onClick={() => setConfirmDeactivate(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-surface-container text-on-surface-variant">
                  <Power size={15} /> Désactiver
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-error">Confirmer ?</span>
                  <button onClick={() => { onDeactivate(prothese.id); setConfirmDeactivate(false); }}
                    className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-error/10 text-error">Oui</button>
                  <button onClick={() => setConfirmDeactivate(false)}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium bg-surface-container text-on-surface-variant">Non</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ======================== MAIN PAGE ========================

export default function FichePatientPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);

  // Protheses state
  const [protheses, setProtheses] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [showAddProthese, setShowAddProthese] = useState(false);
  const [addComposantFor, setAddComposantFor] = useState(null);

  const [formData, setFormData] = useState({
    prenom: "", nom: "", date_naissance: "", email: "", telephone: "", niveau_activite: "",
    niveau_amputation: "", cote: "", date_amputation: "", cause: "", notes_moignon: "",
    composants: [],
    ortho_referent: "", cabinet_centre: "", telephone_ortho: "",
    medecin_prescripteur: "", specialite_prescripteur: "", prochain_rdv: "", notes_medicales: "",
    activites: [],
  });

  const user = JSON.parse(localStorage.getItem("stumpr_user") || "{}");
  const token = localStorage.getItem("stumpr_token");

  useEffect(() => {
    if (id) {
      loadPatient();
    } else {
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
    loadProtheses();
  }, [id]);

  const loadPatient = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFormData(response.data);
    } catch {
      toast.error("Erreur lors du chargement de la fiche");
      navigate("/fiche-patient");
    } finally {
      setLoading(false);
    }
  };

  const loadProtheses = async () => {
    try {
      const res = await axios.get(`${API}/patient/protheses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProtheses(res.data);
    } catch {
      // Patient not created yet — ignore
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleActivityToggle = (activityId) => {
    setFormData(prev => {
      const activites = prev.activites.includes(activityId)
        ? prev.activites.filter(a => a !== activityId)
        : [...prev.activites, activityId];
      return { ...prev, activites };
    });
  };

  const handleSave = async () => {
    if (!formData.prenom || !formData.nom || !formData.email || !formData.niveau_amputation) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSaving(true);
    try {
      if (id) {
        await axios.put(`${API}/patients/${id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Fiche patient mise à jour !");
        // Reload protheses in case patient was just created
        loadProtheses();
      } else {
        const response = await axios.post(`${API}/patients`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Fiche patient enregistrée !");
        navigate(`/fiche-patient/${response.data.id}`);
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleAddProthese = async (data) => {
    try {
      const res = await axios.post(`${API}/patient/protheses`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProtheses(prev => [...prev, res.data]);
      toast.success("Prothèse ajoutée !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'ajout");
    }
  };

  const handleDeactivateProthese = async (protheseId) => {
    try {
      await axios.put(`${API}/patient/protheses/${protheseId}`, { statut: "inactive" }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProtheses(prev => prev.map(p => p.id === protheseId ? { ...p, statut: "inactive" } : p));
      toast.success("Prothèse archivée");
    } catch {
      toast.error("Erreur lors de la désactivation");
    }
  };

  const handleDeleteComposant = async (protheseId, composantId) => {
    try {
      await axios.delete(`${API}/patient/protheses/${protheseId}/composants/${composantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProtheses(prev => prev.map(p =>
        p.id === protheseId ? { ...p, composants: p.composants.filter(c => c.id !== composantId) } : p
      ));
      toast.success("Composant supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAddComposant = async (protheseId, data) => {
    try {
      const res = await axios.post(`${API}/patient/protheses/${protheseId}/composants`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProtheses(prev => prev.map(p =>
        p.id === protheseId ? { ...p, composants: [...p.composants, res.data] } : p
      ));
      toast.success("Composant ajouté !");
    } catch {
      toast.error("Erreur lors de l'ajout du composant");
    }
  };

  const handleExportPDF = async () => {
    if (!id) { toast.error("Enregistrez d'abord la fiche pour exporter"); return; }
    try {
      const pdfUrl = `${API}/patients/${id}/pdf?token=${token}`;
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stumpr-fiche-${(formData.nom || "patient").toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("PDF téléchargé !");
    } catch {
      toast.error("Erreur lors de l'export PDF");
    }
  };

  const handleShare = async () => {
    if (!id) { toast.error("Enregistrez d'abord la fiche pour la partager"); return; }
    setShareLoading(true);
    try {
      const response = await axios.post(`${API}/patients/${id}/share`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fullUrl = `${window.location.origin}${response.data.url}`;
      setShareUrl(fullUrl);
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Lien copié dans le presse-papier ! Valide 30 jours.");
    } catch {
      toast.error("Erreur lors de la création du lien");
    } finally {
      setShareLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("stumpr_token");
    localStorage.removeItem("stumpr_user");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4 border-surface-container-high border-t-secondary" />
          <p className="text-on-surface-variant">Chargement...</p>
        </div>
      </div>
    );
  }

  const activeProtheses = protheses.filter(p => p.statut === "active");
  const inactiveProtheses = protheses.filter(p => p.statut === "inactive");

  return (
    <div className="min-h-screen bg-surface">
      {/* Modals */}
      {showAddProthese && (
        <AddProtheseModal
          onClose={() => setShowAddProthese(false)}
          onAdd={handleAddProthese}
        />
      )}
      {addComposantFor && (
        <AddComposantModal
          protheseId={addComposantFor}
          onClose={() => setAddComposantFor(null)}
          onAdd={handleAddComposant}
        />
      )}

      {/* Header */}
      <header className="glass-nav sticky top-0 z-40 flex items-center justify-between px-4 py-3">
        <StumprLogo size={22} />
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate("/journal")}
            className="text-sm font-medium px-3 py-2 rounded-xl bg-secondary-container text-on-secondary-container"
            data-testid="nav-journal">
            📝 Journal
          </button>
          <button onClick={() => navigate("/tableau-de-bord")}
            className="text-sm font-medium px-3 py-2 rounded-xl bg-surface-container text-on-surface-variant"
            data-testid="nav-dashboard">
            📊 Tableau
          </button>
          <button onClick={() => navigate("/annuaire")}
            className="text-sm font-medium px-3 py-2 rounded-xl bg-surface-container text-on-surface-variant"
            data-testid="nav-annuaire">
            🏥 Annuaire
          </button>
          <button onClick={() => navigate("/fiches-droits")}
            className="text-sm font-medium px-3 py-2 rounded-xl bg-surface-container text-on-surface-variant"
            data-testid="nav-fiches-droits">
            📋 Droits
          </button>
          <span className="text-sm hidden sm:inline text-on-surface-variant">
            {user.prenom} {user.nom}
          </span>
          <button onClick={handleLogout}
            className="bg-surface-container text-on-surface rounded-xl px-3 py-2 font-medium flex items-center gap-2"
            data-testid="logout-btn">
            <LogOut size={16} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h2 className="font-headline font-bold text-3xl text-on-surface mb-8">
          {id ? "Ma fiche patient" : "Créer ma fiche patient"}
        </h2>

        {/* SECTION 1 — Identité */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm animate-fade-in" data-testid="section-identite">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Identité patient</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="prenom">Prénom *</label>
              <input type="text" id="prenom" name="prenom" data-testid="input-prenom"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
                placeholder="Votre prénom"
                value={formData.prenom} onChange={handleChange} required />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="nom">Nom *</label>
              <input type="text" id="nom" name="nom" data-testid="input-nom"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
                placeholder="Votre nom"
                value={formData.nom} onChange={handleChange} required />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="date_naissance">Date de naissance</label>
              <input type="date" id="date_naissance" name="date_naissance" data-testid="input-date-naissance"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30"
                value={formData.date_naissance} onChange={handleChange} />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="email">Email *</label>
              <input type="email" id="email" name="email" data-testid="input-email"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
                placeholder="votre@email.com"
                value={formData.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="telephone">Téléphone</label>
              <input type="tel" id="telephone" name="telephone" data-testid="input-telephone"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
                placeholder="06 XX XX XX XX"
                value={formData.telephone} onChange={handleChange} />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="niveau_activite">Niveau d'activité</label>
              <select id="niveau_activite" name="niveau_activite" data-testid="select-niveau-activite"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 cursor-pointer"
                value={formData.niveau_activite} onChange={handleChange}>
                <option value="">Sélectionner...</option>
                {NIVEAUX_ACTIVITE.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* SECTION 2 — Amputation */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm animate-fade-in" data-testid="section-amputation">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Amputation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="niveau_amputation">Niveau d'amputation *</label>
              <select id="niveau_amputation" name="niveau_amputation" data-testid="select-niveau-amputation"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 cursor-pointer"
                value={formData.niveau_amputation} onChange={handleChange} required>
                <option value="">Sélectionner...</option>
                {NIVEAUX_AMPUTATION.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="cote">Côté</label>
              <select id="cote" name="cote" data-testid="select-cote"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 cursor-pointer"
                value={formData.cote} onChange={handleChange}>
                <option value="">Sélectionner...</option>
                {COTES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="date_amputation">Date d'amputation</label>
              <input type="date" id="date_amputation" name="date_amputation" data-testid="input-date-amputation"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30"
                value={formData.date_amputation} onChange={handleChange} />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="cause">Cause</label>
              <select id="cause" name="cause" data-testid="select-cause"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 cursor-pointer"
                value={formData.cause} onChange={handleChange}>
                <option value="">Sélectionner...</option>
                {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="notes_moignon">Notes sur le moignon</label>
              <textarea id="notes_moignon" name="notes_moignon" data-testid="textarea-notes-moignon"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
                rows={3} placeholder="État du moignon, sensibilité, particularités..."
                value={formData.notes_moignon} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* SECTION 3 — Mes prothèses */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm animate-fade-in" data-testid="section-protheses">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-headline font-bold text-lg text-on-surface">Mes prothèses</h3>
            {id ? (
              <button
                onClick={() => setShowAddProthese(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-primary text-on-primary"
                data-testid="add-prothese-btn">
                <Plus size={16} /> Ajouter une prothèse
              </button>
            ) : (
              <span className="text-sm text-on-surface-variant">Enregistrez d'abord la fiche</span>
            )}
          </div>

          {!id && (
            <div className="text-center py-8 rounded-2xl bg-surface-container text-on-surface-variant">
              <p className="text-sm">Créez votre fiche patient pour pouvoir ajouter des prothèses.</p>
            </div>
          )}

          {id && activeProtheses.length === 0 && inactiveProtheses.length === 0 && (
            <div className="text-center py-10 rounded-2xl bg-surface-container">
              <div className="text-4xl mb-3">🦾</div>
              <p className="font-medium mb-1 text-on-surface">Aucune prothèse enregistrée</p>
              <p className="text-sm text-on-surface-variant">
                Cliquez sur « Ajouter une prothèse » pour commencer.
              </p>
            </div>
          )}

          {/* Active protheses */}
          {activeProtheses.map(p => (
            <ProtheseCard
              key={p.id}
              prothese={p}
              onDeactivate={handleDeactivateProthese}
              onAddComposant={(pid) => setAddComposantFor(pid)}
              onDeleteComposant={handleDeleteComposant}
            />
          ))}

          {/* Inactive toggle */}
          {inactiveProtheses.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowInactive(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                {showInactive ? <EyeOff size={16} /> : <Eye size={16} />}
                {showInactive ? "Masquer" : "Afficher"} l'historique ({inactiveProtheses.length} archivée{inactiveProtheses.length > 1 ? "s" : ""})
              </button>
              {showInactive && inactiveProtheses.map(p => (
                <ProtheseCard
                  key={p.id}
                  prothese={p}
                  onDeactivate={handleDeactivateProthese}
                  onAddComposant={(pid) => setAddComposantFor(pid)}
                  onDeleteComposant={handleDeleteComposant}
                />
              ))}
            </div>
          )}
        </section>

        {/* SECTION 4 — Suivi médical */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm animate-fade-in" data-testid="section-suivi">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Suivi médical</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="ortho_referent">Orthoprothésiste référent</label>
              <input type="text" id="ortho_referent" name="ortho_referent" data-testid="input-ortho-referent"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
                placeholder="Nom de l'orthoprothésiste"
                value={formData.ortho_referent} onChange={handleChange} />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="cabinet_centre">Cabinet / Centre</label>
              <input type="text" id="cabinet_centre" name="cabinet_centre" data-testid="input-cabinet"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
                placeholder="Nom du cabinet ou centre"
                value={formData.cabinet_centre} onChange={handleChange} />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="telephone_ortho">Téléphone ortho</label>
              <input type="tel" id="telephone_ortho" name="telephone_ortho" data-testid="input-tel-ortho"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
                placeholder="01 XX XX XX XX"
                value={formData.telephone_ortho} onChange={handleChange} />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="medecin_prescripteur">Médecin prescripteur</label>
              <input type="text" id="medecin_prescripteur" name="medecin_prescripteur" data-testid="input-medecin"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
                placeholder="Nom du médecin"
                value={formData.medecin_prescripteur} onChange={handleChange} />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="specialite_prescripteur">Spécialité prescripteur</label>
              <select id="specialite_prescripteur" name="specialite_prescripteur" data-testid="select-specialite"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 cursor-pointer"
                value={formData.specialite_prescripteur} onChange={handleChange}>
                <option value="">Sélectionner...</option>
                {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="prochain_rdv">Prochain rendez-vous</label>
              <input type="date" id="prochain_rdv" name="prochain_rdv" data-testid="input-prochain-rdv"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30"
                value={formData.prochain_rdv} onChange={handleChange} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-on-surface-variant mb-1 block" htmlFor="notes_medicales">Notes médicales générales</label>
              <textarea id="notes_medicales" name="notes_medicales" data-testid="textarea-notes-medicales"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface border-none outline-none focus:ring-2 focus:ring-secondary/30 placeholder:text-on-surface-variant/50"
                rows={3} placeholder="Autres informations médicales importantes..."
                value={formData.notes_medicales} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* SECTION 5 — Activités quotidiennes */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm animate-fade-in" data-testid="section-activites">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Activités quotidiennes</h3>
          <p className="mb-5 text-on-surface-variant">
            Sélectionnez les activités que vous pratiquez régulièrement
          </p>
          <div className="activity-grid">
            {ACTIVITIES.map((activity) => {
              const Icon = activity.icon;
              const isActive = formData.activites.includes(activity.id);
              return (
                <button key={activity.id} type="button"
                  onClick={() => handleActivityToggle(activity.id)}
                  className={`stumpr-activity-toggle ${isActive ? "active" : ""}`}
                  data-testid={`activity-${activity.id}`}>
                  <Icon size={24} />
                  <span className="text-sm text-center font-medium">{activity.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Share URL */}
        {shareUrl && (
          <div className="bg-secondary-container/40 rounded-2xl p-6 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-1 text-secondary">Lien de partage créé</h4>
                <p className="text-sm break-all text-on-surface">{shareUrl}</p>
                <p className="text-xs mt-1 text-on-surface-variant">Valide pendant 30 jours</p>
              </div>
              <button onClick={() => setShareUrl(null)} className="p-2 hover:bg-surface-container/50 rounded-xl text-secondary">
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-4 justify-center pb-8">
          <button onClick={handleSave} disabled={saving}
            className="bg-primary text-on-primary rounded-xl px-6 py-3 font-bold hover:opacity-90 flex items-center gap-2" data-testid="save-btn">
            {saving ? <div className="spinner" /> : <Save size={18} />}
            Enregistrer ma fiche
          </button>
          <button onClick={handleExportPDF}
            className="bg-surface-container text-on-surface rounded-xl px-6 py-3 font-bold flex items-center gap-2" data-testid="export-pdf-btn">
            <FileDown size={18} /> Exporter PDF
          </button>
          <button onClick={handleShare} disabled={shareLoading}
            className="bg-surface-container text-on-surface rounded-xl px-6 py-3 font-bold flex items-center gap-2" data-testid="share-btn">
            {shareLoading ? <div className="spinner" /> : <Share2 size={18} />}
            Partager
          </button>
        </div>
      </main>
    </div>
  );
}

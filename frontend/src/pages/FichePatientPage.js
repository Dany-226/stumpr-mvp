import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Save, FileDown, Share2, LogOut, Plus, Trash2, Search, X,
  Power, ChevronDown, ChevronUp, Eye, EyeOff,
  Footprints, PersonStanding, ShoppingCart, Car, Bike,
  Waves, CircleDot, Mountain, Briefcase, Armchair, Trophy
} from "lucide-react";
import axios from "axios";
import StumprLogo from "../components/StumprLogo";

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

const COMPOSANT_TYPES = [
  { value: "emboiture",          label: "Emboîture" },
  { value: "pied_prothetique",   label: "Pied prothétique" },
  { value: "genou_prothetique",  label: "Genou prothétique" },
  { value: "manchon_liner",      label: "Manchon / Liner" },
  { value: "attaches_suspension",label: "Attaches / Suspension" },
  { value: "cosmetique_pied",    label: "Cosmétique pied" },
  { value: "autre",              label: "Autre" },
];

// ======================== SHARED COMPONENTS ========================

const RenewalBadge = ({ renewalDate }) => {
  if (!renewalDate) return null;
  const renewal = new Date(renewalDate);
  const now = new Date();
  const diffMonths = (renewal - now) / (1000 * 60 * 60 * 24 * 30);
  const formatted = renewal.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  if (diffMonths < 0)
    return <span className="stumpr-badge-danger">Renouvellement dépassé : {formatted}</span>;
  if (diffMonths <= 1)
    return <span className="stumpr-badge-danger">Renouvellement urgent : {formatted}</span>;
  if (diffMonths <= 6)
    return <span className="stumpr-badge-warning">Renouvellement dans {Math.ceil(diffMonths)} mois : {formatted}</span>;
  return <span className="stumpr-badge-ok">Renouvellement estimé : {formatted}</span>;
};

const LPPRSearch = ({ onSelect }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const token = localStorage.getItem("stumpr_token");

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${API}/lppr/search`, {
        params: { q },
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.data);
      setOpen(true);
    } catch {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const handleSelect = (item) => {
    onSelect(item);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative mb-4">
      <label className="stumpr-label">Recherche LPPR (optionnel)</label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8892a4" }} />
        <input
          type="text"
          className="stumpr-input pl-9"
          placeholder="Code ou nom du composant..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: "#0e6b63", borderTopColor: "transparent" }} />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 stumpr-dropdown">
          {results.map((item, i) => (
            <div key={i} className="stumpr-dropdown-item" onClick={() => handleSelect(item)}>
              <div className="font-semibold text-sm" style={{ color: "#1a1f2e" }}>
                [{item.code}] {item.nomenclature}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#8892a4" }}>
                {item.tarif ? `${item.tarif}€` : "Tarif N/A"} · {item.duree_ans ? `${item.duree_ans} ans` : ""} · {item.categorie || ""}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 stumpr-dropdown p-4 text-center text-sm" style={{ color: "#8892a4" }}>
          Aucun résultat
        </div>
      )}
    </div>
  );
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
            Ajouter une prothèse
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} style={{ color: "#8892a4" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="stumpr-label">Type de prothèse *</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.entries(PROTHESE_TYPES).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: key }))}
                  className="px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all"
                  style={{
                    borderColor: form.type === key ? cfg.text : "#e0d9cf",
                    backgroundColor: form.type === key ? cfg.bg : "white",
                    color: form.type === key ? cfg.text : "#8892a4",
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="stumpr-label">Date d'attribution</label>
            <input type="date" className="stumpr-input"
              value={form.date_attribution}
              onChange={(e) => setForm(f => ({ ...f, date_attribution: e.target.value }))} />
          </div>

          <div className="mb-5">
            <label className="stumpr-label">Notes (optionnel)</label>
            <textarea className="stumpr-input" rows={2} placeholder="Description, usage..."
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <button type="submit" disabled={saving}
            className="stumpr-btn-primary w-full flex items-center justify-center gap-2">
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
    type: "emboiture", marque: "", reference_lppr: "", nomenclature: "",
    tarif: null, duree_ans: null, date_attribution: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleLPPRSelect = (item) => {
    setForm(f => ({
      ...f,
      reference_lppr: item.code,
      nomenclature: item.nomenclature,
      tarif: item.tarif || null,
      duree_ans: item.duree_ans || null,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
            Ajouter un composant
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} style={{ color: "#8892a4" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <LPPRSearch onSelect={handleLPPRSelect} />

          {form.reference_lppr && (
            <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: "#e6f3f2" }}>
              <div className="font-semibold" style={{ color: "#0e6b63" }}>[{form.reference_lppr}]</div>
              <div style={{ color: "#3d4a5c" }}>{form.nomenclature}</div>
              {form.tarif && <div style={{ color: "#8892a4" }}>{form.tarif}€ · {form.duree_ans ? `${form.duree_ans} ans` : ""}</div>}
            </div>
          )}

          <div className="mb-4">
            <label className="stumpr-label">Type de composant *</label>
            <select className="stumpr-select" value={form.type}
              onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))} required>
              {COMPOSANT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="stumpr-label">Marque</label>
            <input type="text" className="stumpr-input" placeholder="Ex: Ottobock, Össur..."
              value={form.marque}
              onChange={(e) => setForm(f => ({ ...f, marque: e.target.value }))} />
          </div>

          <div className="mb-4">
            <label className="stumpr-label">Date d'attribution</label>
            <input type="date" className="stumpr-input"
              value={form.date_attribution}
              onChange={(e) => setForm(f => ({ ...f, date_attribution: e.target.value }))} />
          </div>

          <div className="mb-5">
            <label className="stumpr-label">Notes</label>
            <textarea className="stumpr-input" rows={2} placeholder="Observations..."
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <button type="submit" disabled={saving}
            className="stumpr-btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <div className="spinner" /> : <Plus size={18} />}
            Ajouter le composant
          </button>
        </form>
      </div>
    </div>
  );
};

const ComposantRow = ({ composant }) => {
  const typeLabel = COMPOSANT_TYPES.find(t => t.value === composant.type)?.label || composant.type;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b last:border-0"
      style={{ borderColor: "#e0d9cf" }}>
      <div className="flex-1">
        <span className="text-sm font-medium" style={{ color: "#1a1f2e" }}>{typeLabel}</span>
        {composant.marque && (
          <span className="text-sm ml-2" style={{ color: "#3d4a5c" }}>— {composant.marque}</span>
        )}
        {composant.reference_lppr && (
          <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f0ece6", color: "#8892a4" }}>
            {composant.reference_lppr}
          </span>
        )}
      </div>
      <div className="mt-1 sm:mt-0 sm:ml-4 flex-shrink-0">
        <RenewalBadge renewalDate={composant.date_renouvellement_eligible} />
      </div>
    </div>
  );
};

const ProtheseCard = ({ prothese, onDeactivate, onAddComposant }) => {
  const [expanded, setExpanded] = useState(true);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const typeConfig = PROTHESE_TYPES[prothese.type] || PROTHESE_TYPES.autre;
  const isActive = prothese.statut === "active";

  return (
    <div className="rounded-2xl border mb-4 overflow-hidden"
      style={{ borderColor: isActive ? "#e0d9cf" : "#d0cbc3", backgroundColor: isActive ? "white" : "#faf8f5", opacity: isActive ? 1 : 0.7 }}>
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: typeConfig.bg, color: typeConfig.text }}>
            {typeConfig.label}
          </span>
          {!isActive && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: "#f0ece6", color: "#8892a4" }}>Archivée</span>
          )}
          {prothese.date_attribution && (
            <span className="text-xs" style={{ color: "#8892a4" }}>
              Depuis le {new Date(prothese.date_attribution).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
        <button onClick={() => setExpanded(e => !e)} className="p-1 rounded-lg hover:bg-gray-50">
          {expanded ? <ChevronUp size={18} style={{ color: "#8892a4" }} /> : <ChevronDown size={18} style={{ color: "#8892a4" }} />}
        </button>
      </div>

      {/* Card body */}
      {expanded && (
        <div className="px-5 pb-4">
          {prothese.notes && (
            <p className="text-sm mb-4" style={{ color: "#3d4a5c" }}>{prothese.notes}</p>
          )}

          {/* Composants */}
          <div className="mb-4">
            <h5 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#8892a4" }}>
              Composants ({prothese.composants.length})
            </h5>
            {prothese.composants.length > 0 ? (
              prothese.composants.map((c) => <ComposantRow key={c.id} composant={c} />)
            ) : (
              <p className="text-sm" style={{ color: "#8892a4" }}>Aucun composant ajouté.</p>
            )}
          </div>

          {/* Actions */}
          {isActive && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => onAddComposant(prothese.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#e6f3f2", color: "#0e6b63" }}>
                <Plus size={15} /> Composant
              </button>
              {!confirmDeactivate ? (
                <button
                  onClick={() => setConfirmDeactivate(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: "#f5f0e8", color: "#8892a4", border: "1px solid #e0d9cf" }}>
                  <Power size={15} /> Désactiver
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "#d64545" }}>Confirmer ?</span>
                  <button onClick={() => { onDeactivate(prothese.id); setConfirmDeactivate(false); }}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: "#fdeaea", color: "#d64545" }}>Oui</button>
                  <button onClick={() => setConfirmDeactivate(false)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: "#f5f0e8", color: "#8892a4" }}>Non</button>
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "#e0d9cf", borderTopColor: "#0e6b63" }} />
          <p style={{ color: "#8892a4" }}>Chargement...</p>
        </div>
      </div>
    );
  }

  const activeProtheses = protheses.filter(p => p.statut === "active");
  const inactiveProtheses = protheses.filter(p => p.statut === "inactive");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>
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
      <header className="app-header sticky top-0 z-40">
        <StumprLogo size={22} />
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate("/journal")}
            className="text-sm font-medium px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#e6f3f2", color: "#0e6b63" }}
            data-testid="nav-journal">
            📝 Journal
          </button>
          <button onClick={() => navigate("/tableau-de-bord")}
            className="text-sm font-medium px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#f5f0e8", color: "#3d4a5c", border: "1px solid #e0d9cf" }}
            data-testid="nav-dashboard">
            📊 Tableau
          </button>
          <button onClick={() => navigate("/annuaire")}
            className="text-sm font-medium px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#f5f0e8", color: "#3d4a5c", border: "1px solid #e0d9cf" }}
            data-testid="nav-annuaire">
            🏥 Annuaire
          </button>
          <button onClick={() => navigate("/fiches-droits")}
            className="text-sm font-medium px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#f5f0e8", color: "#3d4a5c", border: "1px solid #e0d9cf" }}
            data-testid="nav-fiches-droits">
            📋 Droits
          </button>
          <span className="text-sm hidden sm:inline" style={{ color: "#3d4a5c" }}>
            {user.prenom} {user.nom}
          </span>
          <button onClick={handleLogout}
            className="stumpr-btn-outline flex items-center gap-2 py-2 px-3"
            data-testid="logout-btn">
            <LogOut size={16} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="container-main">
        <h2 className="text-3xl font-bold mb-8"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
          {id ? "Ma fiche patient" : "Créer ma fiche patient"}
        </h2>

        {/* SECTION 1 — Identité */}
        <section className="stumpr-card mb-6 animate-fade-in" data-testid="section-identite">
          <h3 className="section-header">Identité patient</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="stumpr-label" htmlFor="prenom">Prénom *</label>
              <input type="text" id="prenom" name="prenom" data-testid="input-prenom"
                className="stumpr-input" placeholder="Votre prénom"
                value={formData.prenom} onChange={handleChange} required />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="nom">Nom *</label>
              <input type="text" id="nom" name="nom" data-testid="input-nom"
                className="stumpr-input" placeholder="Votre nom"
                value={formData.nom} onChange={handleChange} required />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="date_naissance">Date de naissance</label>
              <input type="date" id="date_naissance" name="date_naissance" data-testid="input-date-naissance"
                className="stumpr-input" value={formData.date_naissance} onChange={handleChange} />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="email">Email *</label>
              <input type="email" id="email" name="email" data-testid="input-email"
                className="stumpr-input" placeholder="votre@email.com"
                value={formData.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="telephone">Téléphone</label>
              <input type="tel" id="telephone" name="telephone" data-testid="input-telephone"
                className="stumpr-input" placeholder="06 XX XX XX XX"
                value={formData.telephone} onChange={handleChange} />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="niveau_activite">Niveau d'activité</label>
              <select id="niveau_activite" name="niveau_activite" data-testid="select-niveau-activite"
                className="stumpr-select" value={formData.niveau_activite} onChange={handleChange}>
                <option value="">Sélectionner...</option>
                {NIVEAUX_ACTIVITE.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* SECTION 2 — Amputation */}
        <section className="stumpr-card mb-6 animate-fade-in" data-testid="section-amputation">
          <h3 className="section-header">Amputation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="stumpr-label" htmlFor="niveau_amputation">Niveau d'amputation *</label>
              <select id="niveau_amputation" name="niveau_amputation" data-testid="select-niveau-amputation"
                className="stumpr-select" value={formData.niveau_amputation} onChange={handleChange} required>
                <option value="">Sélectionner...</option>
                {NIVEAUX_AMPUTATION.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="stumpr-label" htmlFor="cote">Côté</label>
              <select id="cote" name="cote" data-testid="select-cote"
                className="stumpr-select" value={formData.cote} onChange={handleChange}>
                <option value="">Sélectionner...</option>
                {COTES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="stumpr-label" htmlFor="date_amputation">Date d'amputation</label>
              <input type="date" id="date_amputation" name="date_amputation" data-testid="input-date-amputation"
                className="stumpr-input" value={formData.date_amputation} onChange={handleChange} />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="cause">Cause</label>
              <select id="cause" name="cause" data-testid="select-cause"
                className="stumpr-select" value={formData.cause} onChange={handleChange}>
                <option value="">Sélectionner...</option>
                {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="stumpr-label" htmlFor="notes_moignon">Notes sur le moignon</label>
              <textarea id="notes_moignon" name="notes_moignon" data-testid="textarea-notes-moignon"
                className="stumpr-input" rows={3} placeholder="État du moignon, sensibilité, particularités..."
                value={formData.notes_moignon} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* SECTION 3 — Mes prothèses */}
        <section className="stumpr-card mb-6 animate-fade-in" data-testid="section-protheses">
          <div className="flex items-center justify-between mb-5">
            <h3 className="section-header mb-0">Mes prothèses</h3>
            {id ? (
              <button
                onClick={() => setShowAddProthese(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "#0e6b63", color: "white" }}
                data-testid="add-prothese-btn">
                <Plus size={16} /> Ajouter une prothèse
              </button>
            ) : (
              <span className="text-sm" style={{ color: "#8892a4" }}>Enregistrez d'abord la fiche</span>
            )}
          </div>

          {!id && (
            <div className="text-center py-8 rounded-xl" style={{ backgroundColor: "#f5f0e8", color: "#8892a4" }}>
              <p className="text-sm">Créez votre fiche patient pour pouvoir ajouter des prothèses.</p>
            </div>
          )}

          {id && activeProtheses.length === 0 && inactiveProtheses.length === 0 && (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: "#f5f0e8" }}>
              <div className="text-4xl mb-3">🦾</div>
              <p className="font-medium mb-1" style={{ color: "#3d4a5c" }}>Aucune prothèse enregistrée</p>
              <p className="text-sm" style={{ color: "#8892a4" }}>
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
            />
          ))}

          {/* Inactive toggle */}
          {inactiveProtheses.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowInactive(v => !v)}
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: "#8892a4" }}>
                {showInactive ? <EyeOff size={16} /> : <Eye size={16} />}
                {showInactive ? "Masquer" : "Afficher"} l'historique ({inactiveProtheses.length} archivée{inactiveProtheses.length > 1 ? "s" : ""})
              </button>
              {showInactive && inactiveProtheses.map(p => (
                <ProtheseCard
                  key={p.id}
                  prothese={p}
                  onDeactivate={handleDeactivateProthese}
                  onAddComposant={(pid) => setAddComposantFor(pid)}
                />
              ))}
            </div>
          )}
        </section>

        {/* SECTION 4 — Suivi médical */}
        <section className="stumpr-card mb-6 animate-fade-in" data-testid="section-suivi">
          <h3 className="section-header">Suivi médical</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="stumpr-label" htmlFor="ortho_referent">Orthoprothésiste référent</label>
              <input type="text" id="ortho_referent" name="ortho_referent" data-testid="input-ortho-referent"
                className="stumpr-input" placeholder="Nom de l'orthoprothésiste"
                value={formData.ortho_referent} onChange={handleChange} />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="cabinet_centre">Cabinet / Centre</label>
              <input type="text" id="cabinet_centre" name="cabinet_centre" data-testid="input-cabinet"
                className="stumpr-input" placeholder="Nom du cabinet ou centre"
                value={formData.cabinet_centre} onChange={handleChange} />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="telephone_ortho">Téléphone ortho</label>
              <input type="tel" id="telephone_ortho" name="telephone_ortho" data-testid="input-tel-ortho"
                className="stumpr-input" placeholder="01 XX XX XX XX"
                value={formData.telephone_ortho} onChange={handleChange} />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="medecin_prescripteur">Médecin prescripteur</label>
              <input type="text" id="medecin_prescripteur" name="medecin_prescripteur" data-testid="input-medecin"
                className="stumpr-input" placeholder="Nom du médecin"
                value={formData.medecin_prescripteur} onChange={handleChange} />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="specialite_prescripteur">Spécialité prescripteur</label>
              <select id="specialite_prescripteur" name="specialite_prescripteur" data-testid="select-specialite"
                className="stumpr-select" value={formData.specialite_prescripteur} onChange={handleChange}>
                <option value="">Sélectionner...</option>
                {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="stumpr-label" htmlFor="prochain_rdv">Prochain rendez-vous</label>
              <input type="date" id="prochain_rdv" name="prochain_rdv" data-testid="input-prochain-rdv"
                className="stumpr-input" value={formData.prochain_rdv} onChange={handleChange} />
            </div>
            <div className="md:col-span-2">
              <label className="stumpr-label" htmlFor="notes_medicales">Notes médicales générales</label>
              <textarea id="notes_medicales" name="notes_medicales" data-testid="textarea-notes-medicales"
                className="stumpr-input" rows={3} placeholder="Autres informations médicales importantes..."
                value={formData.notes_medicales} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* SECTION 5 — Activités quotidiennes */}
        <section className="stumpr-card mb-6 animate-fade-in" data-testid="section-activites">
          <h3 className="section-header">Activités quotidiennes</h3>
          <p className="mb-5" style={{ color: "#3d4a5c" }}>
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
          <div className="stumpr-card mb-6 animate-fade-in" style={{ backgroundColor: "#e8f5f4" }}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-1" style={{ color: "#0e6b63" }}>Lien de partage créé</h4>
                <p className="text-sm break-all" style={{ color: "#3d4a5c" }}>{shareUrl}</p>
                <p className="text-xs mt-1" style={{ color: "#8892a4" }}>Valide pendant 30 jours</p>
              </div>
              <button onClick={() => setShareUrl(null)} className="p-2 hover:bg-white/50 rounded-lg" style={{ color: "#0e6b63" }}>
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-4 justify-center pb-8">
          <button onClick={handleSave} disabled={saving}
            className="stumpr-btn-primary flex items-center gap-2" data-testid="save-btn">
            {saving ? <div className="spinner" /> : <Save size={18} />}
            Enregistrer ma fiche
          </button>
          <button onClick={handleExportPDF}
            className="stumpr-btn-outline flex items-center gap-2" data-testid="export-pdf-btn">
            <FileDown size={18} /> Exporter PDF
          </button>
          <button onClick={handleShare} disabled={shareLoading}
            className="stumpr-btn-outline flex items-center gap-2" data-testid="share-btn">
            {shareLoading ? <div className="spinner" /> : <Share2 size={18} />}
            Partager
          </button>
        </div>
      </main>
    </div>
  );
}

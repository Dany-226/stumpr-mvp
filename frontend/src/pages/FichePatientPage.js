import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { 
  Save, FileDown, Share2, LogOut, Plus, Trash2, Search, X,
  Footprints, PersonStanding, ShoppingCart, Car, Bike, 
  Waves, CircleDot, Mountain, Briefcase, Armchair, Trophy
} from "lucide-react";
import axios from "axios";
import StumprLogo from "../components/StumprLogo";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Activity definitions with icons
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

// Select options
const NIVEAUX_ACTIVITE = ["Sédentaire", "Modéré", "Actif", "Très actif", "Sportif compétition"];
const NIVEAUX_AMPUTATION = [
  "Tibiale (sous le genou)",
  "Fémorale (au-dessus du genou)",
  "Désarticulation genou",
  "Désarticulation hanche",
  "Partielle du pied",
  "Transradiale (avant-bras)",
  "Humérale (bras)",
  "Désarticulation coude",
  "Désarticulation épaule",
  "Bilatérale"
];
const COTES = ["Gauche", "Droit", "Bilatéral"];
const CAUSES = ["Traumatique", "Vasculaire", "Tumorale", "Congénitale", "Infectieuse", "Autre"];
const PRISES_EN_CHARGE = ["Aucune", "Mutuelle", "MDPH", "Autre"];
const ETATS_COMPOSANT = ["Neuf", "Bon état", "Usure normale", "À renouveler", "Défaillant"];
const SPECIALITES = ["Médecin MPR", "Chirurgien orthopédique", "Médecin généraliste", "Autre"];

// Renewal date badge component
const RenewalBadge = ({ prescriptionDate, durationYears }) => {
  if (!prescriptionDate || !durationYears) return null;

  const prescription = new Date(prescriptionDate);
  const renewal = new Date(prescription);
  renewal.setFullYear(renewal.getFullYear() + durationYears);
  const now = new Date();
  const diffMonths = (renewal - now) / (1000 * 60 * 60 * 24 * 30);

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (diffMonths < 0) {
    return (
      <span className="stumpr-badge-danger">
        Renouvellement dépassé : {formatDate(renewal)}
      </span>
    );
  } else if (diffMonths <= 1) {
    return (
      <span className="stumpr-badge-danger">
        Renouvellement urgent : {formatDate(renewal)}
      </span>
    );
  } else if (diffMonths <= 6) {
    return (
      <span className="stumpr-badge-warning">
        Renouvellement dans {Math.ceil(diffMonths)} mois : {formatDate(renewal)}
      </span>
    );
  } else {
    return (
      <span className="stumpr-badge-ok">
        Renouvellement estimé : {formatDate(renewal)}
      </span>
    );
  }
};

// Component search with autocomplete
const ComponentSearch = ({ onSelect, disabled }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchLPPR = useCallback(async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("stumpr_token");
      const response = await axios.get(`${API}/lppr/search`, {
        params: { q: searchQuery },
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(response.data);
      setShowDropdown(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchLPPR(query);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchLPPR]);

  const handleSelect = (item) => {
    onSelect(item);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <label className="stumpr-label">Recherche composant</label>
      <div className="relative">
        <Search 
          size={18} 
          className="absolute left-3 top-1/2 -translate-y-1/2" 
          style={{ color: '#8892a4' }} 
        />
        <input
          type="text"
          data-testid="component-search-input"
          className="stumpr-input pl-10"
          placeholder="Rechercher par code ou nomenclature..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" 
              style={{ borderColor: '#1d7a72', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 stumpr-dropdown" data-testid="search-results-dropdown">
          {results.map((item, index) => (
            <div
              key={index}
              className="stumpr-dropdown-item"
              onClick={() => handleSelect(item)}
              data-testid={`search-result-${index}`}
            >
              <div className="font-semibold" style={{ color: '#1a1f2e' }}>
                [{item.code}] — {item.nomenclature}
              </div>
              <div className="text-sm mt-1" style={{ color: '#8892a4' }}>
                {item.tarif ? `${item.tarif}€` : 'Tarif N/A'} • {item.categorie || 'Catégorie N/A'}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-2 stumpr-dropdown p-4 text-center" style={{ color: '#8892a4' }}>
          Aucun résultat trouvé
        </div>
      )}
    </div>
  );
};

// Single component card
const ComponentCard = ({ component, index, onChange, onRemove }) => {
  const handleFieldChange = (field, value) => {
    onChange(index, { ...component, [field]: value });
  };

  return (
    <div className="component-card animate-fade-in" data-testid={`component-card-${index}`}>
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-semibold" style={{ color: '#1a1f2e', fontFamily: 'Georgia, serif' }}>
          Composant {index + 1}
        </h4>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 rounded-lg hover:bg-red-50 transition-colors"
          style={{ color: '#d64545' }}
          data-testid={`remove-component-${index}`}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Selected component info */}
      <div className="stumpr-component-selected mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="stumpr-label" style={{ marginBottom: '2px' }}>Code LPPR</span>
            <p style={{ color: '#1a1f2e' }}>{component.code}</p>
          </div>
          <div>
            <span className="stumpr-label" style={{ marginBottom: '2px' }}>Tarif TTC</span>
            <p style={{ color: '#1a1f2e' }}>{component.tarif ? `${component.tarif}€` : 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <span className="stumpr-label" style={{ marginBottom: '2px' }}>Nomenclature</span>
            <p style={{ color: '#1a1f2e' }}>{component.nomenclature}</p>
          </div>
          <div>
            <span className="stumpr-label" style={{ marginBottom: '2px' }}>Durée prise en charge</span>
            <p style={{ color: '#1a1f2e' }}>{component.duree_ans ? `${component.duree_ans} ans` : 'N/A'}</p>
          </div>
          <div>
            <span className="stumpr-label" style={{ marginBottom: '2px' }}>Catégorie</span>
            <p style={{ color: '#1a1f2e' }}>{component.categorie || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <span className="stumpr-label" style={{ marginBottom: '2px' }}>Application</span>
            <p style={{ color: '#1a1f2e' }}>{component.application || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Manual fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="stumpr-label">Date de prescription *</label>
          <input
            type="date"
            className="stumpr-input"
            value={component.date_prescription || ""}
            onChange={(e) => handleFieldChange("date_prescription", e.target.value)}
            data-testid={`component-${index}-prescription-date`}
            required
          />
        </div>
        <div>
          <label className="stumpr-label">Prise en charge complémentaire</label>
          <select
            className="stumpr-select"
            value={component.prise_en_charge_complementaire || ""}
            onChange={(e) => handleFieldChange("prise_en_charge_complementaire", e.target.value)}
            data-testid={`component-${index}-prise-en-charge`}
          >
            <option value="">Sélectionner...</option>
            {PRISES_EN_CHARGE.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="stumpr-label">Montant remboursé (€)</label>
          <input
            type="number"
            className="stumpr-input"
            placeholder="0.00"
            value={component.montant_rembourse || ""}
            onChange={(e) => handleFieldChange("montant_rembourse", parseFloat(e.target.value) || null)}
            data-testid={`component-${index}-montant`}
          />
        </div>
        <div>
          <label className="stumpr-label">État du composant</label>
          <select
            className="stumpr-select"
            value={component.etat_composant || ""}
            onChange={(e) => handleFieldChange("etat_composant", e.target.value)}
            data-testid={`component-${index}-etat`}
          >
            <option value="">Sélectionner...</option>
            {ETATS_COMPOSANT.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Renewal date badge */}
      {component.date_prescription && component.duree_ans && (
        <div className="mt-4">
          <RenewalBadge 
            prescriptionDate={component.date_prescription} 
            durationYears={component.duree_ans} 
          />
        </div>
      )}

      {/* Notes */}
      <div className="mt-4">
        <label className="stumpr-label">Notes</label>
        <textarea
          className="stumpr-input"
          rows={2}
          placeholder="Notes sur ce composant..."
          value={component.notes || ""}
          onChange={(e) => handleFieldChange("notes", e.target.value)}
          data-testid={`component-${index}-notes`}
        />
      </div>
    </div>
  );
};

// Main component
export default function FichePatientPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  
  const [formData, setFormData] = useState({
    // Section 1 - Identité
    prenom: "",
    nom: "",
    date_naissance: "",
    email: "",
    telephone: "",
    niveau_activite: "",
    // Section 2 - Amputation
    niveau_amputation: "",
    cote: "",
    date_amputation: "",
    cause: "",
    notes_moignon: "",
    // Section 3 - Composants
    composants: [],
    // Section 4 - Suivi médical
    ortho_referent: "",
    cabinet_centre: "",
    telephone_ortho: "",
    medecin_prescripteur: "",
    specialite_prescripteur: "",
    prochain_rdv: "",
    notes_medicales: "",
    // Section 5 - Activités
    activites: [],
  });

  const user = JSON.parse(localStorage.getItem("stumpr_user") || "{}");
  const token = localStorage.getItem("stumpr_token");

  // Load existing patient data
  useEffect(() => {
    if (id) {
      loadPatient();
    } else {
      // Pre-fill email from user
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [id]);

  const loadPatient = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement de la fiche");
      navigate("/fiche-patient");
    } finally {
      setLoading(false);
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

  const addComponent = (component) => {
    if (formData.composants.length >= 6) {
      toast.error("Maximum 6 composants autorisés");
      return;
    }
    setFormData(prev => ({
      ...prev,
      composants: [...prev.composants, {
        ...component,
        date_prescription: "",
        prise_en_charge_complementaire: "",
        montant_rembourse: null,
        etat_composant: "",
        notes: ""
      }]
    }));
  };

  const updateComponent = (index, component) => {
    setFormData(prev => {
      const composants = [...prev.composants];
      composants[index] = component;
      return { ...prev, composants };
    });
  };

  const removeComponent = (index) => {
    setFormData(prev => ({
      ...prev,
      composants: prev.composants.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.prenom || !formData.nom || !formData.email || !formData.niveau_amputation) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSaving(true);
    try {
      if (id) {
        await axios.put(`${API}/patients/${id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Fiche patient mise à jour !");
      } else {
        const response = await axios.post(`${API}/patients`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Fiche patient enregistrée !");
        navigate(`/fiche-patient/${response.data.id}`);
      }
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!id) {
      toast.error("Enregistrez d'abord la fiche pour pouvoir l'exporter");
      return;
    }
    
    try {
      // Téléchargement via fetch + blob
      const pdfUrl = `${API}/patients/${id}/pdf?token=${token}`;
      const response = await fetch(pdfUrl);
      
      if (!response.ok) {
        throw new Error("Erreur lors de la génération du PDF");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Créer lien de téléchargement programmatique
      const a = document.createElement('a');
      a.href = url;
      a.download = `stumpr-fiche-${(formData.nom || 'patient').toLowerCase().replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF téléchargé !");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  const handleShare = async () => {
    if (!id) {
      toast.error("Enregistrez d'abord la fiche pour pouvoir la partager");
      return;
    }

    setShareLoading(true);
    try {
      const response = await axios.post(`${API}/patients/${id}/share`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const fullUrl = `${window.location.origin}${response.data.url}`;
      setShareUrl(fullUrl);
      
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Lien copié dans le presse-papier ! Valide 30 jours.");
    } catch (error) {
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fc' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" 
            style={{ borderColor: '#e2e6ed', borderTopColor: '#1d7a72' }} />
          <p style={{ color: '#8892a4' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e8' }}>
      {/* Header */}
      <header className="app-header sticky top-0 z-50">
        <StumprLogo size={22} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/journal")}
            className="text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: '#e6f3f2', color: '#0e6b63' }}
            data-testid="nav-journal"
          >
            📝 Journal
          </button>
          <button
            onClick={() => navigate("/tableau-de-bord")}
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{ backgroundColor: '#f5f0e8', color: '#3d4a5c', border: '1px solid #e0d9cf' }}
            data-testid="nav-dashboard"
          >
            📊 Tableau de bord
          </button>
          <button
            onClick={() => navigate("/annuaire")}
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{ backgroundColor: '#f5f0e8', color: '#3d4a5c', border: '1px solid #e0d9cf' }}
            data-testid="nav-annuaire"
          >
            🏥 Annuaire
          </button>
          <button
            onClick={() => navigate("/fiches-droits")}
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{ backgroundColor: '#f5f0e8', color: '#3d4a5c', border: '1px solid #e0d9cf' }}
            data-testid="nav-fiches-droits"
          >
            📋 Fiches droits
          </button>
          <span style={{ color: '#3d4a5c' }}>
            {user.prenom} {user.nom}
          </span>
          <button
            onClick={handleLogout}
            className="stumpr-btn-outline flex items-center gap-2 py-2 px-4"
            data-testid="logout-btn"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="container-main">
        <h2 
          className="text-3xl font-bold mb-8"
          style={{ fontFamily: 'Georgia, serif', color: '#1a1f2e' }}
        >
          {id ? "Modifier ma fiche patient" : "Ma fiche patient"}
        </h2>

        {/* SECTION 1 - Identité */}
        <section className="stumpr-card mb-6 animate-fade-in" data-testid="section-identite">
          <h3 className="section-header">Identité patient</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="stumpr-label" htmlFor="prenom">Prénom *</label>
              <input
                type="text"
                id="prenom"
                name="prenom"
                data-testid="input-prenom"
                className="stumpr-input"
                placeholder="Votre prénom"
                value={formData.prenom}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="nom">Nom *</label>
              <input
                type="text"
                id="nom"
                name="nom"
                data-testid="input-nom"
                className="stumpr-input"
                placeholder="Votre nom"
                value={formData.nom}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="date_naissance">Date de naissance</label>
              <input
                type="date"
                id="date_naissance"
                name="date_naissance"
                data-testid="input-date-naissance"
                className="stumpr-input"
                value={formData.date_naissance}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                data-testid="input-email"
                className="stumpr-input"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="telephone">Téléphone</label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                data-testid="input-telephone"
                className="stumpr-input"
                placeholder="06 XX XX XX XX"
                value={formData.telephone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="niveau_activite">Niveau d'activité</label>
              <select
                id="niveau_activite"
                name="niveau_activite"
                data-testid="select-niveau-activite"
                className="stumpr-select"
                value={formData.niveau_activite}
                onChange={handleChange}
              >
                <option value="">Sélectionner...</option>
                {NIVEAUX_ACTIVITE.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* SECTION 2 - Amputation */}
        <section className="stumpr-card mb-6 animate-fade-in" data-testid="section-amputation">
          <h3 className="section-header">Amputation</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="stumpr-label" htmlFor="niveau_amputation">Niveau d'amputation *</label>
              <select
                id="niveau_amputation"
                name="niveau_amputation"
                data-testid="select-niveau-amputation"
                className="stumpr-select"
                value={formData.niveau_amputation}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionner...</option>
                {NIVEAUX_AMPUTATION.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="stumpr-label" htmlFor="cote">Côté</label>
              <select
                id="cote"
                name="cote"
                data-testid="select-cote"
                className="stumpr-select"
                value={formData.cote}
                onChange={handleChange}
              >
                <option value="">Sélectionner...</option>
                {COTES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="stumpr-label" htmlFor="date_amputation">Date d'amputation</label>
              <input
                type="date"
                id="date_amputation"
                name="date_amputation"
                data-testid="input-date-amputation"
                className="stumpr-input"
                value={formData.date_amputation}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="cause">Cause</label>
              <select
                id="cause"
                name="cause"
                data-testid="select-cause"
                className="stumpr-select"
                value={formData.cause}
                onChange={handleChange}
              >
                <option value="">Sélectionner...</option>
                {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="stumpr-label" htmlFor="notes_moignon">Notes sur le moignon</label>
              <textarea
                id="notes_moignon"
                name="notes_moignon"
                data-testid="textarea-notes-moignon"
                className="stumpr-input"
                rows={3}
                placeholder="État du moignon, sensibilité, particularités..."
                value={formData.notes_moignon}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* SECTION 3 - Composants prothétiques */}
        <section className="stumpr-card mb-6 animate-fade-in" data-testid="section-composants">
          <h3 className="section-header">Composants prothétiques (LPPR)</h3>
          
          {/* Search */}
          <div className="mb-6">
            <ComponentSearch 
              onSelect={addComponent} 
              disabled={formData.composants.length >= 6}
            />
            {formData.composants.length >= 6 && (
              <p className="text-sm mt-2" style={{ color: '#e08c2a' }}>
                Maximum 6 composants atteint
              </p>
            )}
          </div>

          {/* Component cards */}
          {formData.composants.map((comp, index) => (
            <ComponentCard
              key={index}
              component={comp}
              index={index}
              onChange={updateComponent}
              onRemove={removeComponent}
            />
          ))}

          {formData.composants.length === 0 && (
            <div 
              className="text-center py-8 rounded-xl"
              style={{ backgroundColor: '#f8f9fc', color: '#8892a4' }}
            >
              <Search size={32} className="mx-auto mb-3 opacity-50" />
              <p>Recherchez et ajoutez des composants prothétiques</p>
              <p className="text-sm mt-1">Utilisez la barre de recherche ci-dessus</p>
            </div>
          )}
        </section>

        {/* SECTION 4 - Suivi médical */}
        <section className="stumpr-card mb-6 animate-fade-in" data-testid="section-suivi">
          <h3 className="section-header">Suivi médical</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="stumpr-label" htmlFor="ortho_referent">Orthoprothésiste référent</label>
              <input
                type="text"
                id="ortho_referent"
                name="ortho_referent"
                data-testid="input-ortho-referent"
                className="stumpr-input"
                placeholder="Nom de l'orthoprothésiste"
                value={formData.ortho_referent}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="cabinet_centre">Cabinet / Centre</label>
              <input
                type="text"
                id="cabinet_centre"
                name="cabinet_centre"
                data-testid="input-cabinet"
                className="stumpr-input"
                placeholder="Nom du cabinet ou centre"
                value={formData.cabinet_centre}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="telephone_ortho">Téléphone ortho</label>
              <input
                type="tel"
                id="telephone_ortho"
                name="telephone_ortho"
                data-testid="input-tel-ortho"
                className="stumpr-input"
                placeholder="01 XX XX XX XX"
                value={formData.telephone_ortho}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="medecin_prescripteur">Médecin prescripteur</label>
              <input
                type="text"
                id="medecin_prescripteur"
                name="medecin_prescripteur"
                data-testid="input-medecin"
                className="stumpr-input"
                placeholder="Nom du médecin"
                value={formData.medecin_prescripteur}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="stumpr-label" htmlFor="specialite_prescripteur">Spécialité prescripteur</label>
              <select
                id="specialite_prescripteur"
                name="specialite_prescripteur"
                data-testid="select-specialite"
                className="stumpr-select"
                value={formData.specialite_prescripteur}
                onChange={handleChange}
              >
                <option value="">Sélectionner...</option>
                {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="stumpr-label" htmlFor="prochain_rdv">Prochain rendez-vous</label>
              <input
                type="date"
                id="prochain_rdv"
                name="prochain_rdv"
                data-testid="input-prochain-rdv"
                className="stumpr-input"
                value={formData.prochain_rdv}
                onChange={handleChange}
              />
            </div>
            <div className="md:col-span-2">
              <label className="stumpr-label" htmlFor="notes_medicales">Notes médicales générales</label>
              <textarea
                id="notes_medicales"
                name="notes_medicales"
                data-testid="textarea-notes-medicales"
                className="stumpr-input"
                rows={3}
                placeholder="Autres informations médicales importantes..."
                value={formData.notes_medicales}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* SECTION 5 - Activités quotidiennes */}
        <section className="stumpr-card mb-6 animate-fade-in" data-testid="section-activites">
          <h3 className="section-header">Activités quotidiennes</h3>
          <p className="mb-5" style={{ color: '#3d4a5c' }}>
            Sélectionnez les activités que vous pratiquez régulièrement
          </p>
          
          <div className="activity-grid">
            {ACTIVITIES.map((activity) => {
              const Icon = activity.icon;
              const isActive = formData.activites.includes(activity.id);
              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => handleActivityToggle(activity.id)}
                  className={`stumpr-activity-toggle ${isActive ? 'active' : ''}`}
                  data-testid={`activity-${activity.id}`}
                >
                  <Icon size={24} />
                  <span className="text-sm text-center font-medium">{activity.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Share URL display */}
        {shareUrl && (
          <div className="stumpr-card mb-6 animate-fade-in" style={{ backgroundColor: '#e8f5f4' }}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-1" style={{ color: '#1d7a72' }}>
                  Lien de partage créé
                </h4>
                <p className="text-sm break-all" style={{ color: '#3d4a5c' }}>
                  {shareUrl}
                </p>
                <p className="text-xs mt-1" style={{ color: '#8892a4' }}>
                  Valide pendant 30 jours
                </p>
              </div>
              <button
                onClick={() => setShareUrl(null)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                style={{ color: '#1d7a72' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-4 justify-center pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="stumpr-btn-primary flex items-center gap-2"
            data-testid="save-btn"
          >
            {saving ? <div className="spinner" /> : <Save size={18} />}
            Enregistrer ma fiche
          </button>
          
          <button
            onClick={handleExportPDF}
            className="stumpr-btn-secondary flex items-center gap-2"
            data-testid="export-pdf-btn"
          >
            <FileDown size={18} />
            Exporter en PDF
          </button>
          
          <button
            onClick={handleShare}
            disabled={shareLoading}
            className="stumpr-btn-outline flex items-center gap-2"
            data-testid="share-btn"
          >
            {shareLoading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin" 
                style={{ borderColor: '#1d7a72', borderTopColor: 'transparent' }} />
            ) : (
              <Share2 size={18} />
            )}
            Partager avec mon ortho
          </button>
        </div>
      </main>
    </div>
  );
}

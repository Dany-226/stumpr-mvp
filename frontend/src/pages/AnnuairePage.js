import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Search, MapPin, Phone, Globe, Star, Plus, X } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("stumpr_token")}` },
});

// ─── Stars display ───────────────────────────────────────────────────────────
const Stars = ({ note, size = 16 }) => {
  const full = Math.floor(note);
  const half = note - full >= 0.5;
  return (
    <span className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= full ? "#f59e0b" : i === full + 1 && half ? "#f59e0b" : "none"}
          color={i <= full || (i === full + 1 && half) ? "#f59e0b" : "#d1d5db"}
          style={i === full + 1 && half ? { clipPath: "inset(0 50% 0 0)" } : {}}
        />
      ))}
    </span>
  );
};

// ─── Type badge ───────────────────────────────────────────────────────────────
const TypeBadge = ({ type }) => {
  const isCRF = type === "CRF";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isCRF ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}>
      {isCRF ? "Centre de Rééducation" : "Prothésiste"}
    </span>
  );
};

// ─── Modal: Ajouter un avis ───────────────────────────────────────────────────
const AvisModal = ({ etablissement, onClose, onSuccess }) => {
  const [auteur, setAuteur] = useState("");
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!auteur.trim()) return toast.error("Veuillez indiquer votre prénom");
    setLoading(true);
    try {
      await axios.post(
        `${API}/annuaire/${etablissement.id}/avis`,
        { auteur, note, commentaire },
        getAuthHeaders()
      );
      toast.success("Avis ajouté !");
      onSuccess();
      onClose();
    } catch {
      toast.error("Erreur lors de l'ajout de l'avis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline font-bold text-lg text-on-surface">
            Donner un avis
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-container rounded-xl p-1">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant mb-4">{etablissement.nom}</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Votre prénom</label>
            <input
              value={auteur}
              onChange={(e) => setAuteur(e.target.value)}
              className="w-full bg-surface-container rounded-xl border-none px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface placeholder:text-outline"
              placeholder="ex: Marie"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Note</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNote(n)}
                  className="w-10 h-10 rounded-xl text-sm font-bold transition-all"
                  style={{
                    border: `2px solid ${note >= n ? "#f59e0b" : "#e4e9ed"}`,
                    backgroundColor: note >= n ? "#fef3c7" : "white",
                    color: note >= n ? "#d97706" : "#737781",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Commentaire (optionnel)</label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              className="w-full bg-surface-container rounded-xl border-none px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface placeholder:text-outline resize-y"
              placeholder="Partagez votre expérience..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 font-bold"
            style={{ backgroundColor: '#00386c', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Envoi..." : "Publier l'avis"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Modal: Ajouter un établissement ─────────────────────────────────────────
const AddEtablissementModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    nom: "", type: "CRF", ville: "", departement: "",
    telephone: "", site_web: "", adresse: "", notes_communautaires: ""
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.ville.trim() || !form.departement.trim()) {
      return toast.error("Nom, ville et département sont requis");
    }
    setLoading(true);
    try {
      await axios.post(`${API}/annuaire`, form, getAuthHeaders());
      toast.success("Établissement ajouté !");
      onSuccess();
      onClose();
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-surface-container rounded-xl border-none px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface placeholder:text-outline";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-headline font-bold text-lg text-on-surface">
            Ajouter un établissement
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-container rounded-xl p-1">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Type</label>
            <div className="flex gap-3">
              {["CRF", "Prothesiste"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    border: `2px solid ${form.type === t ? "#006a63" : "#e4e9ed"}`,
                    backgroundColor: form.type === t ? "rgba(0,106,99,0.1)" : "white",
                    color: form.type === t ? "#006a63" : "#737781",
                  }}
                >
                  {t === "CRF" ? "Centre de Rééducation" : "Prothésiste"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Nom de l'établissement *</label>
            <input value={form.nom} onChange={(e) => set("nom", e.target.value)} className={inputCls} placeholder="ex: Centre de Rééducation de Berck" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Ville *</label>
              <input value={form.ville} onChange={(e) => set("ville", e.target.value)} className={inputCls} placeholder="ex: Lyon" />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Département *</label>
              <input value={form.departement} onChange={(e) => set("departement", e.target.value)} className={inputCls} placeholder="ex: 69" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Adresse</label>
            <input value={form.adresse} onChange={(e) => set("adresse", e.target.value)} className={inputCls} placeholder="ex: 12 rue de la Santé" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Téléphone</label>
              <input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} className={inputCls} placeholder="04 XX XX XX XX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Site web</label>
              <input value={form.site_web} onChange={(e) => set("site_web", e.target.value)} className={inputCls} placeholder="www.exemple.fr" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Notes communautaires</label>
            <textarea value={form.notes_communautaires} onChange={(e) => set("notes_communautaires", e.target.value)} rows={3} className={`${inputCls} resize-y`} placeholder="Infos pratiques, spécialités, accès PMR..." />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 font-bold"
            style={{ backgroundColor: '#00386c', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Ajout en cours..." : "Ajouter l'établissement"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Card établissement ───────────────────────────────────────────────────────
const EtablissementCard = ({ etab, onAvisClick }) => (
  <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm flex flex-col gap-3">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <TypeBadge type={etab.type} />
        <h3 className="font-headline font-bold text-lg text-on-surface mt-2 leading-tight">
          {etab.nom}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin size={13} className="text-outline" />
          <span className="text-sm text-on-surface-variant">
            {etab.ville}{etab.departement ? ` (${etab.departement})` : ""}
          </span>
        </div>
        {etab.adresse && (
          <p className="text-xs mt-0.5 text-on-surface-variant">{etab.adresse}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1">
          <Stars note={etab.note_moyenne} />
        </div>
        <span className="text-xs text-on-surface-variant">
          {etab.note_moyenne > 0 ? `${etab.note_moyenne}/5` : "Pas encore noté"} · {etab.nombre_avis} avis
        </span>
      </div>
    </div>

    {etab.notes_communautaires && (
      <p className="text-sm rounded-xl px-3 py-2 bg-surface-container text-on-surface-variant">
        {etab.notes_communautaires}
      </p>
    )}

    <div className="flex items-center gap-3 pt-1">
      {etab.telephone && (
        <a
          href={`tel:${etab.telephone}`}
          className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity text-secondary"
        >
          <Phone size={14} className="text-outline" />
          {etab.telephone}
        </a>
      )}
      {etab.site_web && (
        <a
          href={etab.site_web.startsWith("http") ? etab.site_web : `https://${etab.site_web}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity text-secondary"
        >
          <Globe size={14} className="text-outline" />
          Site web
        </a>
      )}
      <button
        onClick={() => onAvisClick(etab)}
        className="ml-auto bg-surface-container text-on-surface rounded-xl px-4 py-2 text-sm font-medium border-none"
      >
        <span className="flex items-center gap-1.5">
          <Star size={13} />
          Donner un avis
        </span>
      </button>
    </div>

    {etab.avis && etab.avis.length > 0 && (
      <div className="pt-2 space-y-2">
        {etab.avis.slice(-2).reverse().map((a, i) => (
          <div key={i} className="bg-surface-container-low rounded-2xl p-3 flex gap-2 items-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-secondary/10 text-secondary">
              {a.auteur?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-on-surface">{a.auteur}</span>
                <Stars note={a.note} size={12} />
              </div>
              {a.commentaire && (
                <p className="text-sm mt-0.5 text-on-surface-variant">{a.commentaire}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AnnuairePage() {
  const navigate = useNavigate();
  const [etablissements, setEtablissements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVille, setSearchVille] = useState("");
  const [filterType, setFilterType] = useState(""); // "" | "CRF" | "Prothesiste"
  const [avisTarget, setAvisTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchEtablissements = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchVille.trim()) params.ville = searchVille.trim();
      if (filterType) params.type = filterType;
      const res = await axios.get(`${API}/annuaire`, { ...getAuthHeaders(), params });
      setEtablissements(res.data);
    } catch {
      toast.error("Erreur lors du chargement de l'annuaire");
    } finally {
      setLoading(false);
    }
  }, [searchVille, filterType]);

  useEffect(() => {
    const timer = setTimeout(fetchEtablissements, 300);
    return () => clearTimeout(timer);
  }, [fetchEtablissements]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header
        className="border-b border-outline-variant/10 px-6 py-4 sticky top-0 z-50"
        style={{ backgroundColor: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-on-surface-variant hover:bg-surface-container rounded-xl p-2">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-headline font-bold text-xl text-primary">
              Annuaire
            </h1>
            <p className="text-xs text-on-surface-variant">CRF & prothésistes recommandés</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-sm"
            style={{ backgroundColor: '#006a63', color: '#fff' }}
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Barre de recherche */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input
            value={searchVille}
            onChange={(e) => setSearchVille(e.target.value)}
            placeholder="Rechercher par ville..."
            className="w-full pl-10 pr-10 bg-surface-container rounded-2xl border-none py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30 text-on-surface placeholder:text-outline"
          />
          {searchVille && (
            <button onClick={() => setSearchVille("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X size={16} className="text-outline" />
            </button>
          )}
        </div>

        {/* Filtres type */}
        <div className="flex items-center gap-2">
          <div className="bg-surface-container rounded-xl p-1 flex gap-1">
            {[
              { value: "", label: "Tous" },
              { value: "CRF", label: "CRF" },
              { value: "Prothesiste", label: "Prothésistes" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={
                  filterType === f.value
                    ? "rounded-lg px-4 py-2 text-sm shadow-sm"
                    : "text-on-surface-variant rounded-lg px-4 py-2 text-sm hover:bg-surface-container-lowest"
                }
                style={filterType === f.value ? { backgroundColor: '#ffffff', color: '#006a63', fontWeight: 700 } : {}}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-sm text-on-surface-variant">
            {etablissements.length} résultat{etablissements.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-secondary border-t-transparent animate-spin mx-auto" />
            <p className="text-sm mt-3 text-on-surface-variant">Chargement...</p>
          </div>
        ) : etablissements.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-secondary/10">
              <MapPin size={28} className="text-secondary" />
            </div>
            <p className="font-semibold text-on-surface">Aucun établissement trouvé</p>
            <p className="text-sm mt-1 text-on-surface-variant">
              {searchVille ? `Aucun résultat pour "${searchVille}"` : "Soyez le premier à ajouter un établissement !"}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 rounded-xl px-6 py-3 font-bold text-sm"
              style={{ backgroundColor: '#006a63', color: '#fff' }}
            >
              Ajouter un établissement
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {etablissements.map((etab) => (
              <EtablissementCard key={etab.id} etab={etab} onAvisClick={setAvisTarget} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {avisTarget && (
        <AvisModal
          etablissement={avisTarget}
          onClose={() => setAvisTarget(null)}
          onSuccess={fetchEtablissements}
        />
      )}
      {showAddModal && (
        <AddEtablissementModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchEtablissements}
        />
      )}
    </div>
  );
}

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
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: isCRF ? "#e8f4f3" : "#f0eeff",
        color: isCRF ? "#1d7a72" : "#6d4fc2",
      }}
    >
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-md rounded-[20px] p-6 bg-white shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
            Donner un avis
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: "#8892a4" }}>{etablissement.nom}</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#1a1f2e" }}>Votre prénom</label>
            <input
              value={auteur}
              onChange={(e) => setAuteur(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: "#e2e6ed", focusRingColor: "#1d7a72" }}
              placeholder="ex: Marie"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#1a1f2e" }}>Note</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNote(n)}
                  className="w-10 h-10 rounded-xl border-2 text-sm font-bold transition-all"
                  style={{
                    borderColor: note >= n ? "#f59e0b" : "#e2e6ed",
                    backgroundColor: note >= n ? "#fef3c7" : "white",
                    color: note >= n ? "#d97706" : "#8892a4",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#1a1f2e" }}>Commentaire (optionnel)</label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: "#e2e6ed" }}
              placeholder="Partagez votre expérience..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
            style={{ backgroundColor: "#1d7a72", opacity: loading ? 0.7 : 1 }}
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

  const inputClass = "w-full border rounded-xl px-3 py-2 text-sm outline-none";
  const inputStyle = { borderColor: "#e2e6ed" };
  const labelClass = "block text-sm font-medium mb-1";
  const labelStyle = { color: "#1a1f2e" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-lg rounded-[20px] p-6 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
            Ajouter un établissement
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass} style={labelStyle}>Type</label>
            <div className="flex gap-3">
              {["CRF", "Prothesiste"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  className="flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all"
                  style={{
                    borderColor: form.type === t ? "#1d7a72" : "#e2e6ed",
                    backgroundColor: form.type === t ? "#e8f4f3" : "white",
                    color: form.type === t ? "#1d7a72" : "#8892a4",
                  }}
                >
                  {t === "CRF" ? "Centre de Rééducation" : "Prothésiste"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Nom de l'établissement *</label>
            <input value={form.nom} onChange={(e) => set("nom", e.target.value)} className={inputClass} style={inputStyle} placeholder="ex: Centre de Rééducation de Berck" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Ville *</label>
              <input value={form.ville} onChange={(e) => set("ville", e.target.value)} className={inputClass} style={inputStyle} placeholder="ex: Lyon" />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Département *</label>
              <input value={form.departement} onChange={(e) => set("departement", e.target.value)} className={inputClass} style={inputStyle} placeholder="ex: 69" />
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Adresse</label>
            <input value={form.adresse} onChange={(e) => set("adresse", e.target.value)} className={inputClass} style={inputStyle} placeholder="ex: 12 rue de la Santé" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Téléphone</label>
              <input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} className={inputClass} style={inputStyle} placeholder="04 XX XX XX XX" />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Site web</label>
              <input value={form.site_web} onChange={(e) => set("site_web", e.target.value)} className={inputClass} style={inputStyle} placeholder="www.exemple.fr" />
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Notes communautaires</label>
            <textarea value={form.notes_communautaires} onChange={(e) => set("notes_communautaires", e.target.value)} rows={3} className={`${inputClass} resize-none`} style={inputStyle} placeholder="Infos pratiques, spécialités, accès PMR..." />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
            style={{ backgroundColor: "#1d7a72", opacity: loading ? 0.7 : 1 }}
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
  <div
    className="bg-white rounded-[20px] border p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
    style={{ borderColor: "#e2e6ed" }}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <TypeBadge type={etab.type} />
        <h3
          className="font-bold text-base mt-2 leading-tight"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}
        >
          {etab.nom}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin size={13} style={{ color: "#8892a4" }} />
          <span className="text-sm" style={{ color: "#8892a4" }}>
            {etab.ville}{etab.departement ? ` (${etab.departement})` : ""}
          </span>
        </div>
        {etab.adresse && (
          <p className="text-xs mt-0.5" style={{ color: "#aab0bc" }}>{etab.adresse}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1">
          <Stars note={etab.note_moyenne} />
        </div>
        <span className="text-xs" style={{ color: "#8892a4" }}>
          {etab.note_moyenne > 0 ? `${etab.note_moyenne}/5` : "Pas encore noté"} · {etab.nombre_avis} avis
        </span>
      </div>
    </div>

    {etab.notes_communautaires && (
      <p className="text-sm rounded-xl px-3 py-2" style={{ backgroundColor: "#f8f9fc", color: "#4a5568" }}>
        {etab.notes_communautaires}
      </p>
    )}

    <div className="flex items-center gap-3 pt-1">
      {etab.telephone && (
        <a
          href={`tel:${etab.telephone}`}
          className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: "#1d7a72" }}
        >
          <Phone size={14} />
          {etab.telephone}
        </a>
      )}
      {etab.site_web && (
        <a
          href={etab.site_web.startsWith("http") ? etab.site_web : `https://${etab.site_web}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: "#1d7a72" }}
        >
          <Globe size={14} />
          Site web
        </a>
      )}
      <button
        onClick={() => onAvisClick(etab)}
        className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all hover:opacity-80"
        style={{ borderColor: "#1d7a72", color: "#1d7a72" }}
      >
        <Star size={13} />
        Donner un avis
      </button>
    </div>

    {etab.avis && etab.avis.length > 0 && (
      <div className="border-t pt-3 space-y-2" style={{ borderColor: "#f0f2f5" }}>
        {etab.avis.slice(-2).reverse().map((a, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: "#e8f4f3", color: "#1d7a72" }}
            >
              {a.auteur?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "#1a1f2e" }}>{a.auteur}</span>
                <Stars note={a.note} size={12} />
              </div>
              {a.commentaire && (
                <p className="text-xs mt-0.5" style={{ color: "#4a5568" }}>{a.commentaire}</p>
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
    <div className="min-h-screen" style={{ backgroundColor: "#f8f9fc" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: "white", borderColor: "#e2e6ed" }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} style={{ color: "#1a1f2e" }} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
              Annuaire
            </h1>
            <p className="text-xs" style={{ color: "#8892a4" }}>CRF & prothésistes recommandés</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: "#1d7a72" }}
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Barre de recherche */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#8892a4" }} />
          <input
            value={searchVille}
            onChange={(e) => setSearchVille(e.target.value)}
            placeholder="Rechercher par ville..."
            className="w-full pl-10 pr-4 py-3 rounded-[20px] border text-sm outline-none"
            style={{ borderColor: "#e2e6ed", backgroundColor: "white" }}
          />
          {searchVille && (
            <button onClick={() => setSearchVille("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X size={16} style={{ color: "#8892a4" }} />
            </button>
          )}
        </div>

        {/* Filtres type */}
        <div className="flex gap-2">
          {[
            { value: "", label: "Tous" },
            { value: "CRF", label: "CRF" },
            { value: "Prothesiste", label: "Prothésistes" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all"
              style={{
                borderColor: filterType === f.value ? "#1d7a72" : "#e2e6ed",
                backgroundColor: filterType === f.value ? "#1d7a72" : "white",
                color: filterType === f.value ? "white" : "#8892a4",
              }}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-sm self-center" style={{ color: "#8892a4" }}>
            {etablissements.length} résultat{etablissements.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: "#1d7a72", borderTopColor: "transparent" }} />
            <p className="text-sm mt-3" style={{ color: "#8892a4" }}>Chargement...</p>
          </div>
        ) : etablissements.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#e8f4f3" }}>
              <MapPin size={28} style={{ color: "#1d7a72" }} />
            </div>
            <p className="font-semibold" style={{ color: "#1a1f2e" }}>Aucun établissement trouvé</p>
            <p className="text-sm mt-1" style={{ color: "#8892a4" }}>
              {searchVille ? `Aucun résultat pour "${searchVille}"` : "Soyez le premier à ajouter un établissement !"}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "#1d7a72" }}
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

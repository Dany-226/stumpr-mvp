import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, FileDown, Share2, Sparkles,
  ClipboardList, TrendingUp, AlertTriangle, Wrench, CheckCircle
} from "lucide-react";
import axios from "axios";
import StumprLogo from "../components/StumprLogo";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PERIODE_OPTIONS = [
  { value: 30,  label: "30 jours" },
  { value: 90,  label: "3 mois"  },
  { value: 180, label: "6 mois"  },
];

const PROTHESE_TYPE_LABELS = {
  principale: "Principale",
  secours:    "Secours",
  bain:       "Bain / Douche",
  sport:      "Sport",
  autre:      "Autre",
};

// ── Section block ─────────────────────────────────────────────────
const RapportSection = ({ icon: Icon, iconColor, iconBg, title, children }) => (
  <section className="mb-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <h3 className="font-bold text-base" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
        {title}
      </h3>
    </div>
    <div className="ml-12">{children}</div>
  </section>
);

// ── Renewal badge ────────────────────────────────────────────────
const RenewalItem = ({ item }) => {
  const jours = item.jours_restants;
  const isOverdue = jours < 0;
  const isUrgent = jours >= 0 && jours <= 30;
  const color = isOverdue || isUrgent ? "#d64545" : jours <= 90 ? "#e08c2a" : "#c9a227";
  const bg    = isOverdue || isUrgent ? "#fdeaea"  : jours <= 90 ? "#fdf3e3" : "#fdf8e3";
  const label = isOverdue ? `Dépassé de ${Math.abs(jours)}j` : `dans ${jours} j`;
  const marque = item.marque ? ` — ${item.marque}` : "";

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#e0d9cf" }}>
      <div className="text-sm" style={{ color: "#3d4a5c" }}>
        <span className="font-medium capitalize">{item.composant}</span>
        {marque}
        <span className="ml-2 text-xs" style={{ color: "#8892a4" }}>
          Prothèse {PROTHESE_TYPE_LABELS[item.prothese_type] || item.prothese_type}
        </span>
      </div>
      <span className="text-xs font-bold px-2.5 py-1 rounded-full ml-4 flex-shrink-0"
        style={{ backgroundColor: bg, color }}>
        {label}
      </span>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────
export default function RapportPage() {
  const navigate = useNavigate();
  const [protheses, setProtheses] = useState([]);
  const [periode, setPeriode] = useState(30);
  const [protheseId, setProtheseId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [rapport, setRapport] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);

  const token = localStorage.getItem("stumpr_token");
  const user = JSON.parse(localStorage.getItem("stumpr_user") || "{}");

  useEffect(() => {
    axios.get(`${API}/patient/protheses`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setProtheses(res.data.filter(p => p.statut === "active")))
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setRapport(null);
    try {
      const res = await axios.post(
        `${API}/patient/rapport`,
        { periode, prothese_id: protheseId || null },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
      );
      setRapport(res.data);
      toast.success("Rapport généré !");
    } catch (e) {
      const msg = e.response?.data?.detail || "Erreur lors de la génération";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!rapport) return;
    try {
      const pdfUrl = `${API}/patient/rapport/${rapport.id}/pdf?token=${token}`;
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stumpr-rapport-${rapport.periode}j.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("PDF téléchargé !");
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleShare = async () => {
    if (!rapport) return;
    setShareLoading(true);
    try {
      const res = await axios.post(
        `${API}/patient/rapport/${rapport.id}/share`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fullUrl = `${window.location.origin}${res.data.url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Lien copié dans le presse-papier ! Valide 30 jours.");
    } catch {
      toast.error("Erreur lors de la création du lien");
    } finally {
      setShareLoading(false);
    }
  };

  const genDate = rapport
    ? new Date(rapport.generated_at).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
      })
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 px-6 py-4"
        style={{ borderColor: "#e0d9cf" }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/tableau-de-bord")}
              className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ color: "#3d4a5c" }}>
              <ArrowLeft size={20} />
            </button>
            <StumprLogo size={22} />
          </div>
          <span className="text-sm font-medium" style={{ color: "#3d4a5c" }}>
            {user.prenom} {user.nom}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
          Rapport médical automatique
        </h1>
        <p className="text-sm mb-8" style={{ color: "#8892a4" }}>
          Généré par IA à partir de vos données de journal — à partager avec votre médecin
        </p>

        {/* Config card */}
        <div className="stumpr-card mb-6">
          <h2 className="font-bold mb-5" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
            Paramètres du rapport
          </h2>

          {/* Période */}
          <div className="mb-5">
            <label className="stumpr-label">Période analysée</label>
            <div className="flex gap-3 mt-1">
              {PERIODE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setPeriode(opt.value)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={{
                    borderColor: periode === opt.value ? "#0e6b63" : "#e0d9cf",
                    backgroundColor: periode === opt.value ? "#e6f3f2" : "white",
                    color: periode === opt.value ? "#0e6b63" : "#8892a4",
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prothèse filter */}
          <div className="mb-6">
            <label className="stumpr-label">Prothèse concernée</label>
            <select className="stumpr-select mt-1"
              value={protheseId}
              onChange={(e) => setProtheseId(e.target.value)}>
              <option value="">Toutes les prothèses</option>
              {protheses.map(p => (
                <option key={p.id} value={p.id}>
                  Prothèse {PROTHESE_TYPE_LABELS[p.type] || p.type}
                  {p.date_attribution ? ` (depuis ${new Date(p.date_attribution).toLocaleDateString("fr-FR")})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <button onClick={handleGenerate} disabled={generating}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-white transition-all"
            style={{
              backgroundColor: generating ? "#8892a4" : "#0e6b63",
              fontSize: "15px",
              letterSpacing: "-0.01em",
            }}
            data-testid="generate-rapport-btn">
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Générer mon rapport
              </>
            )}
          </button>

          {generating && (
            <p className="text-xs text-center mt-3" style={{ color: "#8892a4" }}>
              L'analyse prend environ 10 à 20 secondes.
            </p>
          )}
        </div>

        {/* Rapport result */}
        {rapport && (
          <div className="animate-fade-in">
            {/* Report header card */}
            <div className="stumpr-card mb-4" style={{ background: "linear-gradient(135deg, #0e6b63 0%, #1a9b8a 100%)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1"
                    style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                    {rapport.titre}
                  </h2>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                    Période de {rapport.periode} jours · Généré le {genDate}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={handleDownloadPDF}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/15 hover:bg-white/25 transition-all text-white"
                    data-testid="download-pdf-btn">
                    <FileDown size={16} /> PDF
                  </button>
                  <button onClick={handleShare} disabled={shareLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/15 hover:bg-white/25 transition-all text-white"
                    data-testid="share-rapport-btn">
                    {shareLoading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Share2 size={16} />}
                    Partager
                  </button>
                </div>
              </div>
            </div>

            {/* Rapport sections */}
            <div className="stumpr-card">
              <RapportSection
                icon={ClipboardList} iconColor="#0e6b63" iconBg="#e6f3f2"
                title="Résumé exécutif">
                <p className="text-sm leading-relaxed" style={{ color: "#3d4a5c" }}>
                  {rapport.resume_executif}
                </p>
              </RapportSection>

              <RapportSection
                icon={TrendingUp} iconColor="#1a73e8" iconBg="#e8f0fe"
                title="Évolution de la douleur">
                <p className="text-sm leading-relaxed" style={{ color: "#3d4a5c" }}>
                  {rapport.evolution_douleur}
                </p>
              </RapportSection>

              <RapportSection
                icon={AlertTriangle} iconColor="#e08c2a" iconBg="#fdf3e3"
                title="Événements notables">
                <p className="text-sm leading-relaxed" style={{ color: "#3d4a5c" }}>
                  {rapport.evenements_notables || "Aucun événement notable sur la période."}
                </p>
              </RapportSection>

              {rapport.composants_proches_renouvellement?.length > 0 && (
                <RapportSection
                  icon={Wrench} iconColor="#c9a227" iconBg="#fdf8e3"
                  title={`Composants à renouveler (${rapport.composants_proches_renouvellement.length})`}>
                  <div>
                    {rapport.composants_proches_renouvellement.map((item, i) => (
                      <RenewalItem key={i} item={item} />
                    ))}
                  </div>
                </RapportSection>
              )}

              <RapportSection
                icon={CheckCircle} iconColor="#2d9e6b" iconBg="#e8f7f0"
                title="Conclusion">
                <p className="text-sm leading-relaxed" style={{ color: "#3d4a5c" }}>
                  {rapport.conclusion}
                </p>
              </RapportSection>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              <button onClick={handleDownloadPDF}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold"
                style={{ backgroundColor: "#0e6b63", color: "white" }}>
                <FileDown size={18} /> Télécharger en PDF
              </button>
              <button onClick={handleShare} disabled={shareLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold"
                style={{ backgroundColor: "white", color: "#0e6b63", border: "2px solid #0e6b63" }}>
                {shareLoading
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Share2 size={18} />}
                Partager avec mon médecin
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-center mt-5 px-4 leading-relaxed" style={{ color: "#8892a4" }}>
              Ce rapport est une synthèse de vos données déclaratives générée automatiquement.
              Il ne constitue pas un avis médical, un diagnostic ou une recommandation thérapeutique.
              Stumpr — DIGICORPEX
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

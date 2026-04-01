import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, AlertTriangle, Activity, Calendar, Sparkles } from "lucide-react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Activity labels map
const ACTIVITY_LABELS = {
  "marche-courte": "🚶 Marche courte",
  "marche-longue": "🏃 Marche longue",
  "courses": "🛒 Courses",
  "conduite": "🚗 Conduite",
  "velo": "🚲 Vélo",
  "natation": "🏊 Natation",
  "sport-collectif": "⚽ Sport collectif",
  "randonnee": "🏔️ Randonnée",
  "travail": "💼 Travail",
  "sport-intense": "🏆 Sport intense",
  "repos": "🛋️ Repos",
};

// Stat card component
const StatCard = ({ icon: Icon, label, value, subValue, color, bgColor }) => (
  <div
    className="p-5 rounded-2xl border"
    style={{ backgroundColor: bgColor, borderColor: "#e2e6ed" }}
  >
    <div className="flex items-center gap-3 mb-2">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <span className="text-sm font-medium" style={{ color: "#8892a4" }}>
        {label}
      </span>
    </div>
    <p className="text-2xl font-bold" style={{ color: "#1a1f2e" }}>
      {value}
    </p>
    {subValue && (
      <p className="text-xs mt-1" style={{ color: "#8892a4" }}>
        {subValue}
      </p>
    )}
  </div>
);

// Period selector tabs
const PeriodTabs = ({ selected, onChange }) => (
  <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: "#f8f9fc" }}>
    {[7, 14, 30].map((days) => (
      <button
        key={days}
        onClick={() => onChange(days)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          selected === days
            ? "bg-white shadow-sm"
            : "hover:bg-white/50"
        }`}
        style={{ color: selected === days ? "#1d7a72" : "#8892a4" }}
        data-testid={`period-${days}j`}
      >
        {days}j
      </button>
    ))}
  </div>
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const [stats, setStats] = useState(null);
  const [entries, setEntries] = useState([]);

  const token = localStorage.getItem("stumpr_token");

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, entriesRes] = await Promise.all([
        axios.get(`${API}/journal/stats?days=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/journal?days=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      setStats(statsRes.data);
      setEntries(entriesRes.data);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const painChartData = {
    labels: stats?.entries_by_day?.map((e) => e.date) || [],
    datasets: [
      {
        label: "Douleur composants",
        data: stats?.entries_by_day?.map((e) => e.pain_composants) || [],
        borderColor: "#1d7a72",
        backgroundColor: "rgba(29, 122, 114, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: "Douleur fantôme",
        data: stats?.entries_by_day?.map((e) => e.fantome) || [],
        borderColor: "#8892a4",
        backgroundColor: "rgba(136, 146, 164, 0.1)",
        fill: false,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        borderDash: [5, 5],
      },
    ],
  };

  const wellbeingChartData = {
    labels: stats?.entries_by_day?.map((e) => e.date) || [],
    datasets: [
      {
        label: "Fatigue",
        data: stats?.entries_by_day?.map((e) => e.fatigue) || [],
        borderColor: "#d64545",
        backgroundColor: "rgba(214, 69, 69, 0.1)",
        tension: 0.4,
        pointRadius: 5,
      },
      {
        label: "Sommeil",
        data: stats?.entries_by_day?.map((e) => e.sommeil) || [],
        borderColor: "#1d7a72",
        backgroundColor: "rgba(29, 122, 114, 0.1)",
        tension: 0.4,
        pointRadius: 5,
      },
      {
        label: "Humeur",
        data: stats?.entries_by_day?.map((e) => e.humeur) || [],
        borderColor: "#e08c2a",
        backgroundColor: "rgba(224, 140, 42, 0.1)",
        tension: 0.4,
        pointRadius: 5,
      },
    ],
  };

  // Count activities across all entries
  const activityCounts = {};
  entries.forEach((entry) => {
    (entry.activites || []).forEach((act) => {
      activityCounts[act] = (activityCounts[act] || 0) + 1;
    });
  });

  const activityChartData = {
    labels: Object.keys(activityCounts).map((k) => ACTIVITY_LABELS[k] || k),
    datasets: [
      {
        label: "Jours d'activité",
        data: Object.values(activityCounts),
        backgroundColor: [
          "rgba(29, 122, 114, 0.8)",
          "rgba(29, 122, 114, 0.7)",
          "rgba(29, 122, 114, 0.6)",
          "rgba(29, 122, 114, 0.5)",
          "rgba(29, 122, 114, 0.4)",
        ],
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: "white",
        titleColor: "#1a1f2e",
        bodyColor: "#3d4a5c",
        borderColor: "#e2e6ed",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "#f0f0f0" },
        ticks: { font: { size: 10 } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
      },
    },
  };

  const painChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: { ...chartOptions.scales.y, max: 10 },
    },
  };

  const wellbeingChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        max: 4,
        ticks: {
          stepSize: 1,
          font: { size: 10 },
          callback: (value) => {
            const labels = ["Très bas", "Bas", "Normal", "Bien", "Excellent"];
            return labels[value] || value;
          },
        },
      },
    },
  };

  const activityChartOptions = {
    ...chartOptions,
    indexAxis: "y",
    plugins: {
      ...chartOptions.plugins,
      legend: { display: false },
    },
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPainBadge = (score) => {
    if (score <= 2) return { bg: "#e8f7f0", color: "#2d9e6b" };
    if (score <= 5) return { bg: "#fdf8e3", color: "#c9a227" };
    if (score <= 7) return { bg: "#fdf3e3", color: "#e08c2a" };
    return { bg: "#fdeaea", color: "#d64545" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8f9fc" }}>
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "#e2e6ed", borderTopColor: "#1d7a72" }}
          />
          <p style={{ color: "#8892a4" }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8f9fc" }}>
      {/* Header */}
      <header className="bg-white border-b border-[#e2e6ed] px-6 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/fiche-patient")}
              className="p-2 rounded-lg hover:bg-[#f8f9fc] transition-colors"
              style={{ color: "#3d4a5c" }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1d7a72" }}>
              Tableau de bord
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/rapport")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium"
              style={{ backgroundColor: "#e6f3f2", color: "#0e6b63" }}
              data-testid="nav-rapport"
            >
              <Sparkles size={16} />
              Rapport IA
            </button>
            <button
              onClick={() => navigate("/journal")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white"
              style={{ backgroundColor: "#1d7a72" }}
              data-testid="nav-journal"
            >
              <Plus size={18} />
              Nouveau journal
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Period selector */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold" style={{ color: "#1a1f2e" }}>
            Période d'analyse
          </h2>
          <PeriodTabs selected={period} onChange={setPeriod} />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Activity}
            label="Douleur moyenne"
            value={`${stats?.avg_pain_composants || 0}/10`}
            subValue={`Fantôme: ${stats?.avg_fantome || 0}/10`}
            color="#1d7a72"
            bgColor="white"
          />
          <StatCard
            icon={Calendar}
            label="Jours actifs"
            value={`${stats?.active_days || 0}/${stats?.total_days || period}`}
            subValue={`${Math.round((stats?.active_days / stats?.total_days) * 100) || 0}% d'activité`}
            color="#e08c2a"
            bgColor="white"
          />
          <StatCard
            icon={AlertTriangle}
            label="Alertes douleur"
            value={stats?.alerts_count || 0}
            subValue="Score ≥ 7"
            color={stats?.alerts_count > 0 ? "#d64545" : "#2d9e6b"}
            bgColor="white"
          />
        </div>

        {entries.length === 0 ? (
          <div className="stumpr-card text-center py-12">
            <p className="text-lg mb-4" style={{ color: "#8892a4" }}>
              Aucune entrée de journal sur cette période
            </p>
            <button
              onClick={() => navigate("/journal")}
              className="px-6 py-3 rounded-xl font-medium text-white"
              style={{ backgroundColor: "#1d7a72" }}
            >
              Créer ma première entrée
            </button>
          </div>
        ) : (
          <>
            {/* Pain chart */}
            <section className="stumpr-card mb-6" data-testid="chart-douleurs">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
                📈 Évolution des douleurs
              </h3>
              <div style={{ height: "300px" }}>
                <Line data={painChartData} options={painChartOptions} />
              </div>
            </section>

            {/* Wellbeing chart */}
            <section className="stumpr-card mb-6" data-testid="chart-bienetre">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
                💪 Évolution du bien-être
              </h3>
              <div style={{ height: "300px" }}>
                <Line data={wellbeingChartData} options={wellbeingChartOptions} />
              </div>
            </section>

            {/* Activities chart */}
            {Object.keys(activityCounts).length > 0 && (
              <section className="stumpr-card mb-6" data-testid="chart-activites">
                <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
                  🏃 Activités réalisées
                </h3>
                <div style={{ height: `${Math.max(200, Object.keys(activityCounts).length * 40)}px` }}>
                  <Bar data={activityChartData} options={activityChartOptions} />
                </div>
              </section>
            )}

            {/* Recent entries */}
            <section className="stumpr-card" data-testid="historique">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: "#1a1f2e" }}>
                📋 Historique récent
              </h3>
              <div className="space-y-3">
                {entries.slice(0, 7).map((entry) => {
                  const avgPain = entry.douleurs?.composants?.length > 0
                    ? entry.douleurs.composants.reduce((sum, c) => sum + c.score, 0) / entry.douleurs.composants.length
                    : 0;
                  const painBadge = getPainBadge(Math.max(avgPain, entry.douleurs?.fantome || 0));
                  
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 rounded-xl border"
                      style={{ borderColor: "#e2e6ed" }}
                    >
                      <div>
                        <p className="font-medium text-sm" style={{ color: "#1a1f2e" }}>
                          {formatDate(entry.created_at)}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "#8892a4" }}>
                          {entry.activites?.map((a) => ACTIVITY_LABELS[a]?.split(" ")[0] || "").join(" ") || "Aucune activité"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-semibold px-3 py-1 rounded-full"
                          style={{ backgroundColor: painBadge.bg, color: painBadge.color }}
                        >
                          Douleur: {Math.round(avgPain)}/10
                        </span>
                        {entry.has_alert && (
                          <span
                            className="text-xs font-semibold px-2 py-1 rounded-full"
                            style={{ backgroundColor: "#fdeaea", color: "#d64545" }}
                          >
                            ⚠️
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

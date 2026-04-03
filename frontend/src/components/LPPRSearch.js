import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LPPRSearch({ onSelect, hideTarif = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const token = localStorage.getItem("stumpr_token");

  const search = useCallback(async (q) => {
    if (q.length < 1) { setResults([]); setOpen(false); return; }
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
    <div style={{ marginBottom: 16 }}>
      <label className="stumpr-label">Recherche LPPR (optionnel)</label>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", flexWrap: "nowrap", marginBottom: 8, paddingBottom: 2 }}>
        {["Manchon", "Emboîture", "Emboîture tibiale", "Emboîture fémorale", "Genou", "Pied Classe I", "Pied Classe II", "Pied Classe III", "Pied rigide", "Main", "Myoélectrique", "Adaptateur rotation", "Amortisseur", "Aqualeg", "Genou monoaxial", "Genou polycentrique", "MPK", "Hanche"].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setQuery(cat)}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#e6f3f2"; e.currentTarget.style.color = "#0e6b63"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#f0ece6"; e.currentTarget.style.color = "#3d4a5c"; }}
            style={{ flexShrink: 0, background: "#f0ece6", color: "#3d4a5c", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {cat}
          </button>
        ))}
      </div>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          className="stumpr-input"
          placeholder="Code ou nom du composant..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}
            className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: "#0e6b63", borderTopColor: "transparent" }} />
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          marginTop: 4,
          border: "1px solid #e0d9cf",
          borderRadius: 12,
          background: "#fff",
          maxHeight: 200,
          overflowY: "auto",
          boxShadow: "0 4px 12px rgba(14, 107, 99, 0.10)",
        }}>
          {results.map((item, i) => (
            <div
              key={i}
              onClick={() => handleSelect(item)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: i < results.length - 1 ? "1px solid #f0ece4" : "none",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f0faf9"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1f2e" }}>
                [{item.code}] {item.nomenclature}
              </div>
              <div style={{ fontSize: 12, color: "#8892a4", marginTop: 2 }}>
                {!hideTarif && (item.tarif ? `${item.tarif}€` : "Tarif N/A")}{!hideTarif && " · "}{item.duree_ans ? `${item.duree_ans} ans` : ""}{item.duree_ans && item.categorie ? " · " : ""}{item.categorie || ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && query.length >= 1 && results.length === 0 && !loading && (
        <div style={{
          marginTop: 4,
          border: "1px solid #e0d9cf",
          borderRadius: 12,
          background: "#fff",
          padding: "14px",
          textAlign: "center",
          fontSize: 13,
          color: "#8892a4",
        }}>
          Aucun résultat
        </div>
      )}
    </div>
  );
}

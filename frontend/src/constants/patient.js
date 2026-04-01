export const NIVEAUX_ACTIVITE = ["Sédentaire", "Modéré", "Actif", "Très actif", "Sportif compétition"];

export const NIVEAUX_AMPUTATION = [
  "Tibiale (sous le genou)", "Fémorale (au-dessus du genou)", "Désarticulation genou",
  "Désarticulation hanche", "Partielle du pied", "Transradiale (avant-bras)",
  "Humérale (bras)", "Désarticulation coude", "Désarticulation épaule", "Bilatérale"
];

export const COTES = ["Gauche", "Droit", "Bilatéral"];

export const CAUSES = ["Traumatique", "Vasculaire", "Tumorale", "Congénitale", "Infectieuse", "Autre"];

export const PROTHESE_TYPES = {
  principale: { label: "Principale", bg: "#e6f3f2", text: "#0e6b63" },
  secours:    { label: "Secours",    bg: "#fdf8e3", text: "#c9a227" },
  bain:       { label: "Bain / Douche", bg: "#e8f0fe", text: "#1a73e8" },
  sport:      { label: "Sport",      bg: "#e8f5e9", text: "#2e7d32" },
  autre:      { label: "Autre",      bg: "#f3e5f5", text: "#7b1fa2" },
};

export const COMPOSANT_TYPES = [
  { value: "emboiture",           label: "Emboîture" },
  { value: "pied_prothetique",    label: "Pied prothétique" },
  { value: "genou_prothetique",   label: "Genou prothétique" },
  { value: "manchon_liner",       label: "Manchon / Liner" },
  { value: "attaches_suspension", label: "Attaches / Suspension" },
  { value: "cosmetique_pied",     label: "Cosmétique pied" },
  { value: "autre",               label: "Autre" },
];

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
  { value: "Manchon", label: "Manchon" },
  { value: "Emboîture", label: "Emboîture" },
  { value: "Emboîture tibiale", label: "Emboîture tibiale" },
  { value: "Emboîture fémorale", label: "Emboîture fémorale" },
  { value: "Pied Classe I", label: "Pied Classe I" },
  { value: "Pied Classe II", label: "Pied Classe II" },
  { value: "Pied Classe III", label: "Pied Classe III" },
  { value: "Pied rigide", label: "Pied rigide" },
  { value: "Genou monoaxial", label: "Genou monoaxial" },
  { value: "Genou polycentrique", label: "Genou polycentrique" },
  { value: "MPK", label: "MPK" },
  { value: "Main", label: "Main" },
  { value: "Myoélectrique", label: "Myoélectrique" },
  { value: "Hanche", label: "Hanche" },
  { value: "Adaptateur rotation", label: "Adaptateur rotation" },
  { value: "Amortisseur", label: "Amortisseur" },
  { value: "Aqualeg", label: "Aqualeg" },
  { value: "Prothèse de vie sociale", label: "Prothèse de vie sociale" },
  { value: "Réparations", label: "Réparations" },
  { value: "Variant", label: "Variant" },
  { value: "Adjonction", label: "Adjonction" },
  { value: "Autre", label: "Autre" },
];

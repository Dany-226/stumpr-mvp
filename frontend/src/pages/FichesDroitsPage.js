import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowLeft, RefreshCw, UserCheck, AlertCircle, Wrench, Layers } from "lucide-react";
import StumprLogo from "../components/StumprLogo";

const FICHES = [
  {
    id: 1,
    icon: RefreshCw,
    color: "#006a63",
    bgColor: "#e6f3f2",
    titre: "Mon renouvellement de prothèse",
    resume: "Quand peut-on renouveler ? Comment initier la demande soi-même ? Quels délais selon le composant ?",
    contenu: [
      {
        section: "Quand puis-je renouveler ma prothèse ?",
        texte: "Les délais de renouvellement sont fixés par la Liste des Produits et Prestations Remboursables (LPPR). Ils varient selon le composant :\n\n• Emboîture : 3 à 6 mois (si justification médicale d'usure ou de changement morphologique)\n• Pied prothétique : 1 à 3 ans selon le niveau d'activité\n• Genou prothétique : 3 à 5 ans\n• Manchon / liner : 3 à 6 mois\n• Prothèse complète : 3 à 6 ans selon le type et l'usage\n\nCes délais sont des minimums : votre médecin peut justifier un renouvellement anticipé si votre état physique a évolué (prise/perte de poids, changement de niveau d'activité, problème de moignon)."
      },
      {
        section: "Comment initier la demande vous-même ?",
        texte: "1. Consultez votre médecin prescripteur (MPR, généraliste, chirurgien) pour obtenir une ordonnance de renouvellement.\n\n2. Votre orthoprothésiste établit un devis (DPID — Demande de Prise en Charge Individuelle et Dérogatoire) si le délai LPPR n'est pas écoulé.\n\n3. La CPAM (Caisse Primaire d'Assurance Maladie) donne son accord préalable sous 15 jours ouvrés. Sans réponse, l'accord est tacite.\n\n4. En cas de refus, vous pouvez saisir le service médical de votre CPAM pour une révision."
      },
      {
        section: "Bon à savoir",
        texte: "Vous n'êtes pas obligé d'attendre que votre prothèse soit inutilisable pour demander un renouvellement. Une usure significative, une douleur persistante ou un changement morphologique suffisent à justifier la demande. Documentez les problèmes rencontrés par écrit auprès de votre médecin."
      }
    ]
  },
  {
    id: 2,
    icon: UserCheck,
    color: "#c97c2a",
    bgColor: "#fdf3e3",
    titre: "Changer de prestataire",
    resume: "Le libre choix de l'orthoprothésiste est un droit fondamental. Comment en changer et quelles démarches ?",
    contenu: [
      {
        section: "Un droit fondamental",
        texte: "L'article L1110-8 du Code de la santé publique garantit à tout patient le libre choix de son praticien et de son prestataire. Vous pouvez changer d'orthoprothésiste à tout moment, sans avoir à justifier votre décision auprès de votre prestataire actuel."
      },
      {
        section: "Comment procéder ?",
        texte: "1. Choisissez un nouvel orthoprothésiste agréé LPPR dans votre région (liste disponible sur le site de votre CPAM ou via les annuaires professionnels).\n\n2. Demandez à votre nouveau prestataire de récupérer votre dossier technique (fiches techniques des composants, moulages si conservés). Votre ancien prestataire est tenu de le transmettre.\n\n3. Une nouvelle ordonnance médicale n'est pas obligatoire si votre prescription en cours est encore valide. Vérifiez la date de validité avec votre médecin.\n\n4. Informez votre CPAM du changement de prestataire si nécessaire (certaines caisses le demandent pour la facturation directe)."
      },
      {
        section: "Points de vigilance",
        texte: "• Votre ancien prestataire ne peut pas vous facturer des frais de dossier ou de transfert.\n• Si votre prothèse est en cours de garantie, vérifiez que le nouveau prestataire peut assurer le suivi (certains fabricants imposent un réseau agréé).\n• En cas de refus de transmission du dossier, signalez-le à votre CPAM ou à l'ARS (Agence Régionale de Santé)."
      }
    ]
  },
  {
    id: 3,
    icon: AlertCircle,
    color: "#d64545",
    bgColor: "#fdeaea",
    titre: "Contester un devis ou un tarif",
    resume: "Tarifs opaques, coûts excessifs : quels recours ? Qui contacter ? CPAM, médiateur, associations.",
    contenu: [
      {
        section: "Comprendre la structure d'un devis",
        texte: "Un devis d'appareillage doit obligatoirement mentionner :\n\n• Le tarif LPPR (remboursement Sécurité Sociale)\n• Le dépassement tarifaire éventuel (à votre charge ou mutuelle)\n• Le détail de chaque composant avec son code LPPR\n• Les prestations incluses (essayage, réglages, suivi)\n\nSi ces éléments manquent, vous êtes en droit d'exiger un devis détaillé avant toute signature."
      },
      {
        section: "Recours en cas de litige",
        texte: "1. CPAM — Votre premier interlocuteur : contactez le service médical de votre caisse pour signaler une facturation abusive ou un devis non conforme. La CPAM peut refuser la prise en charge d'un dépassement injustifié.\n\n2. Médiateur de l'Assurance — Si votre mutuelle est impliquée dans le litige, le médiateur de l'assurance peut intervenir gratuitement (médiateur-assurance.org).\n\n3. DGCCRF — En cas de pratique commerciale trompeuse (tarifs non affichés, devis non fourni), signalez-le à la Direction Générale de la Concurrence (signal.conso.gouv.fr).\n\n4. Associations de patients — ADEPA, APF France Handicap ou votre association régionale peuvent vous accompagner et vous conseiller dans vos démarches."
      },
      {
        section: "Bon à savoir",
        texte: "Vous avez le droit d'obtenir plusieurs devis avant de choisir votre prestataire. Ne signez jamais un devis sous pression et prenez le temps de le comparer avec les tarifs de référence LPPR publiés sur ameli.fr."
      }
    ]
  },
  {
    id: 4,
    icon: Wrench,
    color: "#2d9e6b",
    bgColor: "#e8f7f0",
    titre: "Droits à la réparation",
    resume: "Que couvre la LPPR pour les réparations ? Quelles pièces sont prises en charge et quels délais ?",
    contenu: [
      {
        section: "Ce que couvre la LPPR",
        texte: "La LPPR prévoit une prise en charge des réparations pour les prothèses dans le cadre de leur durée de vie normale. Sont généralement couverts :\n\n• Remplacement des pièces d'usure (pieds, genoux mécaniques, sangles, mousses cosmétiques)\n• Réparation de la structure en cas de casse accidentelle non fautive\n• Remplacement des manchons et liners dans les délais LPPR\n• Ajustements et réglages liés à une évolution du moignon"
      },
      {
        section: "La procédure de prise en charge",
        texte: "1. Contactez votre orthoprothésiste qui établit un devis de réparation avec les codes LPPR des pièces concernées.\n\n2. Pour les réparations dépassant un certain montant (variable selon les caisses), un accord préalable de la CPAM est nécessaire.\n\n3. La CPAM dispose de 15 jours ouvrés pour répondre. Sans réponse, l'accord est tacite.\n\n4. En urgence (prothèse inutilisable), une procédure accélérée existe : demandez à votre orthoprothésiste de la déclencher."
      },
      {
        section: "Casses accidentelles et garanties",
        texte: "• La garantie légale de conformité s'applique 2 ans après la livraison : toute panne non liée à un usage anormal est à la charge du prestataire.\n• En cas de casse accidentelle hors garantie, votre assurance habitation (responsabilité civile) peut couvrir une partie des frais : vérifiez votre contrat.\n• Certaines mutuelles proposent des garanties spécifiques appareillage : renseignez-vous auprès de la vôtre."
      }
    ]
  },
  {
    id: 5,
    icon: Layers,
    color: "#6d4fc2",
    bgColor: "#f0eeff",
    titre: "L'emboîture : renouvellement et adaptation",
    resume: "L'emboîture est renouvelée fréquemment. Quand en demander une nouvelle et comment justifier l'usure ?",
    contenu: [
      {
        section: "Pourquoi l'emboîture est un cas à part",
        texte: "L'emboîture est le composant qui interface directement votre moignon et la prothèse. C'est le plus sensible aux variations morphologiques et le plus fréquemment renouvelé. Une emboîture mal ajustée entraîne douleurs, plaies et risques de chute — c'est donc une priorité médicale."
      },
      {
        section: "Délais LPPR et renouvellement anticipé",
        texte: "La LPPR prévoit un renouvellement de l'emboîture tous les 3 à 6 mois en cas de nécessité médicale justifiée. Les motifs reconnus sont :\n\n• Variation de volume du moignon (prise/perte de poids, atrophie musculaire)\n• Usure des matériaux (délamination, fissures, perte d'étanchéité)\n• Modification du niveau d'activité\n• Apparition de plaies ou d'irritations liées au mauvais ajustement\n• Évolution post-chirurgicale"
      },
      {
        section: "Comment justifier la demande ?",
        texte: "1. Documentez les problèmes : photos des irritations ou de l'usure, note écrite des douleurs ressenties.\n\n2. Consultez votre médecin prescripteur pour obtenir une ordonnance mentionnant explicitement le motif médical (ex : \"variation de volume du moignon, renouvellement de l'emboîture nécessaire\").\n\n3. Votre orthoprothésiste réalise une nouvelle prise de mesure et établit un devis avec le code LPPR approprié.\n\n4. Si la CPAM conteste, vous pouvez demander une expertise médicale indépendante auprès du service médical de votre caisse."
      },
      {
        section: "Astuce pratique",
        texte: "Tenez un journal de vos douleurs et de l'état de votre emboîture. Ce document peut être partagé avec votre médecin et votre CPAM pour appuyer une demande de renouvellement anticipé. L'application Stumpr. vous permet de journaliser ces informations au quotidien."
      }
    ]
  }
];

// ─── Modal fiche ──────────────────────────────────────────────────────────────
const FicheModal = ({ fiche, onClose }) => {
  const Icon = fiche.icon;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-container-lowest rounded-3xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header modal */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: fiche.bgColor }}
            >
              <Icon size={20} style={{ color: fiche.color }} />
            </div>
            <h2 className="font-headline font-bold text-xl text-on-surface">
              {fiche.titre}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container rounded-xl p-2 shrink-0 ml-4"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps modal */}
        <div className="px-6 pb-6 space-y-2">
          {/* Disclaimer */}
          <div
            className="flex gap-3 rounded-xl p-4"
            style={{ backgroundColor: "#fdf8e3", border: "1px solid #f0e0a0" }}
          >
            <span style={{ fontSize: 16, lineHeight: 1.5 }}>⚠️</span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Ces informations sont données à titre indicatif et ne constituent pas un conseil juridique. Vérifiez les règles applicables à votre situation sur{" "}
              <a href="https://www.ameli.fr" target="_blank" rel="noopener noreferrer" style={{ color: "#006a63", fontWeight: 600, textDecoration: "underline" }}>ameli.fr</a>
              {" "}ou auprès de votre CPAM.
            </p>
          </div>

          {fiche.contenu.map((bloc, i) => (
            <div key={i}>
              <h3 className="font-headline font-bold text-base text-on-surface border-l-4 border-secondary pl-4 mb-2 mt-6">
                {bloc.section}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                {bloc.texte}
              </p>
            </div>
          ))}

          {/* Footer bouton */}
          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#00386c" }}
            >
              J'ai compris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Card fiche ───────────────────────────────────────────────────────────────
const FicheCard = ({ fiche, onClick }) => {
  const Icon = fiche.icon;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface-container-lowest rounded-3xl p-6 shadow-sm mb-4 hover:shadow-md transition-shadow"
    >
      <div
        className="rounded-2xl p-3 w-12 h-12 flex items-center justify-center"
        style={{ backgroundColor: fiche.bgColor }}
      >
        <Icon size={22} style={{ color: fiche.color }} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface mt-3 mb-1">
        {fiche.titre}
      </h3>
      <p className="text-sm text-on-surface-variant">
        {fiche.resume}
      </p>
      <span className="text-secondary font-bold text-sm mt-4 flex items-center gap-1 hover:opacity-70">
        Lire la fiche
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────
export default function FichesDroitsPage() {
  const navigate = useNavigate();
  const [ficheOuverte, setFicheOuverte] = useState(null);

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header
        className="border-b border-outline-variant/10 px-6 py-4 sticky top-0 z-50"
        style={{ backgroundColor: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-on-surface-variant hover:bg-surface-container rounded-xl p-2"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-headline font-bold text-xl text-primary">
            Fiches droits
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Titre section */}
        <div className="mb-6">
          <h2 className="font-headline font-bold text-2xl text-on-surface mb-2">
            Vos droits
          </h2>
          <p className="text-on-surface-variant text-sm">
            Vos droits en matière d'appareillage, expliqués simplement.
          </p>
        </div>

        {/* Liste des fiches */}
        <div>
          {FICHES.map((fiche) => (
            <FicheCard
              key={fiche.id}
              fiche={fiche}
              onClick={() => setFicheOuverte(fiche)}
            />
          ))}
        </div>

        {/* Note bas de page */}
        <p className="text-center mt-8 text-xs text-on-surface-variant">
          Ces fiches sont à titre informatif. Pour toute situation spécifique, consultez un professionnel de santé ou un conseiller CPAM.
        </p>
      </main>

      {/* Modal */}
      {ficheOuverte && (
        <FicheModal
          fiche={ficheOuverte}
          onClose={() => setFicheOuverte(null)}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Footprints, PersonStanding, ShoppingCart, Car, Bike, 
  Waves, CircleDot, Mountain, Briefcase, Armchair, Trophy,
  AlertTriangle, CheckCircle, Clock
} from "lucide-react";
import axios from "axios";
import StumprLogo from "../components/StumprLogo";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Activity definitions with icons
const ACTIVITIES_MAP = {
  marche_courte: { label: "Marche courte (< 1km)", icon: Footprints },
  marche_longue: { label: "Marche longue (> 1km)", icon: PersonStanding },
  courses: { label: "Courses / Supermarché", icon: ShoppingCart },
  conduite: { label: "Conduite automobile", icon: Car },
  velo: { label: "Vélo", icon: Bike },
  natation: { label: "Natation", icon: Waves },
  sport_collectif: { label: "Sport collectif", icon: CircleDot },
  randonnee: { label: "Randonnée", icon: Mountain },
  travail_debout: { label: "Travail debout", icon: Briefcase },
  travail_assis: { label: "Travail assis", icon: Armchair },
  competition: { label: "Activité intense / compétition", icon: Trophy },
};

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
      <span className="stumpr-badge-danger flex items-center gap-1">
        <AlertTriangle size={14} />
        Renouvellement dépassé : {formatDate(renewal)}
      </span>
    );
  } else if (diffMonths <= 1) {
    return (
      <span className="stumpr-badge-danger flex items-center gap-1">
        <AlertTriangle size={14} />
        Renouvellement urgent : {formatDate(renewal)}
      </span>
    );
  } else if (diffMonths <= 6) {
    return (
      <span className="stumpr-badge-warning flex items-center gap-1">
        <Clock size={14} />
        Renouvellement dans {Math.ceil(diffMonths)} mois : {formatDate(renewal)}
      </span>
    );
  } else {
    return (
      <span className="stumpr-badge-ok flex items-center gap-1">
        <CheckCircle size={14} />
        Renouvellement estimé : {formatDate(renewal)}
      </span>
    );
  }
};

// Info field component
const InfoField = ({ label, value }) => (
  <div className="mb-3">
    <span className="stumpr-label" style={{ marginBottom: '2px' }}>{label}</span>
    <p style={{ color: '#1a1f2e' }}>{value || "Non renseigné"}</p>
  </div>
);

export default function SharedViewPage() {
  const { shareId } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSharedPatient();
  }, [shareId]);

  const loadSharedPatient = async () => {
    try {
      const response = await axios.get(`${API}/shared/${shareId}`);
      setPatient(response.data);
    } catch (err) {
      if (err.response?.status === 410) {
        setError("Ce lien de partage a expiré");
      } else if (err.response?.status === 404) {
        setError("Lien de partage non trouvé");
      } else {
        setError("Erreur lors du chargement de la fiche");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Non renseignée";
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fc' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" 
            style={{ borderColor: '#e2e6ed', borderTopColor: '#1d7a72' }} />
          <p style={{ color: '#8892a4' }}>Chargement de la fiche...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#f8f9fc' }}>
        <div className="stumpr-card text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto mb-4" style={{ color: '#d64545' }} />
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#1a1f2e' }}>
            {error}
          </h2>
          <p className="mb-6" style={{ color: '#8892a4' }}>
            Le lien que vous avez utilisé n'est plus valide ou a expiré.
          </p>
          <Link to="/" className="stumpr-btn-primary inline-block">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fc' }}>
      {/* Header */}
      <header className="app-header">
        <StumprLogo size={22} />
        <span 
          className="text-sm px-3 py-1 rounded-full"
          style={{ backgroundColor: '#e8f5f4', color: '#1d7a72' }}
        >
          Consultation uniquement
        </span>
      </header>

      {/* Main content */}
      <main className="container-main">
        <div className="mb-6">
          <h2 
            className="text-3xl font-bold"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#1a1f2e' }}
          >
            Fiche Patient
          </h2>
          <p style={{ color: '#8892a4' }}>
            Partagée le {formatDate(patient.updated_at)}
          </p>
        </div>

        {/* SECTION 1 - Identité */}
        <section className="stumpr-card mb-6" data-testid="shared-section-identite">
          <h3 className="section-header">Identité patient</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InfoField label="Prénom" value={patient.prenom} />
            <InfoField label="Nom" value={patient.nom} />
            <InfoField label="Date de naissance" value={formatDate(patient.date_naissance)} />
            <InfoField label="Email" value={patient.email} />
            <InfoField label="Téléphone" value={patient.telephone} />
            <InfoField label="Niveau d'activité" value={patient.niveau_activite} />
          </div>
        </section>

        {/* SECTION 2 - Amputation */}
        <section className="stumpr-card mb-6" data-testid="shared-section-amputation">
          <h3 className="section-header">Amputation</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InfoField label="Niveau d'amputation" value={patient.niveau_amputation} />
            <InfoField label="Côté" value={patient.cote} />
            <InfoField label="Date d'amputation" value={formatDate(patient.date_amputation)} />
            <InfoField label="Cause" value={patient.cause} />
          </div>
          
          {patient.notes_moignon && (
            <div className="mt-4">
              <span className="stumpr-label">Notes sur le moignon</span>
              <p 
                className="mt-1 p-3 rounded-lg"
                style={{ backgroundColor: '#f8f9fc', color: '#1a1f2e' }}
              >
                {patient.notes_moignon}
              </p>
            </div>
          )}
        </section>

        {/* SECTION 3 - Composants */}
        {patient.composants && patient.composants.length > 0 && (
          <section className="stumpr-card mb-6" data-testid="shared-section-composants">
            <h3 className="section-header">Composants prothétiques</h3>
            
            {patient.composants.map((comp, index) => (
              <div 
                key={index} 
                className="component-card"
                data-testid={`shared-component-${index}`}
              >
                <h4 
                  className="font-semibold mb-3"
                  style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#1a1f2e' }}
                >
                  Composant {index + 1}
                </h4>
                
                <div className="stumpr-component-selected mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="stumpr-label" style={{ marginBottom: '2px' }}>Code LPPR</span>
                      <p style={{ color: '#1a1f2e' }}>{comp.code}</p>
                    </div>
                    <div>
                      <span className="stumpr-label" style={{ marginBottom: '2px' }}>Tarif TTC</span>
                      <p style={{ color: '#1a1f2e' }}>{comp.tarif ? `${comp.tarif}€` : 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="stumpr-label" style={{ marginBottom: '2px' }}>Nomenclature</span>
                      <p style={{ color: '#1a1f2e' }}>{comp.nomenclature}</p>
                    </div>
                    <div>
                      <span className="stumpr-label" style={{ marginBottom: '2px' }}>Durée prise en charge</span>
                      <p style={{ color: '#1a1f2e' }}>{comp.duree_ans ? `${comp.duree_ans} ans` : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="stumpr-label" style={{ marginBottom: '2px' }}>Catégorie</span>
                      <p style={{ color: '#1a1f2e' }}>{comp.categorie || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoField label="Date de prescription" value={formatDate(comp.date_prescription)} />
                  <InfoField label="Prise en charge complémentaire" value={comp.prise_en_charge_complementaire} />
                  <InfoField label="Montant remboursé" value={comp.montant_rembourse ? `${comp.montant_rembourse}€` : null} />
                  <InfoField label="État du composant" value={comp.etat_composant} />
                </div>

                {comp.date_prescription && comp.duree_ans && (
                  <div className="mt-4">
                    <RenewalBadge 
                      prescriptionDate={comp.date_prescription} 
                      durationYears={comp.duree_ans} 
                    />
                  </div>
                )}

                {comp.notes && (
                  <div className="mt-4">
                    <span className="stumpr-label">Notes</span>
                    <p 
                      className="mt-1 p-3 rounded-lg text-sm"
                      style={{ backgroundColor: '#f8f9fc', color: '#1a1f2e' }}
                    >
                      {comp.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* SECTION 4 - Suivi médical */}
        <section className="stumpr-card mb-6" data-testid="shared-section-suivi">
          <h3 className="section-header">Suivi médical</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InfoField label="Orthoprothésiste référent" value={patient.ortho_referent} />
            <InfoField label="Cabinet / Centre" value={patient.cabinet_centre} />
            <InfoField label="Téléphone ortho" value={patient.telephone_ortho} />
            <InfoField label="Médecin prescripteur" value={patient.medecin_prescripteur} />
            <InfoField label="Spécialité prescripteur" value={patient.specialite_prescripteur} />
            <InfoField label="Prochain rendez-vous" value={formatDate(patient.prochain_rdv)} />
          </div>
          
          {patient.notes_medicales && (
            <div className="mt-4">
              <span className="stumpr-label">Notes médicales générales</span>
              <p 
                className="mt-1 p-3 rounded-lg"
                style={{ backgroundColor: '#f8f9fc', color: '#1a1f2e' }}
              >
                {patient.notes_medicales}
              </p>
            </div>
          )}
        </section>

        {/* SECTION 5 - Activités */}
        {patient.activites && patient.activites.length > 0 && (
          <section className="stumpr-card mb-6" data-testid="shared-section-activites">
            <h3 className="section-header">Activités quotidiennes</h3>
            
            <div className="flex flex-wrap gap-3">
              {patient.activites.map((activityId) => {
                const activity = ACTIVITIES_MAP[activityId];
                if (!activity) return null;
                const Icon = activity.icon;
                return (
                  <div
                    key={activityId}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#e8f5f4', color: '#1d7a72' }}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{activity.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center py-8" style={{ color: '#8892a4' }}>
          <p className="text-sm">
            Cette fiche est partagée en lecture seule via Stumpr.
          </p>
        </div>
      </main>
    </div>
  );
}

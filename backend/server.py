from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from passlib.context import CryptContext
from jose import JWTError, jwt
import io
import json
import anthropic
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import cm

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'stumpr-secret-key-change-in-production-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Airtable Configuration (from environment variables)
AIRTABLE_BASE_ID = os.environ.get('AIRTABLE_BASE_ID')
AIRTABLE_TABLE = os.environ.get('AIRTABLE_TABLE', 'Produits')
AIRTABLE_TOKEN = os.environ.get('AIRTABLE_TOKEN')

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ======================== MODELS ========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    prenom: str
    nom: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    prenom: str
    nom: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LPPRComponent(BaseModel):
    code: str
    nomenclature: str
    tarif: Optional[float] = None
    duree_ans: Optional[int] = None
    categorie: Optional[str] = None
    application: Optional[str] = None
    date_prescription: Optional[str] = None
    prise_en_charge_complementaire: Optional[str] = None
    montant_rembourse: Optional[float] = None
    etat_composant: Optional[str] = None
    notes: Optional[str] = None

class PatientCreate(BaseModel):
    # Section 1 - Identité
    prenom: str
    nom: str
    date_naissance: Optional[str] = None
    email: EmailStr
    telephone: Optional[str] = None
    niveau_activite: Optional[str] = None
    
    # Section 2 - Amputation
    niveau_amputation: str
    cote: Optional[str] = None
    date_amputation: Optional[str] = None
    cause: Optional[str] = None
    notes_moignon: Optional[str] = None
    
    # Section 3 - Composants prothétiques
    composants: Optional[List[LPPRComponent]] = []
    
    # Section 4 - Suivi médical
    ortho_referent: Optional[str] = None
    cabinet_centre: Optional[str] = None
    telephone_ortho: Optional[str] = None
    medecin_prescripteur: Optional[str] = None
    specialite_prescripteur: Optional[str] = None
    prochain_rdv: Optional[str] = None
    notes_medicales: Optional[str] = None
    
    # Section 5 - Activités
    activites: Optional[List[str]] = []

class ShareLinkResponse(BaseModel):
    share_id: str
    expires_at: str
    url: str

class LPPRSearchResult(BaseModel):
    code: str
    nomenclature: str
    tarif: Optional[float] = None
    duree_ans: Optional[float] = None
    categorie: Optional[str] = None
    application: Optional[str] = None

# ======================== PROTHESE MODELS ========================

# LPPR renewal delays per composant type (years) — default fallbacks
LPPR_DELAYS_PAR_TYPE: dict = {
    "emboiture": 3,
    "pied_prothetique": 5,
    "genou_prothetique": 5,
    "manchon_liner": 1,
    "attaches_suspension": 3,
    "cosmetique_pied": 5,
    "autre": 5,
}

def calculate_renewal_date(date_attribution: Optional[str], type_composant: str, duree_ans: Optional[int] = None) -> Optional[str]:
    if not date_attribution:
        return None
    try:
        d = datetime.fromisoformat(date_attribution.replace('Z', '+00:00')) if 'T' in date_attribution else datetime.strptime(date_attribution, '%Y-%m-%d')
        years = int(duree_ans) if duree_ans is not None else LPPR_DELAYS_PAR_TYPE.get(type_composant, 5)
        renewal = d.replace(year=d.year + years)
        return renewal.strftime('%Y-%m-%d')
    except Exception:
        return None

class ComposantCreate(BaseModel):
    type: str  # emboiture, pied_prothetique, genou_prothetique, manchon_liner, attaches_suspension, cosmetique_pied, autre
    marque: Optional[str] = None
    reference_lppr: Optional[str] = None
    nomenclature: Optional[str] = None
    tarif: Optional[float] = None
    duree_ans: Optional[float] = None
    date_attribution: Optional[str] = None
    notes: Optional[str] = None

class ComposantResponse(BaseModel):
    id: str
    type: str
    marque: Optional[str] = None
    reference_lppr: Optional[str] = None
    nomenclature: Optional[str] = None
    tarif: Optional[float] = None
    duree_ans: Optional[int] = None
    date_attribution: Optional[str] = None
    date_renouvellement_eligible: Optional[str] = None
    notes: Optional[str] = None

class ProtheseCreate(BaseModel):
    type: str  # principale, secours, bain, sport, autre
    date_attribution: Optional[str] = None
    notes: Optional[str] = None

class ProtheseUpdate(BaseModel):
    type: Optional[str] = None
    statut: Optional[str] = None  # active, inactive
    date_attribution: Optional[str] = None
    notes: Optional[str] = None

class ProtheseResponse(BaseModel):
    id: str
    type: str
    statut: str
    date_attribution: Optional[str] = None
    notes: Optional[str] = None
    composants: List[ComposantResponse] = []
    created_at: str

class PatientResponse(BaseModel):
    id: str
    user_id: str
    prenom: str
    nom: str
    date_naissance: Optional[str] = None
    email: str
    telephone: Optional[str] = None
    niveau_activite: Optional[str] = None
    niveau_amputation: str
    cote: Optional[str] = None
    date_amputation: Optional[str] = None
    cause: Optional[str] = None
    notes_moignon: Optional[str] = None
    composants: List[LPPRComponent] = []
    ortho_referent: Optional[str] = None
    cabinet_centre: Optional[str] = None
    telephone_ortho: Optional[str] = None
    medecin_prescripteur: Optional[str] = None
    specialite_prescripteur: Optional[str] = None
    prochain_rdv: Optional[str] = None
    notes_medicales: Optional[str] = None
    activites: List[str] = []
    protheses: List[ProtheseResponse] = []
    created_at: str
    updated_at: str

# ======================== JOURNAL MODELS ========================

class ComponentPain(BaseModel):
    nom: str
    score: int = Field(ge=0, le=10)

class JournalDouleurs(BaseModel):
    globale: int = Field(ge=0, le=10, default=0)
    prothese_id: Optional[str] = None
    fantome: int = Field(ge=0, le=10, default=0)
    composants: List[ComponentPain] = []  # kept for backward compat

class JournalBienEtre(BaseModel):
    fatigue: int = Field(ge=0, le=4, default=2)
    sommeil: int = Field(ge=0, le=4, default=2)
    humeur: int = Field(ge=0, le=4, default=2)

class JournalEntryCreate(BaseModel):
    patient_id: str
    douleurs: JournalDouleurs
    bien_etre: JournalBienEtre
    activites: List[str] = []
    notes: Optional[str] = None
    evenements: Optional[List[str]] = []

class JournalEntryResponse(BaseModel):
    id: str
    patient_id: str
    user_id: str
    created_at: str
    douleurs: JournalDouleurs
    bien_etre: JournalBienEtre
    activites: List[str] = []
    notes: Optional[str] = None
    has_alert: bool = False
    evenements: Optional[List[str]] = []

class JournalStatsResponse(BaseModel):
    avg_pain_composants: float
    avg_fantome: float
    avg_fatigue: float
    avg_sommeil: float
    avg_humeur: float
    active_days: int
    total_days: int
    alerts_count: int
    entries_by_day: List[dict]

# ======================== HELPERS ========================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token invalide")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return user

# ======================== AUTH ROUTES ========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Un compte existe déjà avec cet email")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password_hash": get_password_hash(user.password),
        "prenom": user.prenom,
        "nom": user.nom,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token(data={"sub": user_id})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user_id, email=user.email, prenom=user.prenom, nom=user.nom)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    access_token = create_access_token(data={"sub": user["id"]})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user["id"], email=user["email"], prenom=user["prenom"], nom=user["nom"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        prenom=current_user["prenom"],
        nom=current_user["nom"]
    )

# ======================== LPPR ROUTES ========================

@api_router.get("/lppr/search", response_model=List[LPPRSearchResult])
async def search_lppr(q: Optional[str] = Query(None, min_length=2), categorie: Optional[str] = Query(None)):
    if not q and not categorie:
        raise HTTPException(status_code=422, detail="Au moins q ou categorie est requis")
    try:
        url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE}"
        headers = {"Authorization": f"Bearer {AIRTABLE_TOKEN}"}

        filters = []
        if categorie:
            filters.append(f'LOWER({{Catégorie}})=LOWER("{categorie}")')
        if q:
            q_lower = q.lower()
            filters.append(f'OR(SEARCH("{q_lower}",LOWER({{Nomenclature}})),SEARCH("{q}",CONCATENATE({{Code}},"")),SEARCH("{q_lower}",LOWER({{Catégorie}})))')
        filter_formula = f'AND({",".join(filters)})' if len(filters) > 1 else filters[0]
        
        params = {
            "filterByFormula": filter_formula,
            "maxRecords": 20,
            "fields[]": ["Code", "Nomenclature", "Tarif TTC", "Durée de prise en charge", "Catégorie", "Application produit"]
        }
        
        async with httpx.AsyncClient() as client_http:
            response = await client_http.get(url, headers=headers, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
        
        results = []
        for record in data.get("records", []):
            fields = record.get("fields", {})
            results.append(LPPRSearchResult(
                code=str(fields.get("Code", "")),
                nomenclature=fields.get("Nomenclature", "").strip(),
                tarif=fields.get("Tarif TTC"),
                duree_ans=fields.get("Durée de prise en charge"),
                categorie=fields.get("Catégorie"),
                application=fields.get("Application produit")
            ))
        
        return results
    except httpx.HTTPError as e:
        logger.error(f"Airtable API error: {e}")
        raise HTTPException(status_code=502, detail="Erreur lors de la recherche dans le catalogue LPPR")

# ======================== PATIENT ROUTES ========================

@api_router.post("/patients", response_model=PatientResponse)
async def create_patient(patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    patient_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    patient_doc = {
        "id": patient_id,
        "user_id": current_user["id"],
        **patient.model_dump(),
        "protheses": [],
        "created_at": now,
        "updated_at": now
    }

    await db.patients.insert_one(patient_doc)
    del patient_doc["_id"]
    return PatientResponse(**patient_doc)

@api_router.get("/patients", response_model=List[PatientResponse])
async def get_patients(current_user: dict = Depends(get_current_user)):
    patients = await db.patients.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return [PatientResponse(**p) for p in patients]

@api_router.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": patient_id, "user_id": current_user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")
    return PatientResponse(**patient)

@api_router.put("/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: str, patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.patients.find_one({"id": patient_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")

    now = datetime.now(timezone.utc).isoformat()
    # Exclure les champs None pour ne pas écraser les données existantes
    # Ne jamais toucher aux champs protheses, user_id, id, created_at
    PROTECTED = {"protheses", "user_id", "id", "created_at"}
    update_data = {
        k: v for k, v in patient.model_dump().items()
        if k not in PROTECTED
    }
    update_data["updated_at"] = now

    await db.patients.update_one({"id": patient_id}, {"$set": update_data})
    
    updated = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return PatientResponse(**updated)

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.patients.delete_one({"id": patient_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")
    return {"message": "Fiche patient supprimée"}

# ======================== PROTHESE ROUTES ========================

@api_router.get("/patient/protheses", response_model=List[ProtheseResponse])
async def list_protheses(current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")
    return patient.get("protheses", [])

@api_router.post("/patient/protheses", response_model=ProtheseResponse)
async def create_prothese(prothese: ProtheseCreate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée — créez d'abord votre fiche")

    prothese_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    prothese_doc = {
        "id": prothese_id,
        "type": prothese.type,
        "statut": "active",
        "date_attribution": prothese.date_attribution,
        "notes": prothese.notes,
        "composants": [],
        "created_at": now,
    }

    await db.patients.update_one(
        {"user_id": current_user["id"]},
        {"$push": {"protheses": prothese_doc}, "$set": {"updated_at": now}}
    )
    return ProtheseResponse(**prothese_doc)

@api_router.put("/patient/protheses/{prothese_id}", response_model=ProtheseResponse)
async def update_prothese(prothese_id: str, update: ProtheseUpdate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")

    protheses = patient.get("protheses", [])
    prothese = next((p for p in protheses if p["id"] == prothese_id), None)
    if not prothese:
        raise HTTPException(status_code=404, detail="Prothèse non trouvée")

    update_fields = {f"protheses.$.{k}": v for k, v in update.model_dump(exclude_none=True).items()}
    now = datetime.now(timezone.utc).isoformat()
    update_fields["updated_at"] = now

    await db.patients.update_one(
        {"user_id": current_user["id"], "protheses.id": prothese_id},
        {"$set": update_fields}
    )

    # Return updated prothese
    updated_patient = await db.patients.find_one({"user_id": current_user["id"]}, {"_id": 0})
    updated_prothese = next((p for p in updated_patient.get("protheses", []) if p["id"] == prothese_id), prothese)
    return ProtheseResponse(**updated_prothese)

@api_router.post("/patient/protheses/{prothese_id}/composants", response_model=ComposantResponse)
async def add_composant(prothese_id: str, composant: ComposantCreate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")

    protheses = patient.get("protheses", [])
    prothese = next((p for p in protheses if p["id"] == prothese_id), None)
    if not prothese:
        raise HTTPException(status_code=404, detail="Prothèse non trouvée")

    composant_id = str(uuid.uuid4())
    renewal_date = calculate_renewal_date(composant.date_attribution, composant.type, composant.duree_ans)

    composant_doc = {
        "id": composant_id,
        **composant.model_dump(),
        "date_renouvellement_eligible": renewal_date,
    }

    now = datetime.now(timezone.utc).isoformat()
    await db.patients.update_one(
        {"user_id": current_user["id"], "protheses.id": prothese_id},
        {"$push": {"protheses.$.composants": composant_doc}, "$set": {"updated_at": now}}
    )
    return ComposantResponse(**composant_doc)

@api_router.delete("/patient/protheses/{prothese_id}/composants/{composant_id}", status_code=204)
async def delete_composant(prothese_id: str, composant_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")
    prothese = next((p for p in patient.get("protheses", []) if p["id"] == prothese_id), None)
    if not prothese:
        raise HTTPException(status_code=404, detail="Prothèse non trouvée")
    now = datetime.now(timezone.utc).isoformat()
    await db.patients.update_one(
        {"user_id": current_user["id"], "protheses.id": prothese_id},
        {"$pull": {"protheses.$.composants": {"id": composant_id}}, "$set": {"updated_at": now}}
    )

# ======================== SHARE ROUTES ========================

@api_router.post("/patients/{patient_id}/share", response_model=ShareLinkResponse)
async def create_share_link(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": patient_id, "user_id": current_user["id"]})
    if not patient:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")
    
    share_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    share_doc = {
        "share_id": share_id,
        "patient_id": patient_id,
        "user_id": current_user["id"],
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.shares.insert_one(share_doc)
    
    return ShareLinkResponse(
        share_id=share_id,
        expires_at=expires_at.isoformat(),
        url=f"/partage/{share_id}"
    )

@api_router.get("/shared/{share_id}", response_model=PatientResponse)
async def get_shared_patient(share_id: str):
    share = await db.shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(status_code=404, detail="Lien de partage non trouvé")
    
    expires_at = datetime.fromisoformat(share["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=410, detail="Ce lien de partage a expiré")
    
    patient = await db.patients.find_one({"id": share["patient_id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")
    
    return PatientResponse(**patient)

# ======================== PDF EXPORT ========================

@api_router.get("/patients/{patient_id}/pdf")
async def export_patient_pdf(patient_id: str, token: str = Query(None), current_user: dict = None):
    # Allow token via query param for direct browser download
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Token invalide")
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
            current_user = user
        except JWTError:
            raise HTTPException(status_code=401, detail="Token invalide")
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentification requise")
    
    patient = await db.patients.find_one({"id": patient_id, "user_id": current_user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='StumprTitle', fontName='Helvetica-Bold', fontSize=24, textColor=colors.HexColor('#1d7a72'), spaceAfter=20))
    styles.add(ParagraphStyle(name='SectionTitle', fontName='Helvetica-Bold', fontSize=14, textColor=colors.HexColor('#1a1f2e'), spaceBefore=15, spaceAfter=10))
    styles.add(ParagraphStyle(name='StumprBody', fontName='Helvetica', fontSize=10, textColor=colors.HexColor('#3d4a5c'), spaceAfter=5))
    styles.add(ParagraphStyle(name='FieldLabel', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#8892a4')))
    styles.add(ParagraphStyle(name='CompTitle', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#1d7a72'), spaceBefore=8, spaceAfter=4))
    styles.add(ParagraphStyle(name='RenewalOK', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#2d9e6b')))
    styles.add(ParagraphStyle(name='RenewalWarn', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#e08c2a')))
    styles.add(ParagraphStyle(name='RenewalDanger', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#d64545')))
    
    elements = []
    
    # Helper to format dates
    def format_date(date_str):
        if not date_str:
            return "Non renseignée"
        try:
            d = datetime.fromisoformat(date_str.replace('Z', '+00:00')) if 'T' in date_str else datetime.strptime(date_str, '%Y-%m-%d')
            return d.strftime("%d/%m/%Y")
        except:
            return date_str
    
    # Helper to calculate renewal date
    def get_renewal_info(prescription_date, duration_years):
        if not prescription_date or not duration_years:
            return None, None
        try:
            if 'T' in prescription_date:
                prescription = datetime.fromisoformat(prescription_date.replace('Z', '+00:00'))
            else:
                prescription = datetime.strptime(prescription_date, '%Y-%m-%d')
            renewal = prescription.replace(year=prescription.year + duration_years)
            now = datetime.now(timezone.utc) if prescription.tzinfo else datetime.now()
            diff_days = (renewal - now).days
            renewal_str = renewal.strftime("%d/%m/%Y")
            return renewal_str, diff_days
        except:
            return None, None
    
    # Title
    elements.append(Paragraph("Stumpr — Fiche Patient", styles['StumprTitle']))
    elements.append(Spacer(1, 10))
    
    # Section 1 - Identité
    elements.append(Paragraph("IDENTITÉ PATIENT", styles['SectionTitle']))
    identity_data = [
        ["Prénom:", patient.get("prenom", ""), "Nom:", patient.get("nom", "")],
        ["Email:", patient.get("email", ""), "Téléphone:", patient.get("telephone", "") or "Non renseigné"],
        ["Date de naissance:", format_date(patient.get("date_naissance")), "Niveau d'activité:", patient.get("niveau_activite", "") or "Non renseigné"]
    ]
    t = Table(identity_data, colWidths=[3*cm, 5*cm, 3*cm, 5*cm])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#8892a4')),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#8892a4')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1a1f2e')),
        ('TEXTCOLOR', (3, 0), (3, -1), colors.HexColor('#1a1f2e')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 10))
    
    # Section 2 - Amputation
    elements.append(Paragraph("AMPUTATION", styles['SectionTitle']))
    amp_data = [
        ["Niveau:", patient.get("niveau_amputation", ""), "Côté:", patient.get("cote", "") or "Non renseigné"],
        ["Date:", format_date(patient.get("date_amputation")), "Cause:", patient.get("cause", "") or "Non renseignée"]
    ]
    t2 = Table(amp_data, colWidths=[3*cm, 5*cm, 3*cm, 5*cm])
    t2.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#8892a4')),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#8892a4')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1a1f2e')),
        ('TEXTCOLOR', (3, 0), (3, -1), colors.HexColor('#1a1f2e')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t2)
    
    if patient.get("notes_moignon"):
        elements.append(Spacer(1, 5))
        elements.append(Paragraph(f"Notes sur le moignon: {patient['notes_moignon']}", styles['StumprBody']))
    elements.append(Spacer(1, 10))
    
    # Section 3 - Composants with full details
    composants = patient.get("composants", [])
    if composants:
        elements.append(Paragraph("COMPOSANTS PROTHÉTIQUES (LPPR)", styles['SectionTitle']))
        for i, comp in enumerate(composants, 1):
            elements.append(Paragraph(f"Composant {i}", styles['CompTitle']))
            
            # Code and nomenclature
            elements.append(Paragraph(f"<b>Code LPPR:</b> {comp.get('code', 'N/A')}", styles['StumprBody']))
            nomenclature = comp.get('nomenclature', 'N/A').replace('\n', ' ')
            elements.append(Paragraph(f"<b>Nomenclature:</b> {nomenclature}", styles['StumprBody']))
            
            # Tarif and duration
            tarif = comp.get('tarif')
            tarif_str = f"{tarif}€" if tarif else "N/A"
            duree = comp.get('duree_ans')
            duree_str = f"{duree} ans" if duree else "N/A"
            elements.append(Paragraph(f"<b>Tarif TTC:</b> {tarif_str} | <b>Durée prise en charge:</b> {duree_str}", styles['StumprBody']))
            
            # Category and application
            categorie = comp.get('categorie', 'N/A')
            application = comp.get('application', 'N/A')
            elements.append(Paragraph(f"<b>Catégorie:</b> {categorie} | <b>Application:</b> {application}", styles['StumprBody']))
            
            # Prescription date
            prescription_date = comp.get('date_prescription')
            elements.append(Paragraph(f"<b>Date de prescription:</b> {format_date(prescription_date)}", styles['StumprBody']))
            
            # Renewal date with color coding
            renewal_str, diff_days = get_renewal_info(prescription_date, duree)
            if renewal_str:
                if diff_days is not None:
                    if diff_days < 0:
                        elements.append(Paragraph(f"Date de renouvellement: {renewal_str} (DÉPASSÉE)", styles['RenewalDanger']))
                    elif diff_days < 30:
                        elements.append(Paragraph(f"Date de renouvellement: {renewal_str} (URGENT)", styles['RenewalDanger']))
                    elif diff_days < 180:
                        elements.append(Paragraph(f"Date de renouvellement: {renewal_str} (dans {diff_days // 30} mois)", styles['RenewalWarn']))
                    else:
                        elements.append(Paragraph(f"Date de renouvellement: {renewal_str}", styles['RenewalOK']))
            
            # Additional info
            prise_charge = comp.get('prise_en_charge_complementaire')
            if prise_charge:
                montant = comp.get('montant_rembourse')
                montant_str = f" ({montant}€)" if montant else ""
                elements.append(Paragraph(f"<b>Prise en charge:</b> {prise_charge}{montant_str}", styles['StumprBody']))
            
            etat = comp.get('etat_composant')
            if etat:
                elements.append(Paragraph(f"<b>État:</b> {etat}", styles['StumprBody']))
            
            notes = comp.get('notes')
            if notes:
                elements.append(Paragraph(f"<b>Notes:</b> {notes}", styles['StumprBody']))
            
            elements.append(Spacer(1, 8))
    
    # Section 4 - Suivi médical
    elements.append(Paragraph("SUIVI MÉDICAL", styles['SectionTitle']))
    med_data = [
        ["Orthoprothésiste:", patient.get("ortho_referent", "") or "Non renseigné"],
        ["Cabinet/Centre:", patient.get("cabinet_centre", "") or "Non renseigné"],
        ["Tél. ortho:", patient.get("telephone_ortho", "") or "Non renseigné"],
        ["Médecin prescripteur:", patient.get("medecin_prescripteur", "") or "Non renseigné"],
        ["Spécialité:", patient.get("specialite_prescripteur", "") or "Non renseignée"],
        ["Prochain RDV:", format_date(patient.get("prochain_rdv"))]
    ]
    t3 = Table(med_data, colWidths=[4*cm, 12*cm])
    t3.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#8892a4')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1a1f2e')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t3)
    
    if patient.get("notes_medicales"):
        elements.append(Spacer(1, 5))
        elements.append(Paragraph(f"Notes médicales: {patient['notes_medicales']}", styles['StumprBody']))
    elements.append(Spacer(1, 10))
    
    # Section 5 - Activités with labels
    activites = patient.get("activites", [])
    if activites:
        elements.append(Paragraph("ACTIVITÉS QUOTIDIENNES", styles['SectionTitle']))
        activity_labels = {
            "marche_courte": "Marche courte (< 1km)",
            "marche_longue": "Marche longue (> 1km)",
            "courses": "Courses / Supermarché",
            "conduite": "Conduite automobile",
            "velo": "Vélo",
            "natation": "Natation",
            "sport_collectif": "Sport collectif",
            "randonnee": "Randonnée",
            "travail_debout": "Travail debout",
            "travail_assis": "Travail assis",
            "competition": "Activité intense / compétition"
        }
        labels = [activity_labels.get(a, a) for a in activites]
        elements.append(Paragraph(" • ".join(labels), styles['StumprBody']))
    
    # Section 6 - Clinical timeline (last 30 days)
    EVENT_LABELS = {
        "manchon_change": "Changement manchon",
        "emboiture_changee": "Changement emboîture",
        "composant_change": "Nouveau composant",
        "reglage_prothese": "Réglage prothèse",
        "prothese_secours": "Prothèse secours",
        "prothese_non_portee": "Prothèse non portée",
        "irritation_cutanee": "Irritation cutanée",
        "plaie_escarre": "Plaie/escarre",
        "sudation_excessive": "Sudation excessive",
        "oedeme_moignon": "Œdème moignon",
        "douleur_neuropathique": "Douleur neuropathique",
        "point_dur_osseux": "Point osseux douloureux",
        "reaction_allergique": "Réaction allergique",
        "infection_suspectee": "Infection suspectée",
        "chute_incident": "Chute/incident",
        "activite_intense": "Activité intense",
        "variation_poids": "Variation poids",
        "consultation_medicale": "Consultation médicale",
        "changement_traitement": "Changement traitement",
        "chaleur_voyage": "Chaleur/voyage",
    }

    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    journal_entries = await db.journal_entries.find(
        {"patient_id": patient_id, "created_at": {"$gte": thirty_days_ago}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(None)

    elements.append(Spacer(1, 20))
    elements.append(Paragraph("SUIVI CLINIQUE — 30 DERNIERS JOURS", styles['SectionTitle']))
    elements.append(Paragraph(
        "Données de suivi quotidien — à l'attention de l'équipe médicale",
        ParagraphStyle('SubNote', parent=styles['StumprBody'], fontSize=9, textColor=HexColor('#8892a4'), fontName='Helvetica-Oblique')
    ))
    elements.append(Spacer(1, 8))

    if not journal_entries:
        elements.append(Paragraph("Aucune donnée de suivi enregistrée sur les 30 derniers jours.", styles['StumprBody']))
    else:
        table_data = [["Date", "Douleurs", "Événements signalés"]]
        for e in journal_entries:
            date_str = e.get("created_at", "")[:10]
            try:
                date_fmt = datetime.fromisoformat(date_str).strftime("%d/%m/%Y")
            except Exception:
                date_fmt = date_str
            d_obj = e.get("douleurs", {})
            globale = d_obj.get("globale", 0) or 0
            fantome = d_obj.get("fantome", 0) or 0
            max_pain = max(globale, fantome)
            if max_pain <= 2:
                pain_hex = '#2d9e6b'
            elif max_pain <= 5:
                pain_hex = '#c9a227'
            elif max_pain <= 7:
                pain_hex = '#e08c2a'
            else:
                pain_hex = '#d64545'
            pain_str = f"G: {globale}/10 · F: {fantome}/10"
            evts = e.get("evenements", []) or []
            evts_str = " · ".join(EVENT_LABELS.get(ev, ev) for ev in evts) if evts else "—"
            table_data.append([
                Paragraph(f"<font name='Helvetica-Bold' color='#8892a4' size='9'>{date_fmt}</font>", styles['StumprBody']),
                Paragraph(f"<font color='{pain_hex}' size='9'>{pain_str}</font>", styles['StumprBody']),
                Paragraph(f"<font size='9' color='#3d4a5c'>{evts_str}</font>", styles['StumprBody']),
            ])

        col_widths = [2.5 * cm, 5 * cm, 8.5 * cm]
        tbl = Table(table_data, colWidths=col_widths)
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f6fafe')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1a1f2e')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')]),
            ('LINEBELOW', (0, 0), (-1, -1), 0.25, colors.HexColor('#f0f0f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(tbl)

    note_style = ParagraphStyle(
        'TimelineNote',
        parent=styles['StumprBody'],
        fontSize=8,
        textColor=colors.HexColor('#8892a4'),
        fontName='Helvetica-Oblique',
    )
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        "G = Douleur globale · F = Douleur fantôme · Échelle 0-10<br/>"
        "Ces données sont déclaratives et saisies par le patient.<br/>"
        "Elles ne constituent pas un diagnostic médical.",
        note_style
    ))

    # Footer
    elements.append(Spacer(1, 30))
    gen_date = datetime.now(timezone.utc).strftime("%d/%m/%Y à %H:%M")
    elements.append(Paragraph(f"Document généré le {gen_date}", styles['StumprBody']))
    
    doc.build(elements)
    buffer.seek(0)
    
    # Sanitize filename
    nom = (patient.get('nom') or 'patient').lower().replace(' ', '-')
    filename = f"stumpr-fiche-{nom}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

# ======================== JOURNAL ROUTES ========================

@api_router.post("/journal", response_model=JournalEntryResponse)
async def create_journal_entry(entry: JournalEntryCreate, current_user: dict = Depends(get_current_user)):
    # Verify patient belongs to user
    patient = await db.patients.find_one({"id": entry.patient_id, "user_id": current_user["id"]})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")
    
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if any pain score >= 7 for alert
    has_alert = False
    if entry.douleurs.globale >= 7:
        has_alert = True
    for comp_pain in entry.douleurs.composants:
        if comp_pain.score >= 7:
            has_alert = True
            break
    if entry.douleurs.fantome >= 7:
        has_alert = True
    
    entry_doc = {
        "id": entry_id,
        "patient_id": entry.patient_id,
        "user_id": current_user["id"],
        "created_at": now,
        "douleurs": entry.douleurs.model_dump(),
        "bien_etre": entry.bien_etre.model_dump(),
        "activites": entry.activites,
        "notes": entry.notes,
        "evenements": entry.evenements or [],
        "has_alert": has_alert
    }
    
    await db.journal_entries.insert_one(entry_doc)
    del entry_doc["_id"]
    
    return JournalEntryResponse(**entry_doc)

@api_router.get("/journal", response_model=List[JournalEntryResponse])
async def get_journal_entries(
    days: int = Query(default=7, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    # Calculate date range
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    entries = await db.journal_entries.find({
        "user_id": current_user["id"],
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return [JournalEntryResponse(**e) for e in entries]

@api_router.get("/journal/stats", response_model=JournalStatsResponse)
async def get_journal_stats(
    days: int = Query(default=7, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    entries = await db.journal_entries.find({
        "user_id": current_user["id"],
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).sort("created_at", 1).to_list(500)
    
    if not entries:
        return JournalStatsResponse(
            avg_pain_composants=0,
            avg_fantome=0,
            avg_fatigue=2,
            avg_sommeil=2,
            avg_humeur=2,
            active_days=0,
            total_days=days,
            alerts_count=0,
            entries_by_day=[]
        )
    
    # Calculate averages
    total_pain_composants = []
    total_fantome = []
    total_fatigue = []
    total_sommeil = []
    total_humeur = []
    alerts_count = 0
    active_days_set = set()
    entries_by_day = []
    
    for entry in entries:
        douleurs = entry.get("douleurs", {})
        # Pain: prefer globale if set, fallback to avg of composants
        globale = douleurs.get("globale", 0) or 0
        comp_list = douleurs.get("composants", [])
        if globale > 0 or not comp_list:
            pain_value = globale
        else:
            pain_value = sum(c.get("score", 0) for c in comp_list) / max(len(comp_list), 1)
        total_pain_composants.append(pain_value)
        total_fantome.append(douleurs.get("fantome", 0))
        
        # Well-being
        bien_etre = entry.get("bien_etre", {})
        total_fatigue.append(bien_etre.get("fatigue", 2))
        total_sommeil.append(bien_etre.get("sommeil", 2))
        total_humeur.append(bien_etre.get("humeur", 2))
        
        # Alerts
        if entry.get("has_alert", False):
            alerts_count += 1
        
        # Active days (days with activities)
        if entry.get("activites", []):
            created = entry.get("created_at", "")[:10]
            active_days_set.add(created)
        
        # Format for chart
        created_dt = datetime.fromisoformat(entry["created_at"].replace('Z', '+00:00'))
        date_str = created_dt.strftime("%d/%m")
        
        entries_by_day.append({
            "date": date_str,
            "pain_composants": round(pain_value, 1),
            "fantome": douleurs.get("fantome", 0),
            "fatigue": bien_etre.get("fatigue", 2),
            "sommeil": bien_etre.get("sommeil", 2),
            "humeur": bien_etre.get("humeur", 2),
            "activites_count": len(entry.get("activites", []))
        })
    
    return JournalStatsResponse(
        avg_pain_composants=round(sum(total_pain_composants) / max(len(total_pain_composants), 1), 1),
        avg_fantome=round(sum(total_fantome) / max(len(total_fantome), 1), 1),
        avg_fatigue=round(sum(total_fatigue) / max(len(total_fatigue), 1), 1),
        avg_sommeil=round(sum(total_sommeil) / max(len(total_sommeil), 1), 1),
        avg_humeur=round(sum(total_humeur) / max(len(total_humeur), 1), 1),
        active_days=len(active_days_set),
        total_days=days,
        alerts_count=alerts_count,
        entries_by_day=entries_by_day
    )

@api_router.get("/journal/today")
async def get_today_entry(current_user: dict = Depends(get_current_user)):
    """Check if user has already made an entry today"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    entry = await db.journal_entries.find_one({
        "user_id": current_user["id"],
        "created_at": {"$gte": today_start.isoformat()}
    }, {"_id": 0})
    
    if entry:
        return {"has_entry_today": True, "entry": JournalEntryResponse(**entry)}
    return {"has_entry_today": False, "entry": None}

# ======================== RAPPORT MODELS ========================

class RapportRequest(BaseModel):
    periode: int = Field(default=30, description="30, 90 ou 180 jours")
    prothese_id: Optional[str] = None

class RapportResponse(BaseModel):
    id: str
    patient_id: str
    periode: int
    prothese_id: Optional[str] = None
    generated_at: str
    titre: str
    resume_executif: str
    evolution_douleur: str
    evenements_notables: str
    composants_proches_renouvellement: List[dict] = []
    conclusion: str

# ======================== RAPPORT ROUTES ========================

RAPPORT_SYSTEM_PROMPT = """Tu es un assistant médical qui rédige des synthèses pour des médecins MPR français. Ton rôle est de résumer objectivement les données de suivi d'un patient amputé. Langage médical clair, jamais de diagnostic, jamais de recommandation thérapeutique. Tu constates, tu décris, tu quantifies.

Réponds UNIQUEMENT avec un objet JSON valide (aucun texte avant ou après), respectant exactement ce format :
{
  "titre": "Rapport de suivi – [Période] – [Prénom Nom]",
  "resume_executif": "Synthèse en 2-3 phrases des éléments cliniques marquants de la période.",
  "evolution_douleur": "Description quantifiée de l'évolution des douleurs (globale et fantôme) avec moyennes, tendances et pics observés.",
  "evenements_notables": "Description des événements notables : alertes douleur, variations importantes, activités inhabituelles, plaintes récurrentes.",
  "conclusion": "Synthèse conclusive sobre en 2-3 phrases."
}"""

def _build_rapport_prompt(patient: dict, entries: list, protheses: list, periode: int, prothese_id: Optional[str]) -> str:
    """Build the user prompt from patient data and journal entries."""
    prenom = patient.get("prenom", "")
    nom = patient.get("nom", "")
    niveau_amp = patient.get("niveau_amputation", "Non renseigné")
    cote = patient.get("cote", "")

    # Filter protheses
    if prothese_id:
        active_protheses = [p for p in protheses if p.get("id") == prothese_id]
    else:
        active_protheses = [p for p in protheses if p.get("statut") == "active"]

    # Protheses summary
    protheses_lines = []
    for p in active_protheses:
        type_label = p.get("type", "inconnue").capitalize()
        composants = p.get("composants", [])
        comps_str = ", ".join([
            f"{c.get('type','')} {c.get('marque','') or ''} [renouvellement: {c.get('date_renouvellement_eligible','N/A')}]"
            for c in composants
        ]) or "aucun composant renseigné"
        protheses_lines.append(f"  - Prothèse {type_label}: {comps_str}")

    # Composants approaching renewal (within 6 months)
    now = datetime.now(timezone.utc)
    approaching = []
    for p in active_protheses:
        for c in p.get("composants", []):
            renewal = c.get("date_renouvellement_eligible")
            if renewal:
                try:
                    rd = datetime.strptime(renewal, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    diff_days = (rd - now).days
                    if diff_days <= 180:
                        approaching.append({
                            "composant": c.get("type", ""),
                            "marque": c.get("marque", ""),
                            "date_renouvellement": renewal,
                            "jours_restants": diff_days,
                            "prothese_type": p.get("type", "")
                        })
                except Exception:
                    pass

    # Stats from entries
    n = len(entries)
    if n == 0:
        stats_block = "Aucune entrée de journal sur la période."
    else:
        globale_scores = [e.get("douleurs", {}).get("globale", 0) for e in entries]
        fantome_scores = [e.get("douleurs", {}).get("fantome", 0) for e in entries]
        fatigue_scores = [e.get("bien_etre", {}).get("fatigue", 2) for e in entries]
        sommeil_scores = [e.get("bien_etre", {}).get("sommeil", 2) for e in entries]
        humeur_scores  = [e.get("bien_etre", {}).get("humeur", 2) for e in entries]
        alerts = sum(1 for e in entries if e.get("has_alert", False))

        activity_counts: dict = {}
        for e in entries:
            for a in e.get("activites", []):
                activity_counts[a] = activity_counts.get(a, 0) + 1
        top_activities = sorted(activity_counts.items(), key=lambda x: -x[1])[:5]
        act_str = ", ".join(f"{k}({v}j)" for k, v in top_activities) or "aucune"

        stats_block = f"""Statistiques sur {n} entrées ({periode} jours analysés) :
- Douleur globale : moyenne {round(sum(globale_scores)/n, 1)}/10, min {min(globale_scores)}, max {max(globale_scores)}
- Douleur fantôme : moyenne {round(sum(fantome_scores)/n, 1)}/10, min {min(fantome_scores)}, max {max(fantome_scores)}
- Alertes douleur (≥7) : {alerts} sur {n} entrées
- Fatigue moyenne : {round(sum(fatigue_scores)/n, 1)}/4
- Sommeil moyen : {round(sum(sommeil_scores)/n, 1)}/4
- Humeur moyenne : {round(sum(humeur_scores)/n, 1)}/4
- Activités les plus pratiquées : {act_str}"""

    # Chronological detail (last 10 entries max)
    detail_lines = []
    for e in sorted(entries, key=lambda x: x.get("created_at", ""))[-10:]:
        date_str = e.get("created_at", "")[:10]
        g = e.get("douleurs", {}).get("globale", 0)
        f = e.get("douleurs", {}).get("fantome", 0)
        acts = e.get("activites", [])
        notes = e.get("notes") or ""
        detail_lines.append(
            f"  {date_str} : douleur {g}/10, fantôme {f}/10"
            + (f", activités: {','.join(acts)}" if acts else "")
            + (f", note: «{notes[:80]}»" if notes else "")
        )

    protheses_block = "\n".join(protheses_lines) if protheses_lines else "  Aucune prothèse active renseignée"

    prompt = f"""Génère un rapport médical de suivi pour le patient suivant.

PATIENT : {prenom} {nom}
Niveau d'amputation : {niveau_amp} {cote}
Période analysée : {periode} derniers jours

PROTHÈSES ACTIVES :
{protheses_block}

{stats_block}

DÉTAIL CHRONOLOGIQUE (10 dernières entrées) :
{chr(10).join(detail_lines) if detail_lines else "  Aucune entrée"}

COMPOSANTS DONT LE RENOUVELLEMENT APPROCHE (<6 mois) :
{json.dumps(approaching, ensure_ascii=False, indent=2) if approaching else "  Aucun"}

Rédige le rapport JSON demandé."""

    return prompt, approaching


@api_router.post("/patient/rapport", response_model=RapportResponse)
async def generate_rapport(request: RapportRequest, current_user: dict = Depends(get_current_user)):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans les variables d'environnement.")

    if request.periode not in [30, 90, 180]:
        raise HTTPException(status_code=400, detail="Période doit être 30, 90 ou 180 jours")

    # Load patient
    patient = await db.patients.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")

    # Load protheses
    protheses = patient.get("protheses", [])

    # Load journal entries for the period
    start_date = datetime.now(timezone.utc) - timedelta(days=request.periode)
    entries = await db.journal_entries.find({
        "user_id": current_user["id"],
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).sort("created_at", 1).to_list(500)

    # Build prompt
    prompt_text, approaching = _build_rapport_prompt(patient, entries, protheses, request.periode, request.prothese_id)

    # Call Anthropic
    try:
        anthropic_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        message = await anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=RAPPORT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt_text}]
        )
        raw = message.content[0].text.strip()
        # Extract JSON if wrapped in code block
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        rapport_data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Claude JSON parse error: {e}\nRaw: {raw[:500]}")
        raise HTTPException(status_code=502, detail="Erreur lors de l'analyse de la réponse IA")
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        raise HTTPException(status_code=502, detail=f"Erreur API Anthropic : {str(e)}")

    # Store rapport
    rapport_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    rapport_doc = {
        "id": rapport_id,
        "user_id": current_user["id"],
        "patient_id": patient["id"],
        "periode": request.periode,
        "prothese_id": request.prothese_id,
        "generated_at": now,
        "titre": rapport_data.get("titre", f"Rapport {request.periode}j"),
        "resume_executif": rapport_data.get("resume_executif", ""),
        "evolution_douleur": rapport_data.get("evolution_douleur", ""),
        "evenements_notables": rapport_data.get("evenements_notables", ""),
        "composants_proches_renouvellement": approaching,
        "conclusion": rapport_data.get("conclusion", ""),
    }
    await db.rapports.insert_one(rapport_doc)
    del rapport_doc["_id"]
    return RapportResponse(**rapport_doc)


@api_router.get("/patient/rapport/{rapport_id}/pdf")
async def export_rapport_pdf(rapport_id: str, token: str = Query(None), current_user: dict = None):
    # Allow token via query param for direct browser download
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Token invalide")
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
            current_user = user
        except JWTError:
            raise HTTPException(status_code=401, detail="Token invalide")

    if not current_user:
        raise HTTPException(status_code=401, detail="Authentification requise")

    rapport = await db.rapports.find_one({"id": rapport_id, "user_id": current_user["id"]}, {"_id": 0})
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")

    # Get patient info for header
    patient = await db.patients.find_one({"id": rapport["patient_id"]}, {"_id": 0})
    patient_name = f"{patient.get('prenom','')} {patient.get('nom','')}".strip() if patient else "Patient"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                             rightMargin=2*cm, leftMargin=2*cm,
                             topMargin=2*cm, bottomMargin=2.5*cm)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='RapportTitle',  fontName='Helvetica-Bold', fontSize=22, textColor=colors.HexColor('#0e6b63'), spaceAfter=6))
    styles.add(ParagraphStyle(name='RapportMeta',   fontName='Helvetica',      fontSize=10, textColor=colors.HexColor('#8892a4'), spaceAfter=20))
    styles.add(ParagraphStyle(name='SectionHead',   fontName='Helvetica-Bold', fontSize=13, textColor=colors.HexColor('#1a1f2e'), spaceBefore=18, spaceAfter=6, borderPad=4))
    styles.add(ParagraphStyle(name='BodyText',      fontName='Helvetica',      fontSize=10, textColor=colors.HexColor('#3d4a5c'), spaceAfter=8, leading=15))
    styles.add(ParagraphStyle(name='RenewalItem',   fontName='Helvetica',      fontSize=9,  textColor=colors.HexColor('#e08c2a'), spaceAfter=4))
    styles.add(ParagraphStyle(name='Disclaimer',    fontName='Helvetica-Oblique', fontSize=8, textColor=colors.HexColor('#8892a4'), spaceBefore=20))

    elements = []

    # ── Header ──────────────────────────────────────────────────────
    elements.append(Paragraph("Stumpr.", styles['RapportTitle']))

    gen_date = datetime.fromisoformat(rapport["generated_at"].replace('Z', '+00:00')).strftime("%d/%m/%Y à %H:%M")
    periode = rapport.get("periode", 30)
    start_date_str = (datetime.now(timezone.utc) - timedelta(days=periode)).strftime("%d/%m/%Y")
    elements.append(Paragraph(
        f"Patient : {patient_name}  ·  Période : {periode} jours ({start_date_str} – aujourd'hui)  ·  Généré le {gen_date}",
        styles['RapportMeta']
    ))

    # Divider
    elements.append(Table([['']], colWidths=[17*cm]))
    elements[-1].setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor('#0e6b63')),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ]))

    # ── Titre rapport ────────────────────────────────────────────────
    elements.append(Paragraph(rapport.get("titre", "Rapport de suivi"), styles['SectionHead']))
    elements.append(Spacer(1, 4))

    # ── Sections ─────────────────────────────────────────────────────
    sections = [
        ("📋  Résumé exécutif",          rapport.get("resume_executif", "")),
        ("📈  Évolution de la douleur",   rapport.get("evolution_douleur", "")),
        ("⚠️   Événements notables",       rapport.get("evenements_notables", "")),
        ("✅  Conclusion",                rapport.get("conclusion", "")),
    ]
    for heading, body in sections:
        elements.append(Paragraph(heading, styles['SectionHead']))
        elements.append(Paragraph(body or "—", styles['BodyText']))

    # ── Composants proches du renouvellement ─────────────────────────
    approaching = rapport.get("composants_proches_renouvellement", [])
    if approaching:
        elements.append(Paragraph("🔧  Composants proches du renouvellement", styles['SectionHead']))
        for c in approaching:
            jours = c.get("jours_restants", 0)
            label = "DÉPASSÉ" if jours < 0 else f"dans {jours} jours"
            marque = f" – {c['marque']}" if c.get("marque") else ""
            elements.append(Paragraph(
                f"• {c.get('composant','').capitalize()}{marque} (prothèse {c.get('prothese_type','')}) — "
                f"renouvellement le {c.get('date_renouvellement','')} ({label})",
                styles['RenewalItem']
            ))

    # ── Disclaimer ───────────────────────────────────────────────────
    elements.append(Spacer(1, 20))
    elements.append(Table([['']], colWidths=[17*cm]))
    elements[-1].setStyle(TableStyle([
        ('LINEABOVE', (0,0), (-1,-1), 0.5, colors.HexColor('#e0d9cf')),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(Paragraph(
        "Ce rapport est une synthèse automatique des données déclaratives du patient. "
        "Il ne constitue pas un avis médical, un diagnostic ou une recommandation thérapeutique. "
        "Stumpr – DIGICORPEX",
        styles['Disclaimer']
    ))

    doc.build(elements)
    buffer.seek(0)
    nom_safe = (patient.get('nom', 'patient') if patient else 'patient').lower().replace(' ', '-')
    filename = f"stumpr-rapport-{nom_safe}-{periode}j.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@api_router.post("/patient/rapport/{rapport_id}/share")
async def share_rapport(rapport_id: str, current_user: dict = Depends(get_current_user)):
    rapport = await db.rapports.find_one({"id": rapport_id, "user_id": current_user["id"]})
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")

    share_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    share_doc = {
        "share_id": share_id,
        "type": "rapport",
        "rapport_id": rapport_id,
        "user_id": current_user["id"],
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.shares.insert_one(share_doc)
    return {"share_id": share_id, "expires_at": expires_at.isoformat(), "url": f"/rapport/partage/{share_id}"}


@api_router.get("/shared/rapport/{share_id}", response_model=RapportResponse)
async def get_shared_rapport(share_id: str):
    share = await db.shares.find_one({"share_id": share_id, "type": "rapport"}, {"_id": 0})
    if not share:
        raise HTTPException(status_code=404, detail="Lien de partage non trouvé")
    expires_at = datetime.fromisoformat(share["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=410, detail="Ce lien de partage a expiré")
    rapport = await db.rapports.find_one({"id": share["rapport_id"]}, {"_id": 0})
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    return RapportResponse(**rapport)

# ======================== ANNUAIRE MODELS ========================

class Avis(BaseModel):
    auteur: str
    note: int = Field(ge=1, le=5)
    commentaire: Optional[str] = None

class EtablissementCreate(BaseModel):
    nom: str
    type: str  # "CRF" ou "Prothesiste"
    ville: str
    departement: str
    telephone: Optional[str] = None
    site_web: Optional[str] = None
    adresse: Optional[str] = None
    notes_communautaires: Optional[str] = None

class EtablissementResponse(BaseModel):
    id: str
    nom: str
    type: str
    ville: str
    departement: str
    telephone: Optional[str] = None
    site_web: Optional[str] = None
    adresse: Optional[str] = None
    notes_communautaires: Optional[str] = None
    note_moyenne: float
    nombre_avis: int
    avis: List[dict] = []
    created_at: str

# ======================== ANNUAIRE ROUTES ========================

@api_router.get("/annuaire", response_model=List[EtablissementResponse])
async def list_annuaire(
    ville: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if ville:
        query["ville"] = {"$regex": ville, "$options": "i"}
    if type:
        query["type"] = type

    cursor = db.annuaire.find(query, {"_id": 0}).sort("note_moyenne", -1)
    etablissements = await cursor.to_list(100)
    return [EtablissementResponse(**e) for e in etablissements]

@api_router.post("/annuaire", response_model=EtablissementResponse)
async def create_etablissement(
    data: EtablissementCreate,
    current_user: dict = Depends(get_current_user)
):
    if data.type not in ["CRF", "Prothesiste"]:
        raise HTTPException(status_code=400, detail="Type doit être 'CRF' ou 'Prothesiste'")

    etablissement_id = str(uuid.uuid4())
    doc = {
        "id": etablissement_id,
        **data.dict(),
        "note_moyenne": 0.0,
        "nombre_avis": 0,
        "avis": [],
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.annuaire.insert_one(doc)
    doc.pop("_id", None)
    return EtablissementResponse(**doc)

@api_router.post("/annuaire/{etablissement_id}/avis")
async def add_avis(
    etablissement_id: str,
    avis: Avis,
    current_user: dict = Depends(get_current_user)
):
    etablissement = await db.annuaire.find_one({"id": etablissement_id})
    if not etablissement:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")

    avis_doc = {
        "auteur": avis.auteur,
        "note": avis.note,
        "commentaire": avis.commentaire,
        "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    existing_avis = etablissement.get("avis", [])
    existing_avis.append(avis_doc)
    note_moyenne = sum(a["note"] for a in existing_avis) / len(existing_avis)

    await db.annuaire.update_one(
        {"id": etablissement_id},
        {"$set": {
            "avis": existing_avis,
            "nombre_avis": len(existing_avis),
            "note_moyenne": round(note_moyenne, 1)
        }}
    )
    return {"message": "Avis ajouté", "note_moyenne": round(note_moyenne, 1)}

# ======================== HEALTH CHECK ========================

@api_router.get("/")
async def root():
    return {"message": "Stumpr API - Bienvenue"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

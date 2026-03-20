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
    created_at: str
    updated_at: str

class ShareLinkResponse(BaseModel):
    share_id: str
    expires_at: str
    url: str

class LPPRSearchResult(BaseModel):
    code: str
    nomenclature: str
    tarif: Optional[float] = None
    duree_ans: Optional[int] = None
    categorie: Optional[str] = None
    application: Optional[str] = None

# ======================== JOURNAL MODELS ========================

class ComponentPain(BaseModel):
    nom: str
    score: int = Field(ge=0, le=10)

class JournalDouleurs(BaseModel):
    composants: List[ComponentPain] = []
    fantome: int = Field(ge=0, le=10, default=0)

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
async def search_lppr(q: str = Query(..., min_length=2)):
    try:
        url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE}"
        headers = {"Authorization": f"Bearer {AIRTABLE_TOKEN}"}
        
        # Build filter formula - search in Nomenclature (text) and Code (converted to string)
        q_lower = q.lower()
        filter_formula = f'OR(SEARCH("{q_lower}",LOWER({{Nomenclature}})),SEARCH("{q}",CONCATENATE({{Code}},"")))'
        
        params = {
            "filterByFormula": filter_formula,
            "maxRecords": 8,
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
    update_data = {
        **patient.model_dump(),
        "updated_at": now
    }
    
    await db.patients.update_one({"id": patient_id}, {"$set": update_data})
    
    updated = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return PatientResponse(**updated)

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.patients.delete_one({"id": patient_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fiche patient non trouvée")
    return {"message": "Fiche patient supprimée"}

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
        # Pain from components
        douleurs = entry.get("douleurs", {})
        for comp in douleurs.get("composants", []):
            total_pain_composants.append(comp.get("score", 0))
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
        
        avg_comp_pain = sum([c.get("score", 0) for c in douleurs.get("composants", [])]) / max(len(douleurs.get("composants", [])), 1)
        
        entries_by_day.append({
            "date": date_str,
            "pain_composants": round(avg_comp_pain, 1),
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

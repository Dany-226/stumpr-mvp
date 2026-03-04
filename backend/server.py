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

# Airtable Configuration
AIRTABLE_BASE_ID = "appf0OPmCirvux6GG"
AIRTABLE_TABLE = "Produits"
AIRTABLE_TOKEN = "patKXdedwuD653ttv.c786a3360fe46438c033835fcf0d6eee08c01375bb53afb9ea1412137500078f"

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
async def export_patient_pdf(patient_id: str, current_user: dict = Depends(get_current_user)):
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
    
    elements = []
    
    # Title
    elements.append(Paragraph("Stumpr — Fiche Patient", styles['StumprTitle']))
    elements.append(Spacer(1, 10))
    
    # Section 1 - Identité
    elements.append(Paragraph("IDENTITÉ PATIENT", styles['SectionTitle']))
    identity_data = [
        ["Prénom:", patient.get("prenom", ""), "Nom:", patient.get("nom", "")],
        ["Email:", patient.get("email", ""), "Téléphone:", patient.get("telephone", "") or "Non renseigné"],
        ["Date de naissance:", patient.get("date_naissance", "") or "Non renseignée", "Niveau d'activité:", patient.get("niveau_activite", "") or "Non renseigné"]
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
        ["Date:", patient.get("date_amputation", "") or "Non renseignée", "Cause:", patient.get("cause", "") or "Non renseignée"]
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
    
    # Section 3 - Composants
    composants = patient.get("composants", [])
    if composants:
        elements.append(Paragraph("COMPOSANTS PROTHÉTIQUES", styles['SectionTitle']))
        for i, comp in enumerate(composants, 1):
            elements.append(Paragraph(f"Composant {i}: {comp.get('nomenclature', 'N/A')}", styles['StumprBody']))
            elements.append(Paragraph(f"   Code LPPR: {comp.get('code', 'N/A')} | Tarif: {comp.get('tarif', 'N/A')}€ | Durée: {comp.get('duree_ans', 'N/A')} ans", styles['StumprBody']))
            if comp.get('date_prescription'):
                elements.append(Paragraph(f"   Prescrit le: {comp['date_prescription']}", styles['StumprBody']))
        elements.append(Spacer(1, 10))
    
    # Section 4 - Suivi médical
    elements.append(Paragraph("SUIVI MÉDICAL", styles['SectionTitle']))
    med_data = [
        ["Orthoprothésiste:", patient.get("ortho_referent", "") or "Non renseigné"],
        ["Cabinet/Centre:", patient.get("cabinet_centre", "") or "Non renseigné"],
        ["Médecin prescripteur:", patient.get("medecin_prescripteur", "") or "Non renseigné"],
        ["Prochain RDV:", patient.get("prochain_rdv", "") or "Non programmé"]
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
    elements.append(Spacer(1, 10))
    
    # Section 5 - Activités
    activites = patient.get("activites", [])
    if activites:
        elements.append(Paragraph("ACTIVITÉS QUOTIDIENNES", styles['SectionTitle']))
        elements.append(Paragraph(", ".join(activites), styles['StumprBody']))
    
    # Footer
    elements.append(Spacer(1, 30))
    gen_date = datetime.now(timezone.utc).strftime("%d/%m/%Y à %H:%M")
    elements.append(Paragraph(f"Document généré le {gen_date}", styles['StumprBody']))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"fiche_patient_{patient['prenom']}_{patient['nom']}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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

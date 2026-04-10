# CLAUDE.md — Stumpr MVP

Fichier de contexte pour Claude Code et Claude.ai. À lire en entier avant toute intervention sur ce projet.

---

## Projet

**Stumpr** est une application mobile/web française d'aide à la navigation dans les droits de remboursement prothétiques pour les patients amputés.

Problème central : 77% des patients amputés ne connaissent pas leurs droits de renouvellement LPPR. Stumpr leur permet de comprendre ce à quoi ils ont droit, quand, et comment l'obtenir.

Landing page live : `stumpr.app` (collecte emails via Brevo — contact@stumpr.app → contact@ampower.fr)
Repo : `Dany-226/stumpr-mvp`

---

## Stack technique

```
Frontend   : React (PWA)
Backend    : FastAPI (Python)
Base       : MongoDB Atlas (cluster "Stumpr", eu-central, Frankfurt)
Référentiel: Airtable (appf0OPmCirvux6GG) — source de vérité LPPR
Emails     : Brevo
```

L'architecture est intentionnellement légère pour un MVP solo. Ne pas sur-ingéniérer.

### Infrastructure

- **Backend déployé** : https://stumpr-backend.onrender.com (Render, free tier)
- **Base de données** : MongoDB Atlas, cluster "Stumpr" (cloud, pas localhost — depuis le 09/04/2026)
- **DNS** : Cloudflare (stumpr.app)

---

## Déploiement production

| Composant | URL | Hébergeur |
|---|---|---|
| Frontend | https://stumpr-mvp.onrender.com | Render (Static Site) |
| Backend | https://stumpr-backend.onrender.com | Render (Web Service) |
| Landing page | https://stumpr.app | Cloudflare Workers (old-credit-8991) |

- **CORS_ORIGINS** (backend Render) : `https://stumpr-mvp.onrender.com`
- **REACT_APP_BACKEND_URL** (frontend Render) : `https://stumpr-backend.onrender.com` — fallback hardcodé dans chaque page si variable absente
- **Routing SPA** : règle Rewrite `/* → /index.html` configurée dans Render Static Site + fichier `frontend/public/_redirects`
- **Cold start** : UptimeRobot ping toutes les 5 min sur `/docs` pour maintenir le backend actif
- **Email** : contact@stumpr.app redirige vers contact@ampower.fr (Cloudflare)

### Collections Atlas (base `stumpr`)

| Collection | Contenu |
|---|---|
| `users` | Comptes utilisateurs |
| `patients` | Fiches patients avec prothèses et composants |
| `journal_entries` | Entrées journal douleurs |
| `shares` | Liens de partage temporaires |
| `orthos` | 295 cabinets UFOP (données brutes) |
| `annuaire` | 295 cabinets UFOP (avec type, note_moyenne, avis — source pour /api/annuaire) |
| `beta_testers` | `{email, is_beta, status (invited/registered), created_at, registered_at}` |

---

## Routes admin

Toutes protégées par le header `X-Admin-Secret` vérifié contre la variable d'env `ADMIN_SECRET`.

```
GET /api/admin/beta-testers  → liste des bêta testeurs + stats invited/registered
GET /api/admin/users         → tous les comptes (sans password_hash)
GET /api/admin/patients      → toutes les fiches patients
```

> Dashboard admin : `stumpr-admin.html` (fichier local — ne pas déployer, ne pas committer)

---

## Bêta test en cours

- **65 bêta testeurs** invités par email le 09/04/2026
- **6 inscrits** au 10/04/2026 : rodolphe.peltier, jean.bechu, pollux266, bernard.leopold, vincent.labeque, zaiconcept
- **4 fiches patients** créées dont 2 avec composants renseignés
- **Whitelist active** : inscription bloquée si email absent de la collection `beta_testers` (HTTP 403)
- **Dashboard admin** : `stumpr-admin.html` (fichier local — pointe sur https://stumpr-backend.onrender.com)
- **exports/** : exclu du repo (`.gitignore`) — données sensibles locales uniquement
- **Emails jetables à bloquer** à l'ouverture publique (ex: `izkat.com`, `hidingmail.com`)

---

## Architecture des données LPPR — point critique

La **LPPR (Liste des Produits et Prestations Remboursables)** est le référentiel réglementaire français des dispositifs médicaux remboursables. Le Chapitre 7 couvre l'orthoprothétique.

### Source de vérité

**L'Airtable est la source de vérité irremplaçable**, notamment pour le champ `Durée de prise en charge` (durée de renouvellement). Cette donnée n'existe dans **aucune source officielle structurée** (ni CNAMTS, ni data.gouv.fr, ni Open LPP) — elle vit uniquement dans les textes réglementaires en langage libre et dans l'expertise de Daniel.

La base contient **578 références Chapitre 7**, avec les champs clés :
- `Code` — identifiant unique LPPR (clé de matching pour toute mise à jour programmatique)
- `Nomenclature` — libellé officiel
- `Catégorie` — champ de classification métier (Manchon, Pied Classe I-III, MPK, Genou monoaxial…)
- `Durée de prise en charge` — durée de renouvellement en années (partiellement renseigné)
- `Application produit`
- `Tarif`

### Règles impératives pour toute modification Airtable via code

1. **Toujours matcher sur le champ `Code`** — c'est l'unique clé fiable
2. **Mettre à jour uniquement le champ ciblé** — ne jamais écraser l'ensemble d'un enregistrement
3. **Afficher les modifications avant de les appliquer** — dry-run obligatoire sur tout script d'import
4. Ne jamais importer un CSV complet dans la table existante — risque d'écrasement de données

---

## Conventions de code

### Python / FastAPI
- Python 3.11+
- Nommage snake_case
- Typage avec `pydantic` pour tous les modèles de données
- Routes FastAPI préfixées par version : `/api/v1/...`
- Pas de logique métier dans les routes — déléguer aux services

### React
- Composants fonctionnels uniquement (hooks)
- Pas de classes React
- CSS modules ou Tailwind (cohérence avec l'existant — vérifier avant d'introduire une nouvelle approche)
- PWA : ne pas casser le service worker existant sans raison

### MongoDB
- Collections en snake_case pluriel (`lppr_products`, `patients`)
- Toujours utiliser des index sur les champs de recherche fréquents (`code`, `categorie`)
- Pas de schéma rigide côté Mongo — la validation est côté Pydantic

### Général
- Commits en français, conventionnels : `feat:`, `fix:`, `chore:`, `docs:`
- Ne pas committer de clés API, tokens Airtable, ou credentials Brevo
- `.env` pour toutes les variables d'environnement sensibles

---

## Features MVP — état

| Feature | État |
|---|---|
| Fiche patient multi-prothèses | Codée |
| Autocomplete LPPR depuis Airtable | Codée |
| Journal douleurs | Codé |
| Annuaire CRF / orthos | Codé |
| Fiches droits de renouvellement | Codée |
| Rapport médical IA (Anthropic API) | Partiellement codé — bloqué sur clé API |
| Base LPPR souveraine MongoDB | Non lancé |

---

## Contexte métier à ne pas réinventer

- **LPPR** = Liste des Produits et Prestations Remboursables. Référentiel légal, pas une base open data propre.
- **Durée de prise en charge (DPC)** = durée minimale entre deux remboursements. Varie par famille de produit et niveau fonctionnel (CIF). Ce n'est pas une donnée disponible dans les APIs publiques.
- **Emboîtures, composants, réparations** : pas de DPC fixe — logique clinique uniquement. Ne pas essayer de leur assigner une durée.
- **CIF (Classification Internationale du Fonctionnement)** : d4600, d4601, d4602, d4608 — détermine le niveau fonctionnel du patient et donc la classe de prothèse remboursable.
- La prescription médicale et l'entente préalable CPAM sont obligatoires pour tout renouvellement.

---

## Erreurs à ne pas reproduire

Ces erreurs ont déjà été commises en session — les éviter absolument :

1. **Inventer des éléments UI dans Airtable** qui n'existent pas (ex : options de navigation fictives)
2. **Suggérer un import CSV complet** dans la table Airtable existante — le risque d'écrasement est réel et inacceptable
3. **Supposer qu'une source officielle contient les durées de PC** — elles n'y sont pas, point final
4. **Se contredire entre sessions** sur l'architecture de données (ex : suggérer MongoDB comme source LPPR alors que l'Airtable est acté comme source de vérité)
5. **Supposer que MONGO_URL pointe sur localhost** — c'est Atlas en production et pour le dev depuis le 09/04/2026
6. **Oublier d'ajouter ADMIN_SECRET dans Render** avant de déployer une route admin

---

## Lancement local

```bash
# MongoDB (prérequis)
brew services start mongodb/brew/mongodb-community

# Backend (depuis ~/Desktop/stumpr-mvp/backend)
/Users/danielrollin/Library/Python/3.9/bin/uvicorn server:app --reload --port 8001

# Frontend (depuis ~/Desktop/stumpr-mvp/frontend)
yarn start
```

Port backend : **8001**
Port frontend : **3000** (défaut CRA/yarn)

> Si port 8001 déjà occupé : `lsof -ti :8001 | xargs kill -9`

---

## Variables d'environnement (`backend/.env`)

```env
MONGO_URL=mongodb+srv://rollindaniel_db_user:***@stumpr.echioe4.mongodb.net/?appName=Stumpr
DB_NAME=stumpr
JWT_SECRET=[secret actuel]
ANTHROPIC_API_KEY=
AIRTABLE_TOKEN=[token actif]
AIRTABLE_BASE_ID=appf0OPmCirvux6GG
ADMIN_SECRET=stumpr-admin-2026
```

> ⚠️ Ne jamais écrire le vrai mot de passe Atlas dans ce fichier — utiliser `***` à la place.
> `ADMIN_SECRET` doit également être configuré dans les variables d'environnement Render avant tout déploiement d'une route admin.

---

## Workflow de travail

Prompt dans **Claude.ai chat** → exécution via **Claude Code** (terminal).
Claude Code lit ce fichier automatiquement à chaque session depuis la racine du repo.

---

## Interlocuteur

Daniel — fondateur solo, profil business/stratégie avec capacité technique suffisante pour piloter le développement. Pas développeur de formation. Préférer des explications orientées décision plutôt que pédagogie technique de base.

Langue de travail : **français**.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

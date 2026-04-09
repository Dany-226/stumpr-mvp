# Stumpr MVP — Suivi de développement

Dernière mise à jour : 09 avril 2026

---

## Objectif

Test utilisateur avec 18 amputés inscrits en liste d'attente.
Délai : 2-4 semaines.

---

## Planning

| Semaine | Chantier | Statut |
|---|---|---|
| S1 | Onboarding stepper + flux prothèses | ✅ Terminé |
| S2 | Déploiement prod + migration données | ✅ Terminé (09/04/2026) |
| S3 | Design mobile-first + bottom bar | 🔲 À faire |
| S4 | Buffer tests + envoi beta | 🔲 À faire |

---

## Semaine 1 — Terminé le 31/03/2026

### Ce qui a été fait

- **OnboardingPage.js** créé — stepper 3 étapes (Profil → Prothèse → Composants)
- **LPPRSearch.js** extrait en composant réutilisable (`frontend/src/components/`)
- **constants/patient.js** créé — constantes partagées (PROTHESE_TYPES, COMPOSANT_TYPES, etc.)
- **App.js** — route `/onboarding` ajoutée
- **LoginPage.js / RegisterPage.js** — redirection post-auth vers `/onboarding` ou `/fiche-patient/:id` selon existence fiche
- **Recherche LPPR** fonctionnelle via Airtable API
- **Bug corrigé** — `duree_ans` float→int (Airtable retourne 0.5, Pydantic attendait int)
- **Bug corrigé** — ordre des modèles Pydantic dans server.py (PatientResponse après ProtheseResponse)
- **Ajout composants** fonctionnel avec badge renouvellement affiché

### Ce qui reste imparfait (à traiter S3)

- Dropdown recherche LPPR : affichage inline, pas idéal visuellement
- Design incohérent entre FichePatientPage et DashboardPage
- Navigation mobile absente

---

## Configuration technique

### Commandes de lancement

```bash
# MongoDB
brew services start mongodb/brew/mongodb-community

# Backend
cd ~/Desktop/stumpr-mvp/backend
/Users/danielrollin/Library/Python/3.9/bin/uvicorn server:app --reload --port 8001

# Frontend
cd ~/Desktop/stumpr-mvp/frontend
yarn start
```

### Variables d'environnement (`backend/.env`)

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=stumpr
JWT_SECRET=stumpr-dev-secret-2024
ANTHROPIC_API_KEY=
AIRTABLE_TOKEN=[token actif]
AIRTABLE_BASE_ID=appf0OPmCirvux6GG
```

### Points d'attention

- `AIRTABLE_TOKEN` (pas `AIRTABLE_API_KEY`) — le backend utilise ce nom de variable
- Uvicorn ne recharge pas le `.env` automatiquement — toujours redémarrer après modification
- Port 8001 parfois occupé : `lsof -ti :8001 | xargs kill -9`

---

---

## Sprint déploiement — Terminé le 09/04/2026

### Ce qui a été fait

- **Déploiement prod** : frontend sur Render (stumpr-mvp.onrender.com), backend sur Render (stumpr-backend.onrender.com)
- **MongoDB Atlas** : cluster "Stumpr" provisionné (eu-central, Frankfurt), base `stumpr`
- **Migration UFOP** : 295 cabinets orthos migrés vers Atlas (collections `orthos` + `annuaire`)
- **UptimeRobot** : ping toutes les 5 min sur `/docs` pour éviter le cold start Render
- **Routing SPA** : règle Rewrite `/* → /index.html` + fichier `_redirects` dans `frontend/public/`
- **Bug corrigé** : calcul renouvellement manchon — `Math.round()` supprimé dans FichePatientPage et OnboardingPage, `duree_ans` désormais `float` partout (0.5 ans → 6 mois au lieu de 12)
- **Bug corrigé** : dropdown département ortho
- **Bug corrigé** : fallback URL backend (`REACT_APP_BACKEND_URL` avec fallback hardcodé)
- **Beta** : 57 emails collectés, envoi prévu lundi 13/04/2026

---

## Backlog S2 — Orthos

### Claim profile ortho

Permettre aux prothésistes de revendiquer et enrichir leur fiche dans l'annuaire.

**Fonctionnalités prévues :**
- Bouton "C'est mon cabinet" sur chaque fiche annuaire
- Email de vérification envoyé via Brevo
- Espace ortho authentifié : enrichissement fiche (photo, spécialités, certifications, collaborateurs)

**Règle de déclenchement :** ne construire qu'après 3 demandes orthos confirmées (éviter de sur-ingéniérer trop tôt).

**En attendant :** gestion manuelle — création fiche Atlas + accès accordé à la main.

---

## Semaine 3 (ex-S2) — À planifier

Objectif : refonte journal/douleurs
- Saisie rapide (en moins de 2 minutes)
- Cohérence des IDs activités (`marche_courte` vs `marche-courte` — bug actuel)
- Slider douleur plus intuitif

---

## Semaine 4 (ex-S3) — À planifier

Objectif : design unifié mobile-first + navigation
- Unifier le système de classes CSS (stumpr-card, stumpr-btn-primary)
- Bottom bar navigation (5 icônes : Fiche, Journal, Droits, Tableau, Annuaire)
- Référence visuelle : Image 1 des maquettes partagées (fond crème, cartes arrondies)

---

## Bugs connus non résolus

| Bug | Priorité | Notes |
|---|---|---|
| Incohérence IDs activités (underscore vs tiret) | Haute | Données journal incorrectes |
| Design incohérent entre pages | Moyenne | S3 |
| Navigation mobile absente | Moyenne | S3 |
| `ANTHROPIC_API_KEY` vide | Basse | Feature V2, pas bloquant |

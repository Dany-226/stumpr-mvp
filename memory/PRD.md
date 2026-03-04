# Stumpr - PRD (Product Requirements Document)

## Informations générales
- **Nom du produit**: Stumpr
- **Description**: Application web pour patients amputés en France
- **Date de création**: 04/03/2026
- **Version**: 1.0.0

## Problem Statement Original
Construire une application web appelée "Stumpr" destinée aux patients amputés en France avec:
- Formulaire patient multi-sections
- Intégration API Airtable pour catalogue LPPR
- Export PDF
- Partage avec orthoprothésiste

## Architecture Technique

### Stack
- **Frontend**: React 19 + Tailwind CSS
- **Backend**: Python FastAPI
- **Base de données**: MongoDB
- **API externe**: Airtable (catalogue LPPR)
- **Authentification**: JWT

### Structure des fichiers clés
```
/app/backend/server.py - API FastAPI complète
/app/frontend/src/pages/LoginPage.js - Connexion
/app/frontend/src/pages/RegisterPage.js - Inscription
/app/frontend/src/pages/FichePatientPage.js - Formulaire patient
/app/frontend/src/pages/SharedViewPage.js - Vue partagée ortho
```

## Personas Utilisateurs

### Patient amputé
- Gère sa fiche médicale personnelle
- Suit ses composants prothétiques et dates de renouvellement
- Partage sa fiche avec son orthoprothésiste

### Orthoprothésiste
- Consulte les fiches patients partagées (lecture seule)
- Accède via lien unique valide 30 jours

## Fonctionnalités Implémentées ✅

### Authentification (04/03/2026)
- [x] Inscription (email/mot de passe)
- [x] Connexion JWT
- [x] Déconnexion

### Fiche Patient - Section 1: Identité
- [x] Prénom, Nom (obligatoires)
- [x] Date de naissance
- [x] Email (obligatoire)
- [x] Téléphone
- [x] Niveau d'activité (select)

### Fiche Patient - Section 2: Amputation
- [x] Niveau d'amputation (obligatoire, 10 options)
- [x] Côté (Gauche/Droit/Bilatéral)
- [x] Date d'amputation
- [x] Cause (6 options)
- [x] Notes sur le moignon

### Fiche Patient - Section 3: Composants LPPR
- [x] Recherche autocomplete Airtable (min 2 caractères)
- [x] Max 8 résultats affichés
- [x] Auto-remplissage: Code, Nomenclature, Tarif, Durée, Catégorie, Application
- [x] Champs manuels: Date prescription, Prise en charge, Montant remboursé, État
- [x] Calcul automatique date renouvellement avec badges colorés
- [x] Maximum 6 composants par patient
- [x] Suppression de composants

### Fiche Patient - Section 4: Suivi médical
- [x] Orthoprothésiste référent
- [x] Cabinet/Centre
- [x] Téléphone ortho
- [x] Médecin prescripteur
- [x] Spécialité prescripteur
- [x] Prochain rendez-vous
- [x] Notes médicales

### Fiche Patient - Section 5: Activités quotidiennes
- [x] 11 activités avec icônes
- [x] Toggle buttons visuels
- [x] État actif/inactif

### Fonctionnalités globales
- [x] Sauvegarde en base MongoDB
- [x] Export PDF (reportlab)
- [x] Partage ortho (lien 30 jours)
- [x] Toast notifications (sonner)

## Backlog (P0/P1/P2)

### P0 - Critique
- Aucun item en attente

### P1 - Important
- [ ] Notifications email rappel renouvellement
- [ ] Multi-patients par utilisateur
- [ ] Historique des modifications

### P2 - Souhaitable
- [ ] Mode sombre
- [ ] Dashboard statistiques
- [ ] Import/Export données
- [ ] Application mobile (PWA)

## Prochaines étapes suggérées
1. Ajouter un système de rappels par email pour les dates de renouvellement
2. Permettre la gestion de plusieurs fiches patients (famille)
3. Créer un dashboard avec vue calendrier des rendez-vous

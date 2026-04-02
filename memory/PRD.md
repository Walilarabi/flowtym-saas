# Flowtym PMS - Product Requirements Document

## Overview
Flowtym is a comprehensive Hotel Property Management System (PMS) SaaS platform designed for modern hotel operations. The system provides tools for reservations, revenue management, distribution, and guest experience management in a unified platform.

## Core Problem Statement
Hotels need an integrated solution for managing all aspects of their operations including:
- Property management and room inventory
- Booking and reservation management
- Channel distribution (OTAs integration)
- Housekeeping and maintenance operations
- Guest communication and experience
- Revenue optimization and reporting

## User Personas

### Super Admin
- Manages multiple hotels/properties
- Access to all system features
- User and role management
- System configuration

### Hotel Admin/Reception
- Daily operations management
- Check-in/check-out processes
- Reservation handling
- Guest communication

### Housekeeping Staff
- Room cleaning assignments
- Status updates and reporting
- Mobile-first workflow
- QR code scanning for room identification

### Direction/Management
- Dashboard analytics
- KPI monitoring
- Staff supervision
- Strategic oversight

---

## Completed Features

### Phase 1: Foundation (Completed)
- [x] User authentication (JWT-based)
- [x] Multi-hotel support
- [x] Role-based access control
- [x] Basic hotel configuration
- [x] Room management

### Phase 2: PMS Core (Completed)
- [x] Reservation management
- [x] Guest profiles
- [x] Check-in/check-out workflow
- [x] Planning board (Gantt-style)
- [x] Flowboard view

### Phase 3: Booking Engine (Completed)
- [x] Public booking widget
- [x] Room availability display
- [x] Rate management
- [x] Online payment integration ready
- [x] Booking confirmation emails

### Phase 4: Configuration Module (Completed)
- [x] Hotel settings management
- [x] Room type configuration
- [x] Rate plans
- [x] Tax settings
- [x] Channel mapping
- [x] Integration with PMS and Booking Engine

### Phase 5: Housekeeping Module V2 (Completed - March 25, 2026)
Based on Rorck React Native design with 100% visual fidelity.

#### 5.1 Reception View (Desktop)
- [x] Interactive room table with 16 columns
- [x] Checkbox selection for bulk operations
- [x] Bulk assignment button (appears when rooms selected)
- [x] Staff selection dialog
- [x] KPIs strip (Chambres, Départs, Recouches, En cours, Terminées, À valider, PDJ inclus, ETA urgents)
- [x] Advanced filters (Étage, Statut, Badge, Assignée, Source)
- [x] Color-coded room numbers
- [x] Status badges (Propre, Sale, Inspectée, En nettoyage, Libre, Occupée, H.S.)
- [x] Source icons (Booking, Direct, Expedia, Airbnb, Agoda, HRS, Tel)
- [x] VIP badges

#### 5.2 Direction View (Desktop)
- [x] Welcome message with current date
- [x] Quick navigation strip (Centre de contrôle, Plan Chambres, Répartition, Historique, Maintenance, Statistiques, Rapports)
- [x] KPI cards (Occupation %, Départs, Propreté %, Maintenance count)
- [x] Alerts card (Interventions urgentes, Chambres à valider, Petit-déj à préparer)
- [x] Room status summary with colored dots
- [x] Floor plan with room chips by floor
- [x] Team card with workload progress bars
- [x] Breakfast & Economat stats

#### 5.3 Gouvernante View (Desktop)
- [x] 3 tabs: Validation, Équipe, Stocks
- [x] Validation tab:
  - Search and filters (Étage, Statut)
  - KPIs (À valider, Validées, Refusées)
  - Inspection cards with Valider/Refuser buttons
- [x] Équipe tab:
  - Team supervision cards with workload bars
  - Assigned rooms per staff member
  - Quick action buttons (Réassigner, Valider chambres, Assigner, Historique)
  - KPIs sidebar
- [x] Stocks tab:
  - Link to full Économat
  - Low stock alerts
  - Inventory list with progress bars

#### 5.4 Mobile Housekeeping View (Femme de chambre)
- [x] Purple gradient header with welcome message
- [x] Room count summary card with progress bar
- [x] Stats: Terminées, Départs, Recouches, En cours
- [x] **QR Scanner button** with modal:
  - Room number input field
  - Filtered room list
  - Démarrer/Terminer actions
- [x] Swipe hint for actions
- [x] Room cards grouped by floor:
  - Status bar indicator
  - Room number and type
  - Priority/VIP badges
  - Démarrer/Terminer buttons
  - Live timer for in-progress rooms

#### 5.5 Mobile Maintenance View
- [x] Dark gradient header
- [x] Search bar
- [x] Stats: En attente, En cours, Résolu
- [x] Status filter dropdown
- [x] Ticket cards:
  - Room number
  - Issue title
  - Reporter and timestamp
  - Assigned technician
  - Priority badge (Haute, Moyenne, Basse)
  - Commencer/Résoudre buttons

#### 5.6 Mobile Breakfast View (Petit-déjeuner)
- [x] Orange gradient header
- [x] Stats: À préparer, En cours, Servis
- [x] 3 tabs: Cuisine, Livraison, Servis
- [x] Order cards:
  - Room number
  - Guest name
  - Formula and person count
  - Beverages
  - Allergy warnings
  - Notes
  - Payant badge (if not included)
  - Status update buttons (Préparé, En livraison, Servi)
- [x] Floating action buttons (Settings, Stats, Add)

---

## Backend API Endpoints (Housekeeping)

### Stats & Overview
- `GET /api/housekeeping/hotels/{hotel_id}/stats` - Dashboard statistics
- `GET /api/housekeeping/hotels/{hotel_id}/activity` - Activity feed

### Tasks Management
- `GET /api/housekeeping/hotels/{hotel_id}/tasks` - List all tasks
- `POST /api/housekeeping/hotels/{hotel_id}/tasks/{task_id}/start` - Start cleaning
- `POST /api/housekeeping/hotels/{hotel_id}/tasks/{task_id}/complete` - Complete cleaning

### Staff Management
- `GET /api/housekeeping/hotels/{hotel_id}/staff` - List staff members
- `POST /api/housekeeping/hotels/{hotel_id}/assignments/auto` - Auto-assign tasks

### Inspections
- `GET /api/housekeeping/hotels/{hotel_id}/inspections` - List inspections
- `POST /api/housekeeping/hotels/{hotel_id}/inspections/{id}/validate` - Validate/Refuse

### Maintenance
- `GET /api/housekeeping/hotels/{hotel_id}/maintenance` - List tickets
- `PUT /api/housekeeping/hotels/{hotel_id}/maintenance/{id}` - Update ticket status

### Breakfast
- `GET /api/housekeeping/hotels/{hotel_id}/breakfast` - List orders
- `PUT /api/housekeeping/hotels/{hotel_id}/breakfast/{id}` - Update order status

### Inventory
- `GET /api/housekeeping/hotels/{hotel_id}/inventory` - List stock items

### Demo Data
- `POST /api/housekeeping/hotels/{hotel_id}/seed` - Generate demo data

---

## Technical Architecture

### Frontend
- React 18 with Vite
- Tailwind CSS
- Shadcn/UI components
- Axios for API calls
- Sonner for toasts
- Lucide React icons

### Backend
- Python FastAPI
- MongoDB with Motor async driver
- JWT authentication
- Pydantic models

### Component Structure
```
/app/frontend/src/
├── components/
│   ├── housekeeping/
│   │   ├── DirectionView.jsx
│   │   ├── GouvernanteView.jsx
│   │   ├── InteractiveReceptionView.jsx
│   │   ├── MobileHousekeepingView.jsx
│   │   ├── MobileMaintenanceView.jsx
│   │   └── MobileBreakfastView.jsx
│   └── ui/
├── pages/
│   └── housekeeping/
│       └── HousekeepingModule.jsx
└── context/
    └── HotelContext.jsx
```

---

### Phase 6: UI Refonte - Kleon Figma Design System (Completed - March 26, 2026)
Complete visual redesign of the entire application with premium "Kleon Figma" design system.

#### 6.1 Design System Implementation
- [x] Primary color: Violet #6C5CE7
- [x] Background: #F8F9FC (light gray)
- [x] Border radius: 12px / 16px
- [x] Soft shadows: var(--shadow-card), var(--shadow-hover)
- [x] Typography: Inter font family
- [x] Micro-interactions: 150-200ms transitions
- [x] Glass-morphism effects on modals

#### 6.2 Command Palette (CTRL+K)
- [x] Global search modal
- [x] Quick actions (Nouvelle réservation, Check-in, Check-out)
- [x] Navigation shortcuts (Planning, Flowboard)
- [x] Keyboard navigation (↑↓ Enter ESC)
- [x] Backdrop blur effect

#### 6.3 CSS Architecture
- [x] CSS variables in flowtym-premium-v2.css
- [x] Global overrides for automatic design application
- [x] Tailwind integration preserved
- [x] No structural changes to existing code

#### 6.4 Modules Redesigned
- [x] Login page
- [x] PMS Planning with colored KPI bars
- [x] Channel Manager grid
- [x] CRM dashboard and client list
- [x] E-Reputation with charts and scores
- [x] Housekeeping all views
- [x] RMS Hoptym with AI recommendations
- [x] Configuration with sidebar

---

### Phase 7: Flowboard & Integrations Hub (Completed - March 26, 2026)
Central dashboard and external system integrations.

#### 7.1 Flowboard - Central Dashboard
- [x] 6 consolidated KPIs (Occupation, ADR, RevPAR, CA Jour, Arrivées, Départs)
- [x] Trend indicators (vs yesterday)
- [x] Timeline du jour (arrivals/departures events)
- [x] Contextual alerts (high occupancy, unpaid departures, housekeeping)
- [x] AI Suggestions with revenue impact estimates
- [x] Quick Actions (Nouvelle réservation, Check-in, Check-out, Housekeeping, Rapports)
- [x] Housekeeping widget with progress bar
- [x] Channel Mix widget (direct vs OTA distribution)
- [x] E-Reputation widget (global score + platforms)
- [x] Personnaliser mode for drag & drop widgets
- [x] Auto-refresh every 60 seconds

#### 7.2 Integrations Hub - External Connections
- [x] PMS Providers catalog: Mews (Certifié), Medialog (Certifié), Webhook Générique, API REST
- [x] Channel Managers catalog: D-Edge (Certifié)
- [x] Configuration dialog for credentials (API keys, tokens)
- [x] Connection testing functionality
- [x] Sync direction (inbound/outbound/bidirectional)
- [x] Sync interval configuration (5/15/30/60 min)
- [x] Status tracking (Active, Pending, Error, Syncing)
- [x] Sync logs and error tracking

#### 7.3 Inter-Module Connections (Backend Ready)
- [x] PMS ↔ Channel Manager sync endpoints
- [x] PMS ↔ CRM client data sync
- [x] PMS ↔ Housekeeping room status sync
- [x] RMS → Channel Manager dynamic pricing sync

#### 7.4 Files Created
- `/app/backend/flowboard/routes.py` - Flowboard API
- `/app/backend/flowboard/models.py` - Pydantic models
- `/app/backend/integrations/routes.py` - Integrations API
- `/app/backend/integrations/models.py` - Integration models
- `/app/frontend/src/pages/flowboard/Flowboard.jsx` - Dashboard UI
- `/app/frontend/src/pages/integrations/IntegrationsHub.jsx` - Integrations UI

---

### Phase 8: Staff Pointage - Time Tracking (Completed - March 26, 2026)
Onglet "Pointage" dans le module STAFF avec système QR code et validation des heures supplémentaires.

#### 8.1 Desktop Pointage View (/staff/pointage)
- [x] 6 KPI strip (Effectif, Pointés, Conformes, Retards, Heures sup, H.Sup validées)
- [x] Pointage table with 11 columns (Collaborateur, Service, Prévu, Entrée, Sortie, Durée, Écart, H.Sup, Statut, Source)
- [x] Status badges (Conforme ✅, Retard 🟡, Dépassement 🟠, En cours 🔵, Anomalie 🔴)
- [x] Source badges (QR, Manuel, Admin)
- [x] Filters (Date picker, Search, Department, Status)
- [x] QR Code dialog with generated hotel QR
- [x] Manual pointage dialog with form validation (motif obligatoire)
- [x] Overtime validation button (Direction/RH only) with rate selection (25%/50%)
- [x] Late tolerance: 10 minutes

#### 8.2 QR Code System
- [x] Static QR code per hotel
- [x] URL format: /pointage/mobile?hotel_id=xxx&token=xxx
- [x] Print and Copy URL functionality

#### 8.3 Mobile Pointage Page (/pointage/mobile)
- [x] Authentication required (redirects to login)
- [x] Employee status display
- [x] Large check-in/check-out buttons
- [x] Current time display
- [x] Planning info (if available)
- [x] Gradient design with rounded card

#### 8.4 Backend APIs
- [x] GET /api/staff/pointage/hotels/{hotel_id}/stats
- [x] GET /api/staff/pointage/hotels/{hotel_id}/qr-code
- [x] GET /api/staff/pointage/hotels/{hotel_id}/pointages
- [x] POST /api/staff/pointage/hotels/{hotel_id}/manual
- [x] POST /api/staff/pointage/hotels/{hotel_id}/check-in
- [x] POST /api/staff/pointage/hotels/{hotel_id}/check-out/employee/{employee_id}
- [x] PATCH /api/staff/pointage/hotels/{hotel_id}/pointages/{pointage_id}/validate-overtime
- [x] GET /api/staff/pointage/hotels/{hotel_id}/config
- [x] GET /api/staff/pointage/hotels/{hotel_id}/employee/{employee_id}/status

#### 8.5 Files Created
- `/app/backend/staff/pointage_routes.py` - Pointage API (1078 lines)
- `/app/backend/staff/pointage_models.py` - Pydantic models
- `/app/frontend/src/pages/staff/StaffPointage.jsx` - Desktop UI (710 lines)
- `/app/frontend/src/pages/pointage/MobilePointage.jsx` - Mobile QR UI
- `/app/backend/tests/test_staff_pointage.py` - Tests unitaires

---

## Upcoming Tasks (Backlog)

### P0 - High Priority
- [ ] Excel Import: Implement real parsing logic in `/app/backend/config/services/excel_import.py`

### P1 - Medium Priority
- [ ] Real Mews API integration (with real credentials)
- [ ] Real Medialog API integration
- [ ] Real D-Edge API integration
- [ ] Webhook delivery system for external notifications
- [ ] CRM Integration: Connect customer management to ConfigService
- [ ] Channel Manager: Connect OTA sync to ConfigService
- [ ] Real-time webhooks for booking events
- [ ] STAFF → Paie: Export heures travaillées/sup/absences

### P2 - Future
- [ ] Data Hub Phase 2 (Priority Engine, Event Orchestration, Smart Caching)
- [ ] OAuth2 security implementation
- [ ] Mobile app (React Native)
- [ ] Multi-language support

---

### Phase 11: Staff Configuration, Recrutement & Planning Enhancements (Completed - March 27, 2026)
Correction de bugs et ajout de fonctionnalités dans les modules Staff.

#### 11.1 Module Staff Configuration
- [x] Section "Services & Postes": Bouton "+ Ajouter" ouvre modale complète (Nom, Description, Type, Couleur, Postes dynamiques)
- [x] Section "Contrats (Modèles)": Bouton "+ Nouveau modèle" ouvre modale de création avec variables dynamiques
- [x] Section "Contrats (Modèles)": Icône crayon (Edit) ouvre modale d'édition avec données pré-remplies
- [x] Variables dynamiques cliquables: {{NOM_EMPLOYE}}, {{PRENOM_EMPLOYE}}, {{DATE_DEBUT}}, etc.

#### 11.2 Module Recrutement
- [x] Plateformes de diffusion réintégrées: LinkedIn, Indeed, France Travail, Hosco
- [x] Boutons de publication rapide par plateforme
- [x] Modale "Multi-plateforme" pour publication simultanée
- [x] Statut de publication par plateforme (Publié / Non publié)

#### 11.3 Module Planning
- [x] Bouton "Ajouter Extra" - Modale complète (Prénom, Nom, Email, Téléphone, Poste, Taux horaire, Date, Horaires)
- [x] Bouton "Edition masse" - Sélection collaborateur + types d'horaires visuels + calendrier multi-dates
- [x] Gestion du pointage: Validé (✅) si pointage effectué, Absent (❌) sinon
- [x] Bouton "Exporter" - Génère CSV avec données planning
- [x] Bouton "Imprimer" - Ouvre fenêtre impression formatée

---

### Phase 10: Login Page Final Redesign (Completed - March 27, 2026)
Reproduction exacte du mockup fourni pour la page de connexion.

#### 10.1 Login Page Design
- [x] Background gradient: violet foncé (#1a0a3a) → rose (#d4a5e8) → doré (#f0c5a0)
- [x] Hotel image: Bâtiment classique européen avec lampadaires (Jablonowski Palace)
- [x] Logo FLOWTYM badge: fond violet semi-transparent, FLOW blanc, TYM gradient rose
- [x] Tagline: "Le système d'exploitation des hôtels modernes"
- [x] Formulaire blanc avec coins arrondis (22px)
- [x] Titre: "Bienvenue sur Flowtym" (Flowtym en violet #7c3aed)
- [x] Inputs avec bordure #E5E7EB et focus violet
- [x] Bouton gradient violet (#8B5CF6 → #C4B5FD)
- [x] Features avec check violet
- [x] Footer: "Flowtym - Tous droits réservés 2026"
- [x] Responsive design (mobile et desktop)

#### 10.2 Button Style Global Fix
- [x] Background: #A855F7 (violet)
- [x] Text color: #FFFFFF (blanc)
- [x] Border-radius: 12px
- [x] Box-shadow: 0 4px 14px rgba(168, 85, 247, 0.35)
- [x] Hover: #9333EA avec translateY(-1px)

---

## Testing Status

### Last Test Report: iteration_30.json (March 27, 2026)
- **Module Tested**: Staff Configuration & Planning - Buttons and Modals
- **Success Rate**: 100% (7/7 tests passed)
- **Features Tested**: 
  - Services & Postes: "+ Ajouter" modal with full form
  - Contrats: "+ Nouveau modele" and Edit (pencil icon) modals
  - Planning: Extra modal, Edition masse (bulk edit), Exporter (CSV), Imprimer
- **Issues Found**: None
- **Retest Needed**: No

### Test Credentials
- Admin: `admin@flowtym.com` / `admin123`
- Super Admin: `superadmin@flowtym.com` / `super123`

---

## Known Mocks

- **Excel Parser**: Import logic returns mock success (real implementation pending)
- **External Integrations**: Mews, Medialog, D-Edge connection tests return mock success (no real API credentials)

---

## Key Files Reference

### Staff Pointage (Time Tracking)
- `/app/backend/staff/pointage_routes.py` - Pointage API endpoints
- `/app/backend/staff/pointage_models.py` - Pydantic models
- `/app/frontend/src/pages/staff/StaffPointage.jsx` - Desktop Pointage UI
- `/app/frontend/src/pages/pointage/MobilePointage.jsx` - Mobile QR Pointage UI

### Flowboard
- `/app/backend/flowboard/routes.py` - Flowboard API endpoints
- `/app/backend/flowboard/models.py` - Pydantic models
- `/app/frontend/src/pages/flowboard/Flowboard.jsx` - Dashboard UI

### Integrations Hub
- `/app/backend/integrations/routes.py` - Integrations API
- `/app/backend/integrations/models.py` - Provider models
- `/app/frontend/src/pages/integrations/IntegrationsHub.jsx` - Integration management UI

### QR Codes & Satisfaction
- `/app/backend/qrcodes/routes.py` - QR Codes API
- `/app/backend/satisfaction/routes.py` - Satisfaction API
- `/app/frontend/src/pages/public/SatisfactionSurvey.jsx` - Formulaire public multi-langues
- `/app/frontend/src/components/housekeeping/QRCodeManager.jsx` - Gestionnaire QR
- `/app/frontend/src/components/housekeeping/SatisfactionConfig.jsx` - Config satisfaction

### Design System
- `/app/frontend/src/styles/flowtym-premium-v2.css` - Main CSS with global overrides
- `/app/frontend/src/styles/flowtym-tokens.css` - CSS variables/tokens
- `/app/frontend/tailwind.config.js` - Tailwind configuration

### Command Palette
- `/app/frontend/src/components/CommandPalette.jsx` - Command Palette component
- `/app/frontend/src/components/layout/MainLayout.jsx` - Integration point

### AI Support Center
- `/app/backend/support/routes.py` - Support API endpoints (tickets, diagnose, stats)
- `/app/backend/support/models.py` - Pydantic models for support
- `/app/frontend/src/components/support/SupportFloatingButton.jsx` - Global floating button
- `/app/frontend/src/pages/support/SupportCenter.jsx` - Hotel support center
- `/app/frontend/src/pages/support/SupportDashboard.jsx` - Super Admin dashboard

---

## Phase 12: Flowtym AI Support Center (Completed - March 27, 2026)
Module de support client intelligent avec auto-diagnostic IA.

### 12.1 Bouton Flottant Global
- [x] Bouton violet en bas à droite sur toutes les pages (après connexion)
- [x] Badge de notifications non lues
- [x] data-testid="support-floating-btn"

### 12.2 Création de Ticket (4 étapes)
- [x] Étape 1: Sélection du module (9 modules: PMS, Channel Manager, RMS, Housekeeping, CRM, Facturation, Staff, Configuration, Autre)
- [x] Étape 2: Titre et description détaillée
- [x] Étape 3: Capture d'écran optionnelle (auto via html2canvas ou upload manuel)
- [x] Étape 4: Récapitulatif avec contexte automatique (page, navigateur, timestamp)

### 12.3 Auto-Diagnostic IA
- [x] Endpoint POST /api/support/hotels/{hotel_id}/diagnose
- [x] Intégration GPT-4o via Emergent LLM Key
- [x] Détection des problèmes connus
- [x] Suggestions de solutions
- [x] Fallback si API indisponible

### 12.4 Support Center (Hôtels)
- [x] Page /support accessible depuis le layout principal
- [x] 4 KPIs: Total tickets, En attente, En cours, Résolus
- [x] Liste des tickets avec filtres (statut, module)
- [x] Recherche de tickets
- [x] Panneau de détail avec conversation et diagnostic IA
- [x] Bouton "Demander l'aide de l'IA"

### 12.5 Dashboard Super Admin
- [x] Route /superadmin/support
- [x] Menu "Support IA" dans la barre latérale
- [x] 5 KPI cards: Total, En attente, En cours, Résolus, Taux IA
- [x] Graphiques: Tickets par Module, Tickets par Priorité
- [x] Performance: Temps moyen résolution, Résolution IA, Taux satisfaction
- [x] Liste des tickets récents avec actions rapides

### 12.6 API Endpoints Support
- `GET /api/support/stats` - Statistiques globales
- `GET /api/support/hotels/{hotel_id}/stats` - Statistiques par hôtel
- `POST /api/support/hotels/{hotel_id}/tickets` - Créer un ticket
- `GET /api/support/hotels/{hotel_id}/tickets` - Lister les tickets
- `GET /api/support/hotels/{hotel_id}/tickets/{ticket_id}` - Détail d'un ticket
- `PUT /api/support/hotels/{hotel_id}/tickets/{ticket_id}` - Mettre à jour un ticket
- `POST /api/support/hotels/{hotel_id}/tickets/{ticket_id}/messages` - Ajouter un message
- `POST /api/support/hotels/{hotel_id}/diagnose` - Auto-diagnostic IA
- `POST /api/support/hotels/{hotel_id}/tickets/{ticket_id}/ai-analyze` - Analyse IA d'un ticket
- `GET /api/support/knowledge` - Base de connaissances
- `GET /api/support/hotels/{hotel_id}/notifications` - Liste des notifications
- `GET /api/support/hotels/{hotel_id}/notifications/count` - Compteur de notifications non lues
- `POST /api/support/hotels/{hotel_id}/notifications/read-all` - Marquer toutes comme lues
- `POST /api/support/hotels/{hotel_id}/notifications/{id}/read` - Marquer une notification comme lue

---

## Phase 12.1: Notifications Temps Réel Support (Completed - March 27, 2026)
Système de notifications push en temps réel pour le Support Center.

### 12.1.1 Badge de Notification
- [x] Badge rouge sur le bouton flottant Support
- [x] Animation pulse quand nouvelles notifications
- [x] Affiche le nombre de notifications non lues (9+ si > 9)

### 12.1.2 Centre de Notifications
- [x] Accessible via icône cloche dans le modal Support
- [x] Liste des notifications avec icônes selon type
- [x] Bouton "Tout lire" pour marquer toutes comme lues
- [x] Bouton refresh pour actualiser
- [x] Bouton "Retour" pour revenir au formulaire

### 12.1.3 Types de Notifications
- [x] `ai_response` : Quand l'IA répond à un ticket (icône Bot 🤖)
- [x] `status_change` : Quand le statut d'un ticket change (icône RefreshCw avec emoji selon statut)

### 12.1.4 Polling Intelligent
- [x] Vérification toutes les 30 secondes
- [x] Toast notification pour nouvelles notifications
- [x] Bouton "Voir" dans le toast pour ouvrir le centre
- [x] Tracking des IDs déjà vus pour éviter les doublons

### 12.1.5 Persistance en Base de Données
- [x] Collection `notifications` dans MongoDB
- [x] Champs: hotel_id, type, notification_type, ticket_id, title, message, read, created_at
- [x] Statut lu/non lu persisté

---

## Phase 13: Support Agent Interface & Remote Access (Completed - March 27, 2026)
Interface dédiée pour les agents de support Flowtym avec accès à distance sécurisé.

### 13.1 Interface Support Agent (/support-agent)
- [x] Layout dédié avec sidebar gradient (from-slate-900 to-slate-800)
- [x] Authentification séparée pour rôle "support"
- [x] Redirection automatique depuis /login vers /support-agent

### 13.2 Pages Support Agent
- [x] **Dashboard** : KPIs (Tickets ouverts, En cours, Résolus, Sessions à distance)
- [x] **Performance IA** : Métriques circulaires (Traités IA, Escaladés, Temps moyen, Satisfaction)
- [x] **Alertes critiques** : Section d'alertes en temps réel
- [x] **Tickets** : Liste filtrable avec détails et actions
- [x] **Accès distant** : Gestion des demandes d'accès à distance
- [x] **IA Assistant** : Chat intelligent pour diagnostic (simulation locale)
- [x] **Historique** : Sessions de support terminées
- [x] **Logs** : Audit trail des actions

### 13.3 Accès à Distance Sécurisé
- [x] Workflow de demande : Support sélectionne hôtel → module → rôle → raison
- [x] Notification in-app côté hôtel pour approbation
- [x] Sessions temporaires avec expiration (5, 15, 30, 60 min)
- [x] Statuts : pending, approved, active, completed, rejected, expired
- [x] Traçabilité complète des sessions

### 13.4 API Endpoints Remote Access
- `GET /api/support/remote/stats` - Statistiques accès distant
- `POST /api/support/remote/request` - Créer demande d'accès
- `GET /api/support/remote/requests` - Liste des demandes
- `GET /api/support/remote/requests/{id}` - Détail d'une demande
- `POST /api/support/remote/requests/{id}/approve` - Approuver demande
- `POST /api/support/remote/requests/{id}/reject` - Refuser demande
- `POST /api/support/remote/session/start/{id}` - Démarrer session
- `POST /api/support/remote/session/end/{id}` - Terminer session
- `POST /api/support/remote/session/{id}/screenshot` - Sauvegarder capture
- `GET /api/support/remote/session/{id}/screenshots` - Liste captures

### 13.5 Session Replay
- [x] Endpoint POST /api/support/remote/replay/record - Enregistrer actions
- [x] Endpoint GET /api/support/remote/replay/sessions/{hotel_id} - Liste sessions
- [x] Endpoint GET /api/support/remote/replay/session/{session_id} - Replay complet
- [x] Collection session_recordings dans MongoDB

### 13.6 Super Admin Améliorations
- [x] Sidebar avec gradient (from-slate-900 to-slate-800)
- [x] Menu "Support IA" ajouté avec icône Sparkles
- [x] Style cohérent avec l'interface Support Agent

### 13.7 Nouveaux Statuts de Tickets
- open : Ticket ouvert
- ai_processing : IA en cours de traitement
- escalated_to_human : Escaladé vers support humain
- in_progress : En cours de traitement
- resolved : Résolu
- closed : Fermé

### 13.8 Types de Diagnostic IA
- local_browser : Problème navigateur local
- local_cache : Problème de cache
- local_connection : Problème de connexion
- system_bug : Bug système Flowtym
- system_sync : Erreur de synchronisation
- system_config : Problème de configuration
- user_error : Erreur utilisateur
- unknown : Non identifié

---

*Document Version: 13.0*
*Last Updated: March 27, 2026*
*Module Completed: Support Agent Interface & Remote Access*

---

### Phase 14: Export Variables de Paie vers Logiciels Comptables (Completed - April 1, 2026)
Export des variables de paie mensuelles vers les principaux logiciels de paie français.

#### 14.1 Logiciels Supportés
- [x] **Sage Paie & RH** — CSV UTF-8 BOM, séparateur `;`, colonnes RUBRIQUE_xxx
- [x] **Silae (Septeo)** — CSV UTF-8, séparateur `,`, format import automatique
- [x] **Cegid HR Ultimate** — TSV ANSI, en-tête `#FLOWTYM_EXPORT`, format Peoplenet
- [x] **ADP iHCM** — JSON structuré, schéma `workerID / payData` compatible Workforce Now
- [x] **Préparation DSN** — CSV récapitulatif pour aide à la DSN mensuelle (tous logiciels)

#### 14.2 Données Exportées
- Heures normales, heures sup 25%, heures sup 50%
- Heures de nuit, heures jours fériés
- Congés payés pris (jours), arrêts maladie, absences justifiées, absences non justifiées
- Total heures à payer, jours travaillés, taux horaire brut
- Département, type de contrat, date d'embauche

#### 14.3 Interface Utilisateur
- [x] Bouton "Logiciel de paie" dans la barre d'actions de StaffReporting
- [x] Modal avec sélection visuelle du logiciel (cards avec indicateur radio)
- [x] Instructions d'import par logiciel (où et comment importer dans chaque outil)
- [x] Téléchargement direct du fichier (bon type MIME + nom de fichier formaté)
- [x] Badge de confirmation après chaque téléchargement réussi
- [x] Avertissement sur l'importance de valider les pointages avant envoi

#### 14.4 Fichiers Créés
- `/app/backend/payroll_reporting/payroll_software_export.py` — Générateur formats logiciels
- `/app/frontend/src/pages/staff/components/PayrollSoftwareExport.jsx` — Modal d'export UI

#### 14.5 Fichiers Modifiés (ajout uniquement)
- `/app/backend/payroll_reporting/routes.py` — 2 nouveaux endpoints ajoutés en fin de fichier
  - `GET /{hotel_id}/software-list` — liste des logiciels supportés
  - `GET /{hotel_id}/export-software/{software}` — génération et téléchargement
- `/app/frontend/src/pages/staff/StaffReporting.jsx` — import + état + bouton + modal

#### 14.6 API Endpoints Ajoutés
- `GET /api/hotels/{hotel_id}/payroll-reports/software-list` — Liste logiciels supportés
- `GET /api/hotels/{hotel_id}/payroll-reports/export-software/{software}?month=&year=` — Télécharger export

---

*Document Version: 14.0*
*Last Updated: April 1, 2026*
*Module Completed: Export Variables de Paie vers Logiciels Comptables*

---

### Phase 15: Système de Webhooks Sortants (Completed - April 1, 2026)
Moteur complet de webhooks outbound pour notifier des systèmes externes en temps réel.

#### 15.1 Moteur de Livraison
- [x] Signature HMAC-SHA256 sur chaque requête (header `X-Flowtym-Signature-256`)
- [x] Retry automatique avec backoff : 3 tentatives (30s → 2min → 10min)
- [x] Logs de livraison persistants en base (collection `webhook_deliveries`)
- [x] Livraison en parallèle vers plusieurs endpoints (asyncio.gather)
- [x] Timeout HTTP configurable (10s par défaut)

#### 15.2 12 Types d'Événements Supportés
reservation.created/updated/cancelled/checked_in/checked_out/no_show,
guest.created/updated, room.status_changed, payment.received,
invoice.created, night_audit.completed

#### 15.3 Déclenchement Automatique
- [x] `reservation.created` déclenché automatiquement à chaque nouvelle réservation PMS

#### 15.4 API Backend (10 endpoints)
- GET/POST /integrations/hotels/{id}/webhooks
- GET/PUT/DELETE /integrations/hotels/{id}/webhooks/{wid}
- POST .../webhooks/{wid}/toggle — Active/désactive
- POST .../webhooks/{wid}/test — Envoie un ping de test
- GET .../webhooks/{wid}/deliveries — Historique + stats
- GET /integrations/hotels/{id}/webhooks/events — Liste des événements
- GET /integrations/hotels/{id}/webhooks-stats — Dashboard KPIs

#### 15.5 Interface Frontend
- [x] Onglet "Webhooks" dans IntegrationsHub
- [x] KPI strip (endpoints actifs, livraisons, taux de succès, 24h)
- [x] Cards webhook avec indicateur on/off, badges statut, événements
- [x] Panel expandable historique des livraisons par webhook (30 dernières)
- [x] Formulaire création/édition : URL, secret, events (checkboxes), retry count
- [x] Actions : test ping, toggle actif/inactif, copier le secret, supprimer
- [x] Bandeau info signature HMAC

#### 15.6 Fichiers Créés
- `/app/backend/integrations/webhook_delivery.py` — Moteur HMAC + retry
- `/app/frontend/src/pages/integrations/components/WebhookManager.jsx` — UI complète

#### 15.7 Fichiers Modifiés (ajout uniquement)
- `/app/backend/integrations/routes.py` — 10 endpoints ajoutés en fin de fichier
- `/app/backend/server.py` — Hook fire_event après create_reservation
- `/app/frontend/src/pages/integrations/IntegrationsHub.jsx` — import + onglet Webhooks

---

*Document Version: 15.0*
*Last Updated: April 1, 2026*
*Module Completed: Système de Webhooks Sortants*

---

### Phase 17: CRM → ConfigService & Channel Manager → ConfigService (Completed - April 1, 2026)
Connexion des modules CRM et Channel Manager au service de configuration central.

#### 17.1 CRM → ConfigService
- [x] `GET /crm/hotels/{hotel_id}/clients` — Liste clients **filtrée par hotel_id** (fix du bug existant)
- [x] `POST /crm/hotels/{hotel_id}/clients/{id}/enrich` — Enrichissement profil client :
  - Type de chambre préféré (déduit des séjours PMS via ConfigService)
  - Plan tarifaire habituel
  - Politique d'annulation de l'hôtel
  - Segment suggéré automatique (nouveau/régulier/fidèle/VIP)
  - Devise et langue de l'hôtel
- [x] `POST /crm/hotels/{hotel_id}/clients/sync-and-enrich` — Sync batch PMS→CRM :
  - Correction des clients existants sans `hotel_id`
  - Import des clients depuis les réservations PMS
  - Mise à jour `total_stays` et `total_spent`

#### 17.2 Channel Manager → ConfigService
- [x] `get_inventory()` — Fallback sur `config.get_room_types()` au lieu de `db.room_types`
- [x] `get_rates()` — Prix de base depuis `config.get_pricing_matrix()` (matrice BAR réelle)
- [x] `create_room_mapping()` — Nom de type de chambre depuis `config.get_room_type_by_id()`
- [x] `POST /hotels/{hotel_id}/channel/sync-rates-from-config` — Synchronisation complète tarifaire :
  - Lit la matrice de prix ConfigService (BAR + plans dérivés)
  - Applique les commissions OTA par canal
  - Upsert dans `channel_rates` pour toute la période
  - Log de sync dans `channel_sync_logs`
- [x] `GET /hotels/{hotel_id}/channel/room-types-from-config` — Types de chambres ConfigService fusionnés avec les mappings canaux existants

#### 17.3 Fichiers modifiés (ajout uniquement)
- `backend/crm/routes.py` — 3 nouveaux endpoints en fin de fichier
- `backend/channel/routes.py` — 3 corrections + 2 nouveaux endpoints
- `backend/server.py` — 5 nouvelles routes enregistrées

#### 17.4 Backlog mis à jour
- [x] CRM Integration: Connect customer management to ConfigService ✅
- [x] Channel Manager: Connect OTA sync to ConfigService ✅
- [x] Webhook delivery system ✅ (Phase 15)
- [x] Real-time webhooks for booking events ✅ (Phase 15)
- [x] STAFF → Paie: Export heures travaillées/sup/absences ✅ (Phase 14)

---

*Document Version: 17.0*
*Last Updated: April 1, 2026*
*Module Completed: CRM + Channel Manager → ConfigService Integration*

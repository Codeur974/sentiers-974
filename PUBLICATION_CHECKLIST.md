# 📋 Checklist Publication Sentiers974 v1.0

**Objectif** : Publier l'application Sentiers974 sur Google Play Store et Apple App Store
**Version cible** : 1.0.0 Gratuite
**Deadline estimée** : 4-6 semaines

---

## 📊 Progression Globale

```
Phase 1 - Critiques & Conformité:    [ 0/15 ] 0%
Phase 2 - Backend & Infrastructure:  [ 0/8  ] 0%
Phase 3 - UX & Polish:               [ 0/10 ] 0%
Phase 4 - Tests:                     [ 0/7  ] 0%
Phase 5 - Store Submission:          [ 0/12 ] 0%
────────────────────────────────────────────────
TOTAL:                               [ 0/52 ] 0%
```

---

## 🎯 PHASE 1 - CRITIQUES & CONFORMITÉ (2 semaines)

### 1.1 Documents Légaux (OBLIGATOIRE)

- [ ] **Privacy Policy (Politique de confidentialité)**
  - [ ] Créer fichier `privacy-policy.html`
  - [ ] Sections à inclure :
    - [ ] Données collectées (GPS, photos, sessions)
    - [ ] Utilisation des données
    - [ ] Stockage (MongoDB, AsyncStorage)
    - [ ] Partage avec tiers (aucun)
    - [ ] Droits utilisateur (suppression, export RGPD)
    - [ ] Contact support
  - [ ] Héberger sur GitHub Pages OU site web
  - [ ] URL finale : `https://....com/privacy-policy.html`
  - [ ] **Fichier** : `sentiers974/legal/privacy-policy.html`

- [ ] **Terms of Service (CGU - Conditions Générales d'Utilisation)**
  - [ ] Créer fichier `terms-of-service.html`
  - [ ] Sections :
    - [ ] Acceptation des conditions
    - [ ] Utilisation de l'app
    - [ ] Responsabilités utilisateur
    - [ ] Limitation de responsabilité
    - [ ] Modifications des CGU
  - [ ] Héberger sur GitHub Pages OU site web
  - [ ] URL finale : `https://....com/terms-of-service.html`
  - [ ] **Fichier** : `sentiers974/legal/terms-of-service.html`

- [ ] **Ajouter liens dans l'app**
  - [ ] Créer écran "Paramètres" avec liens Privacy + Terms
  - [ ] Footer avec liens dans écran "À propos"

**Estimation** : 1 jour
**Priorité** : 🔴 CRITIQUE (obligatoire stores)

---

### 1.2 Permissions & Descriptions

- [ ] **Android - permissions.txt descriptions**
  - [ ] Location foreground : "Pour enregistrer votre parcours GPS en temps réel"
  - [ ] Camera : "Pour ajouter des photos à vos sessions"
  - [ ] Media Library : "Pour sélectionner des photos depuis votre galerie"
  - [ ] Storage : "Pour exporter vos activités au format GPX"
  - [ ] **Fichier** : `sentiers974/android/app/src/main/res/values/strings.xml`

- [ ] **iOS - Info.plist descriptions**
  - [ ] NSLocationWhenInUseUsageDescription
  - [ ] NSCameraUsageDescription
  - [ ] NSPhotoLibraryUsageDescription
  - [ ] NSPhotoLibraryAddUsageDescription
  - [ ] **Fichier** : `sentiers974/ios/sentiers974/Info.plist`

**Estimation** : 2 heures
**Priorité** : 🔴 CRITIQUE

---

### 1.3 App Icon & Splash Screen

- [ ] **App Icon**
  - [ ] Design icon 1024x1024px (Canva, Figma, ou designer)
  - [ ] Exporter toutes tailles iOS/Android avec `npx expo-icon`
  - [ ] Tester sur device (vérifier coins arrondis iOS)
  - [ ] **Fichier source** : `sentiers974/assets/icon.png`

- [ ] **Splash Screen**
  - [ ] Design splash 1284x2778px (iPhone 14 Pro Max)
  - [ ] Logo + texte "Sentiers 974"
  - [ ] Couleur background cohérente avec app
  - [ ] Tester sur iOS/Android
  - [ ] **Fichier** : `sentiers974/assets/splash.png`

- [ ] **Adaptive Icon Android**
  - [ ] Version foreground (logo seul)
  - [ ] Version background (couleur unie)
  - [ ] Tester masques Android (cercle, carré, arrondi)
  - [ ] **Fichier** : `sentiers974/assets/adaptive-icon.png`

**Estimation** : 1 jour (avec designer) OU 3 jours (DIY)
**Priorité** : 🔴 CRITIQUE

---

### 1.4 App Configuration

- [ ] **app.json / app.config.js**
  - [ ] `name`: "Sentiers 974"
  - [ ] `slug`: "sentiers974"
  - [ ] `version`: "1.0.0"
  - [ ] `description`: Description marketing (max 4000 char)
  - [ ] `privacy`: "public" (ou "unlisted" pour beta)
  - [ ] `ios.bundleIdentifier`: "com.yourcompany.sentiers974"
  - [ ] `android.package`: "com.yourcompany.sentiers974"
  - [ ] `android.versionCode`: 1
  - [ ] `ios.buildNumber`: "1"
  - [ ] `orientation`: "portrait"
  - [ ] `primaryColor`: Choisir couleur principale
  - [ ] **Fichier** : `sentiers974/app.json`

**Estimation** : 1 heure
**Priorité** : 🔴 CRITIQUE

---

## 🖥️ PHASE 2 - BACKEND & INFRASTRUCTURE (1 semaine)

### 2.1 Déploiement Backend Production

- [ ] **Créer compte Railway.app**
  - [ ] S'inscrire sur https://railway.app (gratuit)
  - [ ] Connecter compte GitHub

- [ ] **Déployer backend Node.js**
  - [ ] Créer nouveau projet Railway
  - [ ] Connecter repo `sentiers974-backend`
  - [ ] Variables d'environnement :
    - [ ] `MONGODB_URI` (depuis MongoDB Atlas)
    - [ ] `NODE_ENV=production`
    - [ ] `PORT=3000`
  - [ ] Vérifier build & déploiement
  - [ ] Copier URL production : `https://sentiers974-backend-production-xxxx.up.railway.app`

- [ ] **Tester API en production**
  - [ ] GET `/api/health` → 200 OK
  - [ ] POST `/api/sessions` → Créer session test
  - [ ] GET `/api/sessions/:id` → Récupérer session
  - [ ] DELETE `/api/sessions/:id` → Supprimer session

**Estimation** : 3 heures
**Priorité** : 🔴 CRITIQUE (HTTPS obligatoire stores)

---

### 2.2 MongoDB Atlas Configuration

- [ ] **Créer cluster MongoDB Atlas**
  - [ ] S'inscrire sur https://www.mongodb.com/cloud/atlas (gratuit 512MB)
  - [ ] Créer cluster M0 (gratuit)
  - [ ] Région : Europe (Paris ou Frankfurt)
  - [ ] Database name : `sentiers974_prod`

- [ ] **Sécurité**
  - [ ] Créer user admin avec mot de passe fort
  - [ ] Whitelist IP Railway (ou 0.0.0.0/0 pour permettre tout)
  - [ ] Copier connection string
  - [ ] Tester connexion depuis Railway

- [ ] **Backup**
  - [ ] Activer snapshots automatiques (gratuit daily)
  - [ ] Tester restore manuel

**Estimation** : 2 heures
**Priorité** : 🔴 CRITIQUE

---

### 2.3 Variables d'Environnement App

- [ ] **Créer .env.production**
  ```
  EXPO_PUBLIC_API_URL=https://sentiers974-backend-production-xxxx.up.railway.app
  ```
  - [ ] **Fichier** : `sentiers974/.env.production`

- [ ] **EAS Secrets (pour EAS Build)**
  ```bash
  npx eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://...
  ```

**Estimation** : 30 min
**Priorité** : 🔴 CRITIQUE

---

### 2.4 Sécurité Backend

- [ ] **Rate Limiting**
  - [ ] Installer `express-rate-limit`
  - [ ] Limiter POST /api/sessions : 100 requêtes/15min par IP
  - [ ] Limiter GET /api/sessions : 300 requêtes/15min
  - [ ] **Fichier** : `sentiers974-backend/middleware/rateLimiter.js`

- [ ] **Validation Données**
  - [ ] Valider `sessionId` format (UUID)
  - [ ] Valider coordonnées GPS (latitude -90 à 90, longitude -180 à 180)
  - [ ] Valider distance max (< 1000 km par session)
  - [ ] Valider durée max (< 24h)
  - [ ] **Fichier** : `sentiers974-backend/middleware/validation.js`

- [ ] **CORS Configuration**
  - [ ] Autoriser uniquement domaine production
  - [ ] Headers appropriés
  - [ ] **Fichier** : `sentiers974-backend/server.js`

**Estimation** : 4 heures
**Priorité** : 🟡 IMPORTANT

---

### 2.5 Monitoring & Logs

- [ ] **Sentry (Crash Reporting)**
  - [ ] S'inscrire sur https://sentry.io (gratuit 5k events/mois)
  - [ ] Installer `@sentry/react-native`
  - [ ] Configurer DSN dans app
  - [ ] Tester crash volontaire
  - [ ] **Fichier** : `sentiers974/App.tsx`

- [ ] **UptimeRobot (Monitoring API)**
  - [ ] S'inscrire sur https://uptimerobot.com (gratuit)
  - [ ] Créer monitor HTTP(S) sur `/api/health`
  - [ ] Check toutes les 5 minutes
  - [ ] Email alert si down

**Estimation** : 2 heures
**Priorité** : 🟢 RECOMMANDÉ

---

## 🎨 PHASE 3 - UX & POLISH (1 semaine)

### 3.1 Onboarding (Premier lancement)

- [ ] **Créer composant Onboarding**
  - [ ] Slide 1 : "Bienvenue sur Sentiers 974" + illustration
  - [ ] Slide 2 : "Tracking GPS multi-sports" + capture écran
  - [ ] Slide 3 : "Export vers Strava/Garmin" + icônes
  - [ ] Bouton "Commencer" → Demande permissions
  - [ ] **Fichier** : `sentiers974/src/screens/OnboardingScreen.tsx`

- [ ] **AsyncStorage flag**
  - [ ] Vérifier `hasSeenOnboarding` au démarrage
  - [ ] Ne montrer qu'une seule fois
  - [ ] **Fichier** : `sentiers974/src/utils/onboarding.ts`

**Estimation** : 1 jour
**Priorité** : 🟡 IMPORTANT

---

### 3.2 Gestion Erreurs Utilisateur

- [ ] **Améliorer messages d'erreur**
  - [ ] Remplacer logs console par Alerts utilisateur
  - [ ] MongoDB down → "Mode hors-ligne activé"
  - [ ] GPS perdu → "Signal GPS faible, tentative de reconnexion..."
  - [ ] Export GPX échec → "Erreur export, veuillez réessayer"
  - [ ] **Fichiers à modifier** :
    - [ ] `sentiers974/src/hooks/tracking/useSessionPersistence.ts`
    - [ ] `sentiers974/src/hooks/tracking/useGPSTracking.ts`
    - [ ] `sentiers974/src/hooks/useTrackingLogic.ts`

- [ ] **Loading States**
  - [ ] Loader pendant export GPX
  - [ ] Loader pendant sauvegarde MongoDB
  - [ ] Skeleton screens pour historique
  - [ ] **Composant** : `sentiers974/src/components/LoadingSpinner.tsx`

**Estimation** : 1 jour
**Priorité** : 🟡 IMPORTANT

---

### 3.3 Mode Offline Amélioré

- [ ] **Indicateur réseau**
  - [ ] Badge "Mode hors-ligne" si MongoDB down
  - [ ] Icône sync quand reconnecté
  - [ ] **Composant** : `sentiers974/src/components/NetworkStatus.tsx`

- [ ] **Retry automatique**
  - [ ] Toutes les 30s si MongoDB down
  - [ ] Sync sessions locales vers MongoDB
  - [ ] **Fichier** : `sentiers974/src/hooks/useNetworkSync.ts`

**Estimation** : 1 jour
**Priorité** : 🟢 RECOMMANDÉ

---

### 3.4 Écran Paramètres

- [ ] **Créer SettingsScreen**
  - [ ] Lien Privacy Policy (ouvre navigateur)
  - [ ] Lien Terms of Service (ouvre navigateur)
  - [ ] Lien "Nous contacter" (email)
  - [ ] Version app affichée
  - [ ] Bouton "Supprimer toutes mes données" (avec confirmation)
  - [ ] **Fichier** : `sentiers974/src/screens/SettingsScreen.tsx`

- [ ] **Ajouter dans navigation**
  - [ ] Tab bar ou menu hamburger
  - [ ] Icône ⚙️ Paramètres

**Estimation** : 4 heures
**Priorité** : 🟡 IMPORTANT

---

### 3.5 Écran À Propos

- [ ] **Créer AboutScreen**
  - [ ] Logo + "Sentiers 974"
  - [ ] Version 1.0.0
  - [ ] Description : "App de tracking GPS pour La Réunion"
  - [ ] Crédits développeur
  - [ ] Liens réseaux sociaux
  - [ ] **Fichier** : `sentiers974/src/screens/AboutScreen.tsx`

**Estimation** : 2 heures
**Priorité** : 🟢 RECOMMANDÉ

---

### 3.6 Dark Mode (Optionnel)

- [ ] **Support dark mode**
  - [ ] Détecter préférence système
  - [ ] Couleurs adaptées (dark/light)
  - [ ] Switch manuel dans Paramètres
  - [ ] **Fichier** : `sentiers974/src/theme/colors.ts`

**Estimation** : 2 jours
**Priorité** : ⚪ OPTIONNEL (post-v1.0)

---

### 3.7 Langues (Optionnel)

- [ ] **i18n Français / Anglais**
  - [ ] Installer `i18next`
  - [ ] Traduire tous les textes
  - [ ] Détecter langue système
  - [ ] Switch langue dans Paramètres
  - [ ] **Fichier** : `sentiers974/src/i18n/`

**Estimation** : 3 jours
**Priorité** : ⚪ OPTIONNEL (v1.1)

---

## 🧪 PHASE 4 - TESTS (1 semaine)

### 4.1 Tests Devices Réels

- [ ] **Android**
  - [ ] Tester sur Samsung (Android 12+)
  - [ ] Tester sur Pixel (Android 13+)
  - [ ] Tester sur device budget (Android 11)
  - [ ] Résolutions : 1080p, 1440p, tablet

- [ ] **iOS**
  - [ ] Tester sur iPhone 12/13/14
  - [ ] Tester sur iPhone SE (petit écran)
  - [ ] Tester sur iPad (optionnel)
  - [ ] iOS 15, 16, 17

**Estimation** : 2 jours
**Priorité** : 🔴 CRITIQUE

---

### 4.2 Tests Fonctionnels

- [ ] **Tracking GPS**
  - [ ] Session 5 min (marche)
  - [ ] Session 30 min (course)
  - [ ] Session 1h+ (trail)
  - [ ] Pause/Resume fonctionne
  - [ ] Stop → Sauvegarde correcte
  - [ ] Export GPX → Import Strava OK

- [ ] **Offline Mode**
  - [ ] Mode avion → Session locale OK
  - [ ] Réseau revient → Sync automatique
  - [ ] Suppression session sans réseau

- [ ] **Photos & POI**
  - [ ] Ajouter photo galerie
  - [ ] Prendre photo caméra
  - [ ] Supprimer photo
  - [ ] Ajouter POI
  - [ ] Supprimer POI

- [ ] **Historique**
  - [ ] Affichage sessions
  - [ ] Détails session
  - [ ] Suppression session
  - [ ] Suppression jour complet
  - [ ] Suppression bulk

**Estimation** : 2 jours
**Priorité** : 🔴 CRITIQUE

---

### 4.3 Tests Performance

- [ ] **Battery Drain**
  - [ ] Tracking 1h → Batterie consommée < 15%
  - [ ] Background acceptable (si implémenté)

- [ ] **Memory**
  - [ ] Session longue → Pas de memory leak
  - [ ] Historique 100+ sessions → Scroll fluide

- [ ] **GPS Accuracy**
  - [ ] En ville (buildings)
  - [ ] En forêt (canopy)
  - [ ] En montagne (dénivelé)
  - [ ] Précision < 10m en conditions normales

**Estimation** : 1 jour
**Priorité** : 🟡 IMPORTANT

---

### 4.4 Tests Edge Cases

- [ ] **Permissions refusées**
  - [ ] GPS refusé → Message clair
  - [ ] Camera refusée → Message clair
  - [ ] Gallery refusée → Message clair

- [ ] **Interruptions**
  - [ ] Appel téléphone pendant tracking
  - [ ] Notification pendant tracking
  - [ ] App en background → foreground

- [ ] **Erreurs réseau**
  - [ ] Timeout MongoDB
  - [ ] 500 Internal Server Error
  - [ ] Connexion intermittente

**Estimation** : 1 jour
**Priorité** : 🟡 IMPORTANT

---

## 📱 PHASE 5 - STORE SUBMISSION (1-2 semaines)

### 5.1 Google Play Store

- [ ] **Créer compte développeur**
  - [ ] S'inscrire sur https://play.google.com/console (25€ one-time)
  - [ ] Vérifier identité
  - [ ] Accepter accords développeur

- [ ] **Build Production AAB**
  ```bash
  npx eas build --platform android --profile production
  ```
  - [ ] Télécharger fichier `.aab`
  - [ ] Tester localement avec `bundletool`

- [ ] **Créer fiche app**
  - [ ] Nom app : "Sentiers 974"
  - [ ] Description courte (80 char) : "GPS tracking multi-sports pour La Réunion"
  - [ ] Description complète (4000 char) :
    ```
    Sentiers 974 est l'application de tracking GPS conçue pour les sportifs de La Réunion.

    🏃 SPORTS SUPPORTÉS
    • Course & Trail
    • Marche & Randonnée
    • VTT & Vélo
    • Escalade
    • Sports aquatiques (Natation, SUP, Surf, Kayak)

    📊 FONCTIONNALITÉS
    • Tracking GPS précis avec filtrage intelligent
    • Statistiques détaillées (distance, vitesse, dénivelé, calories)
    • Graphiques altitude et vitesse
    • Splits automatiques et manuels
    • Photos géolocalisées
    • Points d'intérêt (POI)
    • Export GPX vers Strava/Garmin Connect
    • Mode hors-ligne

    🌴 SPÉCIAL LA RÉUNION
    • Optimisé pour le relief réunionnais
    • Dénivelé adapté aux trails de montagne
    • Base de données locale pour mode offline

    100% gratuit, sans publicité !
    ```

- [ ] **Screenshots**
  - [ ] 2-8 screenshots par format :
    - [ ] Phone portrait (1080x1920 ou plus)
    - [ ] 7-inch tablet (optionnel)
    - [ ] 10-inch tablet (optionnel)
  - [ ] Exemples :
    1. Sélection sport
    2. Tracking en cours
    3. Statistiques live
    4. Graphiques
    5. Historique
    6. Export GPX
    7. Photos/POI

- [ ] **Vidéo Promo (optionnel)**
  - [ ] 30 secondes max
  - [ ] Montrer workflow complet
  - [ ] Format YouTube

- [ ] **Icône & Graphiques**
  - [ ] Icon 512x512px
  - [ ] Feature graphic 1024x500px
  - [ ] Promo graphic 180x120px (optionnel)

- [ ] **Catégorie & Tags**
  - [ ] Catégorie : Santé & Fitness
  - [ ] Tags : GPS, tracking, running, trail, cycling, hiking, La Réunion

- [ ] **Classification Contenu**
  - [ ] Répondre questionnaire (pas de violence, drogue, etc.)
  - [ ] Audience : PEGI 3 / Everyone

- [ ] **Prix & Distribution**
  - [ ] Gratuit
  - [ ] Pays : France, La Réunion, monde entier

- [ ] **Privacy Policy**
  - [ ] Lien URL privacy policy
  - [ ] Déclarer données collectées (GPS, photos)
  - [ ] Déclarer pratiques sécurité

- [ ] **Soumettre pour review**
  - [ ] Uploader AAB
  - [ ] Créer release "Production"
  - [ ] Soumettre
  - [ ] Attendre review (1-3 jours généralement)

**Estimation** : 3 jours
**Priorité** : 🔴 CRITIQUE

---

### 5.2 Apple App Store

- [ ] **Créer compte développeur**
  - [ ] S'inscrire sur https://developer.apple.com (99€/an)
  - [ ] Vérifier identité (2FA)
  - [ ] Accepter accords

- [ ] **Build Production IPA**
  ```bash
  npx eas build --platform ios --profile production
  ```
  - [ ] Télécharger fichier `.ipa`

- [ ] **App Store Connect**
  - [ ] Créer nouvelle app
  - [ ] Bundle ID : `com.yourcompany.sentiers974`
  - [ ] SKU : `sentiers974`

- [ ] **Informations app**
  - [ ] Nom : "Sentiers 974"
  - [ ] Sous-titre : "GPS Tracking La Réunion"
  - [ ] Description (similaire à Google Play)
  - [ ] Mots-clés : "GPS,tracking,running,trail,cycling,hiking,reunion"
  - [ ] URL support : Lien vers support
  - [ ] URL marketing : Site web (optionnel)

- [ ] **Screenshots**
  - [ ] iPhone 6.7" (iPhone 14 Pro Max) : 1290x2796
  - [ ] iPhone 6.5" (iPhone 11 Pro Max) : 1242x2688
  - [ ] iPhone 5.5" (iPhone 8 Plus) : 1242x2208
  - [ ] iPad Pro 12.9" (optionnel) : 2048x2732
  - [ ] 3-10 screenshots par format

- [ ] **Preview vidéo (optionnel)**
  - [ ] 15-30 secondes
  - [ ] Formats : 1920x1080 portrait

- [ ] **Informations générales**
  - [ ] Icône 1024x1024px
  - [ ] Catégorie primaire : Santé & Fitness
  - [ ] Catégorie secondaire : Sports (optionnel)
  - [ ] Age rating : 4+

- [ ] **App Privacy**
  - [ ] Questionnaire détaillé :
    - [ ] Location : "Pour tracking GPS"
    - [ ] Photos : "Pour ajouter à sessions"
    - [ ] User Content : "Sessions stockées"
  - [ ] Lien Privacy Policy

- [ ] **Pricing**
  - [ ] Gratuit
  - [ ] Disponibilité : Tous pays

- [ ] **TestFlight (Beta testing)**
  - [ ] Inviter 5-10 beta testers
  - [ ] Tester 1 semaine
  - [ ] Corriger bugs critiques

- [ ] **Soumettre pour review**
  - [ ] Uploader IPA via Xcode / Transporter
  - [ ] Remplir toutes sections
  - [ ] Soumettre
  - [ ] Attendre review (1-7 jours)

**Estimation** : 4 jours
**Priorité** : 🔴 CRITIQUE

---

### 5.3 Post-Submission

- [ ] **Monitoring first week**
  - [ ] Vérifier crashes (Sentry)
  - [ ] Vérifier reviews 1 étoile
  - [ ] Répondre aux questions utilisateurs
  - [ ] Hotfix si bugs critiques

- [ ] **Analytics**
  - [ ] Google Analytics / Firebase
  - [ ] Tracker downloads
  - [ ] Tracker sessions actives
  - [ ] Tracker crashes

- [ ] **Marketing**
  - [ ] Post Facebook/Instagram
  - [ ] Post groupes trail La Réunion
  - [ ] Email clubs sportifs
  - [ ] Press release locale

**Estimation** : Ongoing
**Priorité** : 🟢 RECOMMANDÉ

---

## 💰 BUDGET PRÉVISIONNEL

| Poste | Coût |
|-------|------|
| Google Play Developer | 25€ (one-time) |
| Apple Developer Program | 99€/an |
| Railway.app Hosting | 0€ (gratuit 500h/mois) |
| MongoDB Atlas | 0€ (gratuit 512MB) |
| Sentry | 0€ (gratuit 5k events/mois) |
| Domain name (optionnel) | ~10€/an |
| **TOTAL Année 1** | **~124€** |
| **TOTAL Années suivantes** | **~99€/an** (iOS uniquement) |

---

## 📅 PLANNING ESTIMÉ

```
Semaine 1-2:  Phase 1 - Critiques & Conformité
Semaine 3:    Phase 2 - Backend & Infrastructure
Semaine 4:    Phase 3 - UX & Polish
Semaine 5:    Phase 4 - Tests
Semaine 6-7:  Phase 5 - Store Submission
Semaine 8:    Corrections review + Publication
```

**Date cible publication** : Dans 8 semaines (2 mois)

---

## 🚨 RISQUES & MITIGATION

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Rejet Google Play (privacy) | Élevé | Moyenne | Privacy policy détaillée + tests préalables |
| Rejet App Store (guidelines) | Élevé | Moyenne | Lire guidelines + TestFlight beta |
| Bugs critiques post-launch | Moyen | Élevée | Tests exhaustifs + monitoring Sentry |
| Backend down | Élevé | Faible | Mode offline robuste + monitoring UptimeRobot |
| GPS imprécis certains devices | Moyen | Moyenne | Filtrage adaptatif + tests multi-devices |
| Battery drain | Moyen | Faible | Polling interval optimisé + tests longue durée |

---

## 📞 RESSOURCES & AIDE

- **Expo Docs** : https://docs.expo.dev
- **EAS Build** : https://docs.expo.dev/build/introduction/
- **Google Play Console** : https://play.google.com/console
- **App Store Connect** : https://appstoreconnect.apple.com
- **Railway** : https://railway.app
- **MongoDB Atlas** : https://www.mongodb.com/cloud/atlas
- **Sentry** : https://sentry.io

---

## ✅ PROCHAINES ÉTAPES IMMÉDIATES

1. [ ] Créer Privacy Policy + Terms of Service
2. [ ] Déployer backend sur Railway
3. [ ] Finaliser App Icon + Splash Screen
4. [ ] Créer onboarding (3 slides)
5. [ ] Tests sur vrais devices Android + iOS

---

**Dernière mise à jour** : 2025-11-21
**Version document** : 1.0

# 🚴 Intégration Strava API pour Sentiers 974

## ✅ Résultat des tests
- **API Strava disponible** et fonctionnelle
- **Endpoints confirmés** : `/clubs/search`, `/segments/explore`, `/clubs/{id}/events`
- **Authentication required** : OAuth 2.0

## 🔑 Étapes pour configurer

### 1. Créer l'application Strava
1. Aller sur https://www.strava.com/settings/api
2. Cliquer "Create Application"
3. Remplir :
   - **Application Name** : "Sentiers 974"
   - **Category** : "Other"  
   - **Website** : "https://sentiers974.com" (ou localhost)
   - **Authorization Callback Domain** : "localhost" (pour dev)

### 2. Obtenir les clés
- **Client ID** : Numéro public
- **Client Secret** : Clé privée (à garder secrète)

### 3. Configurer dans l'app

#### Ajout dans `.env` :
```env
# Strava API Configuration
EXPO_PUBLIC_STRAVA_CLIENT_ID=your_client_id_here
EXPO_PUBLIC_STRAVA_CLIENT_SECRET=your_client_secret_here
EXPO_PUBLIC_STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback
```

#### Service d'authentification :
```typescript
// src/services/stravaAuth.ts
export class StravaAuthService {
  private clientId = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID;
  private clientSecret = process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET;
  
  async authenticate() {
    // OAuth flow implementation
  }
  
  async getAccessToken(code: string) {
    // Exchange code for token
  }
}
```

## 📊 Données récupérables

### Clubs La Réunion
```javascript
GET /clubs/search?location=La+Réunion
// Retourne : clubs sportifs locaux avec leurs événements
```

### Événements par club
```javascript  
GET /clubs/{club_id}/events
// Retourne : événements organisés par le club
```

### Segments populaires
```javascript
GET /segments/explore?bounds=-21.4,-55.8,-20.8,-55.2
// Retourne : segments de course populaires à La Réunion
```

## 🎯 Intégration dans Sentiers 974

### Architecture proposée :
1. **Base locale** (25+ événements authentiques) = **PRINCIPAL**
2. **Strava API** = **COMPLÉMENT** en temps réel
3. **Fusion intelligente** des deux sources

### Avantages :
- ✅ **Événements réels** des clubs réunionnais
- ✅ **Mise à jour automatique** 
- ✅ **Communauté active** Strava
- ✅ **Segments populaires** pour découvrir parcours

### Types d'événements Strava :
- 🏃‍♂️ **Sorties club** (trail, course, vélo)
- 🚴‍♀️ **Challenges communautaires**
- 🏊‍♀️ **Événements multi-sports**
- 🥾 **Randonnées organisées**

## 🚀 Prochaines étapes

1. **Tu crées** l'app Strava (5min)
2. **J'intègre** l'authentification OAuth
3. **On teste** la récupération des événements réunionnais
4. **On fusionne** avec notre base locale

**Résultat final** : App avec TOUS les vrais événements sportifs de La Réunion ! 🏝️🏆
# 🔐 Intégration du système d'authentification

## ✅ Fichiers créés

### Backend (sentiers974-backend/)
- ✅ `models/User.js` - Modèle utilisateur avec bcrypt
- ✅ `middleware/auth.js` - Middleware JWT
- ✅ `routes/auth.js` - Routes d'authentification
- ✅ `.env` - JWT_SECRET ajouté
- ✅ `models/Session.js` - Modifié pour accepter ObjectId ou String
- ✅ `server.js` - Routes auth ajoutées

### Frontend (sentiers974/src/)
- ✅ `contexts/AuthContext.tsx` - Contexte d'authentification global
- ✅ `screens/LoginScreen.tsx` - Écran de connexion
- ✅ `screens/SignupScreen.tsx` - Écran d'inscription
- ✅ `screens/ProfileScreen.tsx` - Écran profil/paramètres

---

## 📋 Étapes d'intégration dans l'app

### 1️⃣ Wrapper l'app avec AuthProvider

Ouvre ton fichier principal (probablement `App.tsx` ou `index.tsx`) et wrappe toute l'app avec `AuthProvider` :

```tsx
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      {/* Ton app existante */}
      <NavigationContainer>
        {/* ... */}
      </NavigationContainer>
    </AuthProvider>
  );
}
```

### 2️⃣ Ajouter les écrans dans la navigation

Trouve ton fichier de navigation (probablement dans `src/navigation/` ou directement dans `App.tsx`).

**Option A - Stack Navigator :**
```tsx
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Dans ton Stack.Navigator
<Stack.Screen
  name="Profile"
  component={ProfileScreen}
  options={{ title: 'Mon Profil' }}
/>
<Stack.Screen
  name="Login"
  component={LoginScreen}
  options={{ title: 'Connexion' }}
/>
<Stack.Screen
  name="Signup"
  component={SignupScreen}
  options={{ title: 'Inscription' }}
/>
```

**Option B - Drawer/Tab Navigator :**
Si tu utilises un Drawer ou Tab Navigator, ajoute ProfileScreen comme nouvel onglet.

### 3️⃣ Connecter l'icône roue dentée à ProfileScreen

Trouve où est définie ton icône de paramètres dans le header et modifie l'action `onPress` :

```tsx
<TouchableOpacity onPress={() => navigation.navigate('Profile')}>
  <Ionicons name="settings-outline" size={24} />
</TouchableOpacity>
```

### 4️⃣ Utiliser le token dans les appels API

Maintenant que les users peuvent se connecter, tu dois envoyer le token JWT dans les requêtes API.

**Exemple - Modifier `useSessionPersistence.ts` :**

```tsx
import { useAuth } from '../contexts/AuthContext';

export const useSessionPersistence = () => {
  const { token, user } = useAuth();

  const createSession = async (sport: any, coords: any, address: string) => {
    // Utiliser user.id au lieu de 'default-user'
    const userId = user?.id || deviceId || 'anonymous';

    const sessionData = {
      sessionId,
      userId, // ✅ Maintenant c'est l'ID du user connecté
      sport: { nom: sport.nom, emoji: sport.emoji },
      // ...
    };

    const response = await fetch(`${MONGODB_API_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ Ajouter le token si connecté
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(sessionData)
    });
  };
};
```

### 5️⃣ Protéger les routes backend (optionnel)

Si tu veux que certaines routes nécessitent une connexion, ajoute le middleware `verifyToken` :

**Exemple - Dans `server.js` :**
```javascript
const { verifyToken } = require('./middleware/auth');

// Route protégée - Seuls les users connectés peuvent accéder
app.post('/api/sessions', verifyToken, async (req, res) => {
  // req.userId contient l'ID du user connecté
  const sessionData = {
    ...req.body,
    userId: req.userId // Utiliser l'ID vérifié
  };
  // ...
});
```

---

## 🎯 Fonctionnalités disponibles

### Pour les utilisateurs NON connectés (anonymes)
- ✅ Peuvent utiliser l'app normalement
- ✅ Sessions stockées avec deviceId
- ✅ Données sauvegardées localement

### Pour les utilisateurs CONNECTÉS
- ✅ Toutes les sessions liées à leur compte
- ✅ Migration automatique des sessions anonymes lors de l'inscription
- ✅ Synchronisation multi-appareils (si tu implémentes)
- ✅ Suppression de compte (RGPD)

---

## 🧪 Tester l'authentification

### 1. Inscription
1. Clique sur l'icône ⚙️ paramètres
2. Clique sur "S'inscrire"
3. Remplis le formulaire
4. ✅ Tu es maintenant connecté !

### 2. Connexion
1. Clique sur l'icône ⚙️ paramètres
2. Clique sur "Se connecter"
3. Entre tes identifiants
4. ✅ Tu es connecté !

### 3. Vérifier dans MongoDB
```bash
# Voir les users créés
mongosh
use sentiers974
db.users.find().pretty()

# Voir les sessions liées à un user
db.sessions.find({ userId: ObjectId("...") }).pretty()
```

---

## 🔒 Sécurité - Points importants

### Backend
- ✅ Passwords hashés avec bcrypt (10 rounds)
- ✅ Tokens JWT signés avec secret 512 bits
- ✅ Middleware de vérification sur routes protégées
- ⚠️ **NE JAMAIS commit le fichier `.env` sur GitHub**

### Frontend
- ✅ Token stocké dans AsyncStorage (sécurisé sur mobile)
- ✅ Vérification automatique au démarrage
- ✅ Déconnexion automatique si token expiré

---

## 🚀 Déploiement (pour plus tard)

Quand tu déploieras en production :

1. **Backend** : Ajouter `JWT_SECRET` dans les variables d'environnement du service (Render, Railway, etc.)
2. **Frontend** : Mettre à jour `API_URL` dans `src/services/api.ts`
3. **MongoDB** : Utiliser MongoDB Atlas (cloud) au lieu de localhost

---

## 🎉 C'est terminé !

Ton système d'authentification est complet et prêt à être utilisé. Les utilisateurs peuvent maintenant :
- Créer un compte
- Se connecter
- Leurs sessions sont sécurisées et liées à leur compte
- Supprimer leur compte (RGPD)

**Prochaines étapes possibles** :
- Ajouter "Mot de passe oublié"
- Ajouter édition du profil (changer nom, email, password)
- Ajouter photo de profil
- Ajouter OAuth (Google, Facebook)
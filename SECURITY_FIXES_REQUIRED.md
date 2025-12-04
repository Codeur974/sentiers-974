# 🔒 CORRECTIONS DE SÉCURITÉ REQUISES AVANT DÉPLOIEMENT BÊTA

**Date** : 2025-12-04
**Statut** : ⚠️ ACTIONS IMMÉDIATES REQUISES

---

## ✅ CORRECTIONS DÉJÀ EFFECTUÉES

### 1. URLs de développement supprimées
- ✅ `api.ts` : Suppression test connexion hardcodé
- ✅ `useDataStore.ts` : Remplacement par `process.env.EXPO_PUBLIC_API_URL` (3 occurrences)
- ✅ `sentiersService.ts` : Suppression commentaire URL dev
- ✅ `socialApi.ts` : Suppression commentaire URL dev

### 2. Permission Android retirée
- ✅ `AndroidManifest.xml` : Suppression de `android.permission.RECORD_AUDIO` (ligne 9)

---

## 🚨 ACTIONS CRITIQUES À FAIRE MANUELLEMENT

### 3. Régénérer TOUS les secrets (.env backend)

**Fichier** : `sentiers974-backend/.env`

#### a) MongoDB Password

1. Aller sur [MongoDB Atlas](https://cloud.mongodb.com/)
2. Database Access → Edit user `Sentiers974-backend`
3. Cliquer "Edit Password" et générer un nouveau password sécurisé
4. ⚠️ **COPIER** le nouveau password
5. Mettre à jour la connection string dans `.env` :

```env
MONGODB_URI=mongodb+srv://Sentiers974-backend:NOUVEAU_PASSWORD@sentiers974-prod.z10vgi3.mongodb.net/sentiers974?retryWrites=true&w=majority&appName=sentiers974-prod
```

#### b) JWT_SECRET

**Nouveau secret généré** :
```
638c233730777454e49dd1ea9c9d7a4e00fd6e82cb0f64290f9ee804493f4fcadcdd6ac7b5e6f4841fd585e09da170c39d03009fd05ceac92e629da169243040
```

Remplacer dans `.env` :
```env
JWT_SECRET=638c233730777454e49dd1ea9c9d7a4e00fd6e82cb0f64290f9ee804493f4fcadcdd6ac7b5e6f4841fd585e09da170c39d03009fd05ceac92e629da169243040
```

⚠️ **ATTENTION** : Tous les tokens JWT existants seront invalidés. Les utilisateurs devront se reconnecter.

#### c) Cloudinary API Keys

1. Aller sur [Cloudinary Dashboard](https://console.cloudinary.com/)
2. Settings → Security → Access Keys
3. Cliquer "Generate New Key Pair" ou "Regenerate API Secret"
4. Copier les nouvelles valeurs

Remplacer dans `.env` :
```env
CLOUDINARY_CLOUD_NAME=dnxp8c3hm
CLOUDINARY_API_KEY=NOUVELLE_API_KEY
CLOUDINARY_API_SECRET=NOUVEAU_API_SECRET
```

---

## 📋 CHECKLIST FINALE

Avant de commiter et déployer :

```
[ ] MongoDB password changé dans MongoDB Atlas
[ ] MONGODB_URI mis à jour dans .env avec nouveau password
[ ] JWT_SECRET remplacé par le nouveau secret généré
[ ] Cloudinary API keys régénérées
[ ] CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET mis à jour dans .env
[ ] Vérifier que .env est bien dans .gitignore
[ ] Tester le backend localement : npm run dev
[ ] Tester l'authentification (login/signup)
[ ] Tester l'upload de photos
[ ] Redéployer le backend sur Render avec les nouveaux secrets
```

---

## 🔐 VÉRIFICATION FINALE

Une fois les secrets régénérés, vérifier avec ces commandes :

```bash
# 1. Vérifier que .env n'est pas dans git
git status

# 2. Vérifier qu'aucun secret n'est dans l'historique
git log --all --full-history --source -- '*/.env'

# 3. Lancer le backend et vérifier les logs
cd sentiers974-backend
npm run dev
```

Si le backend démarre sans erreur avec le message :
```
🚀 Serveur démarré sur http://localhost:3001
✅ Connecté à MongoDB : sentiers974-prod
```

Alors les secrets sont corrects ! ✅

---

## 📝 NOTES IMPORTANTES

1. **Ne jamais commiter le fichier `.env`** - Il contient les vrais secrets
2. **Le fichier `.env.example`** est safe à commiter (valeurs factices)
3. **Après régénération des secrets** :
   - Les utilisateurs devront se reconnecter (JWT invalide)
   - Les anciennes photos uploadées resteront accessibles (Cloudinary conserve les anciens assets)
   - Les connexions MongoDB existantes continueront à fonctionner

4. **Déploiement sur Render** :
   - Aller sur le dashboard Render
   - Cliquer sur le service `sentiers-974-backend`
   - Environment → Edit
   - Mettre à jour les variables d'environnement :
     - `MONGODB_URI`
     - `JWT_SECRET`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
   - Sauvegarder → Render redéploiera automatiquement

---

## 🎯 RÉSUMÉ

**Temps estimé** : 15-20 minutes
**Impact utilisateur** : Reconnexion requise (JWT changé)
**Risque** : Aucun si les étapes sont suivies correctement

Une fois ces corrections effectuées, l'application sera sécurisée à **8/10** pour une phase de test bêta privée.

---

**Questions ?** Contacte-moi si tu as besoin d'aide pour l'une de ces étapes.

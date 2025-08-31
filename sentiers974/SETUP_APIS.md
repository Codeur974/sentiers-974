# 📡 Guide de Configuration des APIs

## 1. OpenAgenda (GRATUIT) ⭐

### Étapes :
1. Aller sur [openagenda.com](https://openagenda.com)
2. Créer un compte gratuit
3. Aller dans "Développeurs" → "API Keys"
4. Copier votre clé API
5. L'ajouter dans le fichier `.env` :
```
EXPO_PUBLIC_OPENAGENDA_KEY=votre_cle_ici
```

### Avantages :
- ✅ API gratuite et fiable
- ✅ Nombreux événements sportifs français
- ✅ Données structurées
- ✅ Géolocalisation intégrée

---

## 2. Data.gouv.fr (GRATUIT)

### Utilisation :
- Aucune clé requise
- API publique française
- Données d'équipements sportifs

### Configuration :
```
# Aucune configuration nécessaire
```

---

## 3. Facebook Events API (OPTIONNEL)

### Étapes :
1. Créer une app Facebook Developer
2. Obtenir un Access Token
3. Ajouter dans `.env` :
```
EXPO_PUBLIC_FACEBOOK_ACCESS_TOKEN=votre_token
```

---

## 4. API Tourisme Réunion (À VÉRIFIER)

### Contact :
- Site : [reunion.fr](https://www.reunion.fr)
- Vérifier si une API publique existe
- Contacter leur équipe technique

---

## 5. Test des APIs

Pour tester les APIs connectées :

```bash
# Lancer l'app
npx expo start

# Vérifier les logs dans la console
# Vous verrez les messages :
# "OpenAgenda: X événements"
# "Tourism: X événements" 
# etc.
```

---

## 6. APIs Alternatives

Si certaines APIs ne fonctionnent pas :

### A. Eventbrite API
```
EXPO_PUBLIC_EVENTBRITE_KEY=votre_cle
```

### B. Meetup API  
```
EXPO_PUBLIC_MEETUP_KEY=votre_cle
```

### C. APIs locales
- Offices de tourisme
- Associations sportives
- Clubs locaux

---

## 7. Démarrage Rapide

Pour commencer immédiatement :

1. **Créer compte OpenAgenda** (5 min)
2. **Ajouter la clé dans .env**
3. **Relancer l'app**

Les autres APIs sont optionnelles !

---

## 8. Structure des Données

L'app détecte automatiquement :
- 🏃‍♀️ Type de sport (trail, course, etc.)
- 📅 Dates et heures  
- 📍 Lieux à La Réunion
- 🎯 Niveau de difficulté
- 💰 Tarifs
- 🌐 Sites web

---

## Support

En cas de problème :
1. Vérifier les logs console
2. Tester une API à la fois
3. Utiliser les événements de fallback
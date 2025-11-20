# 📡 Comportement Réseau - Sentiers 974

## Mode WiFi vs 5G

L'application Sentiers 974 utilise une **architecture hybride** qui s'adapte automatiquement selon la connectivité réseau.

### 🏠 Mode WiFi (Réseau Local)

Quand tu es connecté au **même WiFi** que ton ordinateur :

- ✅ **Backend accessible** : `http://192.168.1.17:3001`
- ✅ **Sync MongoDB** : Sessions, POI, sentiers synchronisés en temps réel
- ✅ **Photos uploadées** : Sauvegardées sur le serveur
- ✅ **Posts sociaux** : Synchronisés avec la base

**Avantages** :
- Données toujours à jour
- Backup automatique sur MongoDB
- Partage entre appareils possible

### 📱 Mode 5G / Données Mobiles

Quand tu passes en **5G ou données mobiles** :

- ❌ **Backend inaccessible** : `192.168.1.17` est une IP locale
- ✅ **Fallback automatique** : L'app passe en mode local (AsyncStorage)
- ✅ **Tracking GPS fonctionne** : Tout est sauvegardé localement
- ✅ **Photos sauvegardées** : Stockées sur le téléphone
- ⚠️ **Sync différée** : Les données seront synchronisées au retour sur WiFi

**Comportement** :
1. L'app essaye MongoDB (timeout 3-5s)
2. Si échec → fallback automatique sur AsyncStorage
3. **Pas de freeze** grâce aux timeouts courts

### 🔄 Passage WiFi ↔ 5G

#### ✅ Comportement CORRECT (après optimisations)

```
WiFi → 5G :
  1. Fetch MongoDB timeout après 3-5s ⏱️
  2. Fallback AsyncStorage immédiat ✅
  3. Tracking continue normalement 🏃
  4. App reste fluide 💨

5G → WiFi :
  1. Prochaine ouverture app sync automatique 🔄
  2. Données locales uploadées sur MongoDB ⬆️
  3. Récupération sentiers/posts/POI ⬇️
```

#### ❌ Comportement AVANT (problèmes)

```
WiFi → 5G :
  1. Fetch MongoDB timeout après 30s !!! 😱
  2. App figée pendant 30s ❄️
  3. Boucle de logs infinie 📜
  4. Possible crash ☠️
```

## ⚙️ Configuration Timeouts

| Service | Timeout | Justification |
|---------|---------|---------------|
| POI | 3s | Données fréquentes, fallback local |
| Sentiers | 5s | Base volumineuse (1146 sentiers) |
| Sessions | 2s | Tracking temps réel, critique |
| Posts sociaux | 3s | Fallback local possible |

## 🛠️ Développement

### Tester le comportement réseau

**Simuler passage WiFi → 5G** :
1. Lance le tracking en WiFi
2. Désactive WiFi sur le téléphone
3. L'app doit continuer sans freeze (max 5s de latence)

**Simuler perte réseau totale** :
1. Active mode Avion
2. Lance le tracking
3. Tout doit fonctionner en mode local

### Fichiers critiques

- `src/utils/fetchWithTimeout.ts` - Gestion timeouts réseau
- `src/hooks/tracking/useSessionPersistence.ts` - Dual persistence
- `src/hooks/usePointsOfInterest.ts` - Fallback POI
- `src/services/sentiersService.ts` - Fallback sentiers

## 🐛 Debugging

Si l'app freeze lors du changement de réseau :

1. **Check les logs** :
   ```
   LOG  ⚠️ MongoDB non disponible, continue en local
   ```

2. **Vérifier timeouts** :
   - Aucun timeout > 5s dans le code
   - Tous les fetch() utilisent AbortController

3. **Vérifier fallback** :
   - AsyncStorage contient bien les données
   - Pas de dépendance stricte à MongoDB

## 📊 Statistiques

**Réduction freeze** :
- Avant : 30s de blocage en 5G
- Après : <5s de latence, puis fluide

**Logs réduits** :
- Avant : 5-8 logs/seconde
- Après : 1-2 logs/10-20s

## 🚀 Améliorations Futures

- [ ] Détection automatique réseau local vs distant
- [ ] Queue de sync pour upload différé en 5G
- [ ] Indicateur visuel "Mode local" dans l'UI
- [ ] Option "Mode offline" forcé
- [ ] Sync intelligente en background (WiFi seulement)

---

**Dernière mise à jour** : 2025-01-19
**Version app** : 1.0.0

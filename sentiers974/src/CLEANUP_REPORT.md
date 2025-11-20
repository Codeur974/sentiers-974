# 🧹 Rapport de nettoyage codebase

## 🔴 Fichiers obsolètes à supprimer

### 1. usePointsOfInterest.ts (OBSOLÈTE)
- **Fichier**: `src/hooks/usePointsOfInterest.ts`
- **Raison**: Remplacé par `usePOIs` dans Zustand store
- **Action**: ✅ Peut être supprimé (aucun import restant)

### 2. Backups temporaires
```
src/store/useDataStore.ts.backup
src/store/useDataStore.ts.before-all-methods
src/store/useDataStore.ts.before-async
src/store/useDataStore.ts.old
src/hooks/useTrackingLogic.backup.ts
```
- **Action**: ✅ Peuvent être supprimés

## ⚠️ Exports inutilisés (barrel exports)

### hooks/index.ts
Ces exports ne sont jamais importés ailleurs:
- `useTrackingLogic`
- `useHomeLocation`
- `usePOIs`
- `useActivity`

**Note**: Ce sont des barrel exports pour faciliter les imports futurs. Pas critique.

## 🔧 Services inutilisés

### eventsApi.ts
- **Export**: `eventsApi` (ligne 354)
- **Status**: Jamais importé
- **Action**: ⚠️ Vérifier si fonctionnalité événements utilisée

### liveCacheService.ts
- **Export**: `liveCacheService` (ligne 118)
- **Status**: Jamais importé
- **Action**: ⚠️ Vérifier utilité

### stravaApi.ts
- **Export**: `stravaApi` (ligne 306)
- **Status**: Jamais importé
- **Action**: ⚠️ Vérifier si intégration Strava active

## 📊 Stores Zustand

### Stores avec exports inutilisés
Tous les helper hooks des stores ne sont pas utilisés:

**useAppStore**:
- `useAppStatus`
- `useAppPreferences`
- `useAppNavigation`
- `useAppPermissions`
- `useAppErrors`
- `useAppPerformance`

**useDataStore**:
- `useActivities`
- `useDataCache`

**useUIStore**:
- `useModals`
- `useSections`
- `useLoadingStates`
- `useErrorStates`

**Note**: Ces helpers sont optionnels. L'accès direct au store fonctionne aussi.

## 🎯 Actions recommandées

### Priorité 1 - Nettoyage immédiat
```bash
# Supprimer fichier obsolète
rm src/hooks/usePointsOfInterest.ts

# Supprimer backups
rm src/store/useDataStore.ts.backup
rm src/store/useDataStore.ts.before-all-methods
rm src/store/useDataStore.ts.before-async
rm src/store/useDataStore.ts.old
rm src/hooks/useTrackingLogic.backup.ts
```

### Priorité 2 - Vérification fonctionnalités
- [ ] Vérifier si événements Strava utilisés (`eventsApi`, `stravaApi`)
- [ ] Vérifier si cache live utilisé (`liveCacheService`)

### Priorité 3 - Optimisation (optionnel)
- [ ] Supprimer helper hooks Zustand non utilisés
- [ ] Nettoyer types API inutilisés

## ✅ État actuel
- **Fichiers sources**: 94
- **Imports migrés**: 8/8 (usePointsOfInterest → usePOIs)
- **Fichiers obsolètes**: 6 (backups + usePointsOfInterest)
- **Impact**: Faible, juste du code mort

---
**Date**: 2025-11-19
**Outil**: ts-prune

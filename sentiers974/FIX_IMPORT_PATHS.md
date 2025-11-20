# 🔧 Fix import paths

## Problème
```
Unable to resolve "../store/useDataStore" from "src\components\tracking\TrackingFooter.tsx"
```

## Cause
Le script de remplacement automatique a mis `../store/useDataStore` au lieu de `../../store/useDataStore` pour les fichiers dans `components/tracking/`.

## Solution appliquée
```bash
# Corrigé dans 2 fichiers:
components/tracking/TrackingFooter.tsx: ../store → ../../store
components/tracking/PhotosSection.tsx: ../store → ../../store
```

## Vérification finale
Tous les imports sont maintenant corrects:
- ✅ `components/tracking/**` → `../../store/useDataStore`
- ✅ `hooks/tracking/**` → `../../store/useDataStore`
- ✅ `hooks/index.ts` → `../store/useDataStore`

## Status
✅ L'app devrait compiler maintenant

# sentiers974 — Frontend (Expo / React Native)

Application mobile Expo basée sur React Native, React Navigation, NativeWind (Tailwind) et Zustand.

## Pré-requis
- Node.js (version LTS recommandée) et npm.
- Android Studio (Android) et/ou Xcode (iOS) si vous lancez sur émulateur/appareil.
- Optionnel: Expo CLI via `npx expo`.

## Installation
1. Cloner le dépôt.
2. Installer les dépendances:
   - `npm install`

## Scripts
- Démarrage:
  - `npm run start` — démarre Expo (Metro)
  - `npm run android` — lance sur Android
  - `npm run ios` — lance sur iOS
  - `npm run web` — lance en mode web
- Qualité:
  - `npm run typecheck` — vérifie les types TypeScript (sans émettre)
  - `npm run lint` — exécute ESLint
  - `npm run lint:fix` — corrige automatiquement avec ESLint
  - `npm run format:check` — vérifie le formatage Prettier
  - `npm run format` — applique le formatage Prettier

## Qualité
- TypeScript: exécuter `npm run typecheck` pour détecter les erreurs de typage.
- ESLint:
  - `npm run lint` pour l’analyse statique.
  - `npm run lint:fix` pour corriger automatiquement les problèmes simples.
- Prettier:
  - `npm run format:check` pour valider le formatage.
  - `npm run format` pour formater le code.
Note: l’exécution de `lint`/`format` suppose qu’ESLint/Prettier sont installés et configurés dans le projet.

## Dépannage
- Expo: `npx expo start -c` pour nettoyer le cache en cas de comportements étranges.
- Dépendances: supprimer `node_modules` et relancer `npm install` si nécessaire.
- Android: vérifier qu’un émulateur est démarré ou qu’un appareil est connecté (ADB).
- iOS: ouvrir un simulateur via Xcode si la commande `ios` ne l’ouvre pas.


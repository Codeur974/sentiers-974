# Instructions Claude Code pour Sentiers 974

## 🚨 RÈGLE CRITIQUE N°1 - NE JAMAIS CASSER UN COMPOSANT QUI FONCTIONNE

**C'EST LA RÈGLE LA PLUS IMPORTANTE DU PROJET.**

Avant toute modification d'un composant existant, tu DOIS :

1. **Lire le code en entier** pour comprendre son fonctionnement
2. **Identifier ce qui fonctionne** déjà et ne JAMAIS le toucher
3. **Isoler le problème** exact à corriger
4. **Faire une correction chirurgicale** : modifier UNIQUEMENT la partie problématique
5. **Tester** que les fonctionnalités existantes marchent toujours

### ❌ INTERDIT :

- Réécrire un composant entier pour corriger un petit bug
- Supprimer du code sans comprendre son rôle
- Modifier la logique qui fonctionne pour en corriger une autre
- Changer les props/interfaces sans vérifier l'impact partout
- Refactoriser "pour améliorer" un composant qui fonctionne déjà

### ✅ OBLIGATOIRE :

- **Corrections ciblées** : toucher uniquement les lignes problématiques
- **Ajouts non-intrusifs** : ajouter sans modifier l'existant
- **Isolation** : créer un nouveau composant plutôt que casser l'ancien
- **Commits atomiques** : 1 problème = 1 commit
- **Demander confirmation** avant un changement majeur

### Principe : "Si ça marche, ne le touche pas !"

---

## Stack Technique

- **Framework** : React Native 0.81.4 avec Expo ~54.0.0
- **Langage** : TypeScript 5.8.3 (strict mode)
- **Styling** : NativeWind 4.x (Tailwind CSS)
- **Navigation** : React Navigation 7.x
- **State** : Zustand 5.x
- **Storage** : AsyncStorage + SecureStore
- **Maps** : react-native-maps
- **Location** : expo-location avec tracking background
- **HTTP** : Axios

## Structure du Projet

```
src/
├── App.tsx                 # Point d'entrée
├── components/             # Composants réutilisables
│   ├── events/            # Événements
│   ├── map/               # Cartes
│   ├── modals/            # Modales
│   ├── sentiers/          # Sentiers
│   ├── social/            # Social (posts, feed)
│   ├── tracking/          # Tracking GPS
│   └── ui/                # UI génériques
├── data/                  # Données statiques
├── hooks/                 # Custom hooks
├── screens/               # Écrans
├── services/              # API et logique métier
├── store/                 # Stores Zustand
├── types/                 # Types TypeScript
└── utils/                 # Utilitaires
```

## Conventions TypeScript

- **TOUJOURS** utiliser strict mode
- **TOUJOURS** typer les props des composants (interfaces)
- **TOUJOURS** typer les retours de fonctions complexes
- **JAMAIS** utiliser `any` (utiliser `unknown` si nécessaire)
- Utiliser `React.FC<Props>` pour les composants

```typescript
// ✅ BON
interface UserCardProps {
  user: User;
  onPress: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onPress }) => {
  // ...
};
```

## Styling avec NativeWind

- **TOUJOURS** utiliser NativeWind (classes Tailwind)
- Utiliser `className` au lieu de `style`
- Éviter StyleSheet sauf cas spécifiques

```typescript
// ✅ BON
<View className="flex-1 bg-white p-4">
  <Text className={`text-lg ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
    Titre
  </Text>
</View>
```

## Navigation

- Typer strictement les paramètres de navigation
- Définir les types dans `src/types/navigation.ts`

## State Management (Zustand)

- Un store par domaine fonctionnel
- Toujours typer les stores
- Utiliser des sélecteurs pour optimiser les re-renders
- Persister les données importantes

```typescript
interface TrackingState {
  isTracking: boolean;
  startTracking: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  isTracking: false,
  startTracking: () => set({ isTracking: true }),
}));

// Utilisation
const isTracking = useTrackingStore((state) => state.isTracking);
```

## Hooks Personnalisés

- Préfixer TOUS les hooks avec `use`
- Placer dans `src/hooks/`
- Exporter depuis `src/hooks/index.ts`

## Ordre des Imports

1. React et React Native
2. Bibliothèques tierces
3. Composants locaux
4. Hooks personnalisés
5. Types
6. Utils et constantes

```typescript
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Button } from '@/components/ui';
import { useGeolocation } from '@/hooks';
import type { Trail } from '@/types';
import { formatDistance } from '@/utils';
```

## Performance

- Utiliser `React.memo` pour composants qui re-render souvent
- Utiliser `useCallback` pour fonctions passées en props
- Utiliser `useMemo` pour calculs coûteux
- Optimiser les listes avec `FlatList` et `keyExtractor`

## Gestion des Erreurs

- **TOUJOURS** encapsuler les appels API dans try/catch
- Afficher des messages d'erreur clairs
- Logger pour debugging
- Gérer les permissions refusées

```typescript
try {
  const response = await axios.get('/api/trails');
  setTrails(response.data);
} catch (error) {
  console.error('Erreur chargement sentiers:', error);
  Alert.alert('Erreur', 'Impossible de charger les sentiers');
}
```

## Nommage

- **Composants** : PascalCase (`TrailCard`)
- **Fichiers composants** : PascalCase (`TrailCard.tsx`)
- **Hooks** : camelCase + use (`useGeolocation`)
- **Utils** : camelCase (`formatDistance`)
- **Types** : PascalCase (`Trail`, `User`)
- **Constantes** : UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Variables** : camelCase (`currentLocation`)

## Spécificités Projet

### Géolocalisation & Tracking
- Toujours demander permissions avant accès location
- Utiliser expo-location pour tracking
- Gérer tracking background avec expo-task-manager
- Optimiser fréquence GPS pour batterie
- Stocker sessions dans AsyncStorage

### Photos & Médias
- Utiliser expo-image-picker
- Sélection multiple de photos
- Compresser images avant upload
- Gérer permissions caméra/galerie

### Composants Tracking
- `TrackingHeader` pour en-tête
- `TrackingFooter` pour footer navigation
- `TrackingStats` pour statistiques
- `PhotosSection` pour photos

### Navigation & Modales
- Utiliser `FooterNavigation` pour navigation cohérente
- Centraliser modales complexes dans `src/components/modals/`
- Gérer état ouverture/fermeture avec Zustand ou state local

### Social & Posts
- `CreatePostModal` pour créer posts
- `SocialFeed` pour afficher feed
- `SocialPostCard` pour cartes de post
- Gérer photos multiples

## Git et Commits

**Toujours en français** avec préfixes :
- `feat:` nouvelles fonctionnalités
- `fix:` corrections bugs
- `refactor:` refactoring
- `style:` changements style
- `docs:` documentation
- `perf:` optimisations performance

## ⚠️ Points d'Attention

- **TOUJOURS** tester géolocalisation sur appareil réel
- **TOUJOURS** gérer permissions explicitement
- **TOUJOURS** optimiser images et médias
- **TOUJOURS** tester sur appareils bas de gamme
- **TOUJOURS** gérer états chargement et erreur
- **TOUJOURS** prévoir mode offline

## Communication

- Proposer avant d'agir sur gros changements
- Expliquer les modifications apportées
- Signaler les impacts potentiels
- Demander confirmation si doute

---

**Rappel final** : La règle n°1 est SACRÉE. Ne jamais casser ce qui fonctionne ! 🚨

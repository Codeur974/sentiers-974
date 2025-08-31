/**
 * Classification des sports pour adaptation des métriques
 */

export const SPORT_TYPES = {
  FOOT: 'foot', // Sports à pied
  BIKE: 'bike', // Sports à vélo
  WATER: 'water', // Sports aquatiques
  CLIMB: 'climb' // Escalade
} as const;

export type SportType = typeof SPORT_TYPES[keyof typeof SPORT_TYPES];

/**
 * Détermine le type de sport selon son nom
 */
export const getSportType = (sportName: string): SportType => {
  const sportLower = sportName.toLowerCase();
  
  if (sportLower.includes('vtt') || sportLower.includes('vélo') || sportLower.includes('cyclisme')) {
    return SPORT_TYPES.BIKE;
  }
  
  if (sportLower.includes('natation') || sportLower.includes('surf') || 
      sportLower.includes('sup') || sportLower.includes('kayak')) {
    return SPORT_TYPES.WATER;
  }
  
  if (sportLower.includes('escalade') || sportLower.includes('grimpe')) {
    return SPORT_TYPES.CLIMB;
  }
  
  // Par défaut : sports à pied (Marche, Course, Trail, Randonnée)
  return SPORT_TYPES.FOOT;
};

/**
 * Configuration des métriques par type de sport
 */
export const getSportMetrics = (sportType: SportType) => {
  switch (sportType) {
    case SPORT_TYPES.BIKE:
      return {
        primary: { icon: '🔥', label: 'Calories', key: 'calories' },
        secondary: { icon: '⚡', label: 'Vitesse Max', key: 'maxSpeed' },
        tertiary: { icon: '💨', label: 'Vitesse', key: 'instantSpeed' },
        hideSteps: true, // Pas de "pas" pour le vélo
        speedRange: { min: 5, normal: 25, max: 50 }, // Plages de vitesse vélo
        caloriesMultiplier: 0.6 // Moins de calories/km qu'à pied
      };
      
    case SPORT_TYPES.WATER:
      return {
        primary: { icon: '🔥', label: 'Calories', key: 'calories' },
        secondary: { icon: '🏊', label: 'Brasses', key: 'strokes' },
        tertiary: { icon: '⚡', label: 'Vitesse', key: 'instantSpeed' },
        hideSteps: true,
        speedRange: { min: 1, normal: 3, max: 8 },
        caloriesMultiplier: 1.2
      };
      
    case SPORT_TYPES.CLIMB:
      return {
        primary: { icon: '🔥', label: 'Calories', key: 'calories' },
        secondary: { icon: '📏', label: 'Dénivelé', key: 'elevation' },
        tertiary: { icon: '⚡', label: 'Vitesse', key: 'instantSpeed' },
        hideSteps: true,
        speedRange: { min: 0.1, normal: 2, max: 5 },
        caloriesMultiplier: 1.5
      };
      
    case SPORT_TYPES.FOOT:
    default:
      return {
        primary: { icon: '🔥', label: 'Calories', key: 'calories' },
        secondary: { icon: '👣', label: 'Pas', key: 'steps' },
        tertiary: { icon: '⚡', label: 'Vitesse', key: 'instantSpeed' },
        hideSteps: false, // Garder les pas pour sports à pied
        speedRange: { min: 1, normal: 6, max: 20 },
        caloriesMultiplier: 1.0 // Base de référence
      };
  }
};
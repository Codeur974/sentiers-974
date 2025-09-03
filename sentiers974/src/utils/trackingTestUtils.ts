// Utilitaires pour tester et déboguer le système de tracking

export interface TestGPSPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  altitude?: number;
}

// Points GPS simulés pour La Réunion (parcours test réaliste)
export const generateTestRoute = (sport: string = 'Course'): TestGPSPoint[] => {
  // Point de départ : Saint-Denis centre
  const startLat = -20.8789;
  const startLng = 55.4481;
  const startTime = Date.now();
  
  const points: TestGPSPoint[] = [];
  
  // Configuration selon le sport
  const configs = {
    'Course': { speed: 12, accuracy: 8, interval: 2000 }, // 12 km/h, précision 8m, toutes les 2s
    'Marche': { speed: 5, accuracy: 10, interval: 3000 },  // 5 km/h, précision 10m, toutes les 3s
    'VTT': { speed: 25, accuracy: 15, interval: 1500 },    // 25 km/h, précision 15m, toutes les 1.5s
    'Vélo': { speed: 30, accuracy: 12, interval: 2000 },   // 30 km/h, précision 12m, toutes les 2s
  };
  
  const config = configs[sport as keyof typeof configs] || configs.Course;
  
  // Générer un parcours de 2km avec virages réalistes
  const totalDistance = 2; // km
  const totalPoints = Math.floor((totalDistance * 1000) / (config.speed * config.interval / 3600));
  
  for (let i = 0; i <= totalPoints; i++) {
    const progress = i / totalPoints;
    
    // Parcours avec quelques virages pour simuler un vrai trajet
    let lat = startLat;
    let lng = startLng;
    
    if (progress < 0.3) {
      // Premier segment : vers le nord
      lat = startLat + progress * 0.01;
      lng = startLng + progress * 0.002;
    } else if (progress < 0.7) {
      // Deuxième segment : virage vers l'est
      const subProgress = (progress - 0.3) / 0.4;
      lat = startLat + 0.003 + subProgress * 0.005;
      lng = startLng + 0.0006 + subProgress * 0.012;
    } else {
      // Troisième segment : retour vers le sud
      const subProgress = (progress - 0.7) / 0.3;
      lat = startLat + 0.008 - subProgress * 0.006;
      lng = startLng + 0.0126 + subProgress * 0.003;
    }
    
    // Ajouter un peu de variation GPS réaliste
    const noise = 0.00001; // ~1 mètre de bruit
    lat += (Math.random() - 0.5) * noise;
    lng += (Math.random() - 0.5) * noise;
    
    // Variation de précision GPS réaliste
    const accuracyVariation = config.accuracy + (Math.random() - 0.5) * 10;
    const accuracy = Math.max(5, Math.min(50, accuracyVariation));
    
    points.push({
      latitude: lat,
      longitude: lng,
      accuracy: accuracy,
      timestamp: startTime + i * config.interval,
      altitude: 50 + Math.sin(progress * Math.PI * 2) * 20 // Simulation dénivelé
    });
  }
  
  return points;
};

// Calculer la distance théorique d'un parcours test
export const calculateTestRouteDistance = (points: TestGPSPoint[]): number => {
  let totalDistance = 0;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    const R = 6371.008;
    const lat1 = (prev.latitude * Math.PI) / 180;
    const lat2 = (curr.latitude * Math.PI) / 180;
    const deltaLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
    const deltaLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    totalDistance += distance;
  }
  
  return totalDistance;
};

// Analyser les performances du tracking
export const analyzeTrackingAccuracy = (
  testRoute: TestGPSPoint[],
  trackedDistance: number,
  trackedPoints: number
) => {
  const theoreticalDistance = calculateTestRouteDistance(testRoute);
  const distanceError = Math.abs(trackedDistance - theoreticalDistance);
  const distanceAccuracy = ((theoreticalDistance - distanceError) / theoreticalDistance) * 100;
  
  const expectedPoints = testRoute.length;
  const pointsEfficiency = (trackedPoints / expectedPoints) * 100;
  
  return {
    theoretical: {
      distance: theoreticalDistance,
      points: expectedPoints,
      duration: testRoute[testRoute.length - 1].timestamp - testRoute[0].timestamp
    },
    tracked: {
      distance: trackedDistance,
      points: trackedPoints
    },
    accuracy: {
      distance: distanceAccuracy,
      distanceError: distanceError * 1000, // en mètres
      pointsEfficiency: pointsEfficiency
    },
    verdict: distanceAccuracy > 95 ? 'Excellent' : 
             distanceAccuracy > 90 ? 'Bon' : 
             distanceAccuracy > 80 ? 'Correct' : 'À améliorer'
  };
};

// Logger pour déboguer le tracking
export const trackingLogger = {
  logGPSUpdate: (coords: any, config: any) => {
    console.log(`📡 GPS: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)} (±${coords.accuracy?.toFixed(1)}m)`);
  },
  
  logDistanceUpdate: (distance: number, speed: number, isAccepted: boolean) => {
    const status = isAccepted ? '✅' : '❌';
    console.log(`${status} Distance: +${(distance * 1000).toFixed(1)}m | Vitesse: ${speed.toFixed(1)} km/h`);
  },
  
  logFilterResult: (filters: any) => {
    const { isAccurate, isReasonableDistance, isValidTiming, isNotGPSJump } = filters;
    console.log(`🔍 Filtres: Précision:${isAccurate} | Distance:${isReasonableDistance} | Temps:${isValidTiming} | Saut:${isNotGPSJump}`);
  }
};
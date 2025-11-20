import { useRef, useState, useEffect } from 'react';

/**
 * Hook pour calculer distance et vitesse
 * Approche Strava : accepter tous points GPS + filtrage intelligent
 */
export const useDistanceCalculator = (coords: any, sportConfig: any, status: string) => {
  const [distance, setDistance] = useState(0);
  const [instantSpeed, setInstantSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [trackingPath, setTrackingPath] = useState<Array<{latitude: number; longitude: number}>>([]);

  // Gérer lastCoords en interne (useRef = pas de re-render)
  const lastCoords = useRef<any>(null);
  const lastGpsSpeed = useRef<number>(0);
  const lastGpsUpdateTime = useRef<number>(Date.now());
  const speedBuffer = useRef<number[]>([]); // Buffer pour moyenne mobile
  const lowSpeedDurationMs = useRef<number>(0);
  const recentMovementWindow = useRef<Array<{ time: number; distance: number }>>([]);

  // Filtre Kalman simple
  const kalmanLat = useRef<number | null>(null);
  const kalmanLon = useRef<number | null>(null);
  const kalmanVariance = useRef<number>(0.01);

  // Filtre Kalman simplifié
  const applyKalmanFilter = (lat: number, lon: number, accuracy: number) => {
    if (kalmanLat.current === null || kalmanLon.current === null) {
      kalmanLat.current = lat;
      kalmanLon.current = lon;
      return { latitude: lat, longitude: lon };
    }

    // Gain de Kalman (plus l'accuracy est bonne, plus on fait confiance à la mesure)
    const measurementVariance = accuracy * accuracy / 1000000; // Convertir en degrés²
    const kalmanGain = kalmanVariance.current / (kalmanVariance.current + measurementVariance);

    // Mise à jour
    kalmanLat.current = kalmanLat.current + kalmanGain * (lat - kalmanLat.current);
    kalmanLon.current = kalmanLon.current + kalmanGain * (lon - kalmanLon.current);
    kalmanVariance.current = (1 - kalmanGain) * kalmanVariance.current;

    return { latitude: kalmanLat.current, longitude: kalmanLon.current };
  };

  // Calcul de distance Haversine optimisé
  const calculateDistance = (coord1: any, coord2: any): number => {
    const R = 6371.008; // Rayon terrestre en km

    const lat1 = (coord1.latitude * Math.PI) / 180;
    const lat2 = (coord2.latitude * Math.PI) / 180;
    const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    return dist;
  };

  // Calcul distance et vitesse - Approche Strava
  useEffect(() => {
    if (!coords || status !== 'running') {
      // Si on passe en pause/stop, mettre à jour lastCoords pour éviter timeDiff énorme à la reprise
      if (coords && status !== 'running' && lastCoords.current) {
        lastCoords.current = { ...coords };
      }
      return;
    }

    // Si pas de lastCoords, initialiser et attendre le prochain cycle
    if (!lastCoords.current) {
      lastCoords.current = { ...coords };
      return;
    }

    // Si même timestamp, skip (évite double calcul)
    if (coords.timestamp === lastCoords.current.timestamp) {
      return;
    }

    const timeDiff = (coords.timestamp - lastCoords.current.timestamp) / 1000;

    const now = Date.now();
    recentMovementWindow.current = recentMovementWindow.current.filter(
      (entry) => now - entry.time <= 10000
    );

    // Validation temps
    if (!Number.isFinite(timeDiff) || timeDiff <= 0) {
      lastGpsUpdateTime.current = Date.now();
      return;
    }

    // Toujours mettre à jour le timestamp GPS
    lastGpsUpdateTime.current = Date.now();

    // Filtrer uniquement GPS cassé (>100m = signal vraiment pourri)
    const accuracyThreshold = sportConfig?.accuracyThreshold || 100;
    if (coords.accuracy && coords.accuracy > accuracyThreshold) {
      lastCoords.current = { ...coords };
      return;
    }

    // Calculer distance avec coordonnées GPS brutes (pas de Kalman - approche Strava)
    const lastPoint = { latitude: lastCoords.current.latitude, longitude: lastCoords.current.longitude };
    const newPoint = { latitude: coords.latitude, longitude: coords.longitude };
    const newDist = calculateDistance(lastPoint, newPoint);
    const distanceMeters = newDist * 1000;

    // Rejeter téléportations (adapté à la précision GPS)
    // Si GPS imprécis (>50m), tolérer plus de variations
    const teleportThreshold = coords.accuracy > 50
      ? 50  // GPS moyen : tolérer 50m de saut
      : 20; // GPS bon : strict à 20m

    const maxDistPerSecond = teleportThreshold / 1000; // convertir en km
    if (newDist > maxDistPerSecond * Math.max(timeDiff, 1)) {
      lastCoords.current = { ...coords };
      return;
    }

    // Calculer vitesse GPS native (utilisée pour filtres ET calculs)
    const hasNativeSpeed = coords.speed !== null && coords.speed !== undefined && coords.speed >= 0;
    const gpsSpeedKmh = hasNativeSpeed ? coords.speed * 3.6 : null;

    // Filtrer les micro-déplacements quand on est probablement à l'arrêt
    const baseMinDistanceMeters = (sportConfig?.minDistance ?? 0.005) * 1000; // minDistance en km -> m
    const adaptiveMinMovement = Math.max(
      baseMinDistanceMeters,
      Math.max((coords.accuracy ?? 20) - 5, 0) * 0.6
    );

    // Utiliser vitesse GPS native pour éviter catch-22 (vitesse calculée=0 → points bloqués → vitesse reste 0)
    const isLikelyStopped = gpsSpeedKmh !== null ? gpsSpeedKmh < 0.5 : false;

    if (distanceMeters < adaptiveMinMovement && isLikelyStopped) {
      lowSpeedDurationMs.current += timeDiff * 1000;
      lastCoords.current = { ...coords };
      return;
    }

    // Accepter TOUS les points valides (approche Strava)
    if (newDist > 0) {
      setDistance((prev) => prev + newDist);

      // Ajouter au tracé (échantillonnage tous les 2m pour éviter surcharge)
      setTrackingPath((prev) => {
        if (prev.length > 0) {
          const lastTracked = prev[prev.length - 1];
          const distFromLast = calculateDistance(lastTracked, newPoint);
          if (distFromLast < 0.002) return prev; // Moins de 2m, skip
        }
        return [...prev, newPoint];
      });

      recentMovementWindow.current.push({ time: now, distance: newDist });
    }

    // Calcul vitesse - Style Strava : GPS natif direct avec lissage minimal
    const maxReasonableSpeed = (sportConfig?.maxSpeed || 35) * 2;

    // Utiliser vitesse GPS native si disponible (approche Strava)
    let rawSpeedKmh = 0;
    if (gpsSpeedKmh !== null && coords.accuracy && coords.accuracy < 50) {
      // GPS natif fiable (précision < 50m)
      rawSpeedKmh = gpsSpeedKmh;
    } else {
      // Pas de GPS natif ou imprécis → fallback sur distance/temps
      const pathSpeedKmh = Math.max((newDist / Math.max(timeDiff, 0.5)) * 3600, 0);
      rawSpeedKmh = pathSpeedKmh;
    }

    // Filtrer vitesses aberrantes
    if (rawSpeedKmh > maxReasonableSpeed) {
      rawSpeedKmh = 0;
    }

    // Seuil d'arrêt : < 0.5 km/h = 0
    if (rawSpeedKmh < 0.5) {
      rawSpeedKmh = 0;
    }

    // Lissage EMA équilibré (60% nouveau, 40% ancien - stabilité sans latence)
    const emaSpeed = lastGpsSpeed.current === 0
      ? rawSpeedKmh
      : 0.6 * rawSpeedKmh + 0.4 * lastGpsSpeed.current;

    // Coller à 0 après 3s sous 0.8 km/h
    const isLowSpeed = emaSpeed < 0.8;
    lowSpeedDurationMs.current = isLowSpeed
      ? lowSpeedDurationMs.current + timeDiff * 1000
      : 0;

    let finalSpeed = emaSpeed;
    if (lowSpeedDurationMs.current >= 3000) {
      finalSpeed = 0;
      lowSpeedDurationMs.current = 0;
    }

    // Arrondir à 0 si < 0.5
    if (finalSpeed < 0.5) {
      finalSpeed = 0;
    }

    setInstantSpeed(finalSpeed);
    lastGpsSpeed.current = finalSpeed;

    if (finalSpeed > 0.5) {
      setMaxSpeed(prev => Math.max(prev, finalSpeed));
    }

    // Sauvegarder coords comme lastCoords pour le prochain cycle
    lastCoords.current = { ...coords };

  }, [coords, status, sportConfig]);

  // Détection arrêt style Strava : sans GPS = vitesse 0
  useEffect(() => {
    if (status !== 'running') return;

    const stopDetection = setInterval(() => {
      const timeSinceLastGPS = Date.now() - lastGpsUpdateTime.current;

      // 6s sans GPS valide = forcer vitesse à 0
      if (timeSinceLastGPS > 6000 && instantSpeed > 0) {
        setInstantSpeed(0);
        lastGpsSpeed.current = 0;
        speedBuffer.current = [];
      }
    }, 1000); // Check toutes les 1s

    return () => clearInterval(stopDetection);
  }, [status, instantSpeed]);

  const reset = () => {
    setDistance(0);
    setInstantSpeed(0);
    setMaxSpeed(0);
    setSpeedHistory([]);
    setTrackingPath([]);
    lastCoords.current = null; // Reset lastCoords
    lastGpsSpeed.current = 0;
    lastGpsUpdateTime.current = Date.now();
    lowSpeedDurationMs.current = 0;
    speedBuffer.current = []; // Reset buffer vitesses
    recentMovementWindow.current = [];
    // Reset Kalman
    kalmanLat.current = null;
    kalmanLon.current = null;
    kalmanVariance.current = 0.01;
  };

  return {
    distance,
    instantSpeed,
    maxSpeed,
    trackingPath,
    reset,
  };
};

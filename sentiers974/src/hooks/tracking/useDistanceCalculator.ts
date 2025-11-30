import { useRef, useState, useEffect } from 'react';

/**
 * Hook pour calculer distance et vitesse
 * Approche Strava avec adaptatifs pour conditions GPS médiocres
 */
export const useDistanceCalculator = (coords: any, sportConfig: any, status: string) => {
  const [distance, setDistance] = useState(0);
  const [instantSpeed, setInstantSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [trackingPath, setTrackingPath] = useState<Array<{latitude: number; longitude: number; timestamp: number}>>([]);

  // Gestion interne
  const lastCoords = useRef<any>(null);
  const lastGpsSpeed = useRef<number>(0);
  const lastGpsUpdateTime = useRef<number>(Date.now());
  const lowSpeedDurationMs = useRef<number>(0);
  const recentMovementWindow = useRef<Array<{ time: number; distance: number }>>([]);
  const speedHistoryWindow = useRef<Array<number>>([]); // Fenêtre glissante courte
  const wasStoppedRecently = useRef<boolean>(false); // Détection reprise après pause

  const isCourse = sportConfig?.nom === 'Course';

  // Haversine
  const calculateDistance = (coord1: any, coord2: any): number => {
    const R = 6371.008; // km
    const lat1 = (coord1.latitude * Math.PI) / 180;
    const lat2 = (coord2.latitude * Math.PI) / 180;
    const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
    const a = Math.sin(deltaLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (!coords || status !== 'running') {
      if (coords && status !== 'running' && lastCoords.current) {
        lastCoords.current = { ...coords };
      }
      return;
    }

    // Initialisation
    if (!lastCoords.current) {
      lastCoords.current = { ...coords };
      setTrackingPath((prev) => prev.length === 0
        ? [{ latitude: coords.latitude, longitude: coords.longitude, timestamp: coords.timestamp }]
        : prev);
      return;
    }

    if (coords.timestamp === lastCoords.current.timestamp) {
      return;
    }

    const timeDiff = (coords.timestamp - lastCoords.current.timestamp) / 1000;
    const now = Date.now();
    recentMovementWindow.current = recentMovementWindow.current.filter(
      (entry) => now - entry.time <= 10000
    );

    if (!Number.isFinite(timeDiff) || timeDiff <= 0) {
      lastGpsUpdateTime.current = Date.now();
      return;
    }

    lastGpsUpdateTime.current = Date.now();

    // Accuracy : tolérance renforcée en phase d'accroche
    const baseAccuracyThreshold = sportConfig?.accuracyThreshold ?? 35;
    const isInitialPhase = trackingPath.length < 3 || distance < 0.05; // ~50m
    const accuracyThreshold = isCourse
      ? Math.max(baseAccuracyThreshold, 80) // Course : très permissif pour ne pas bloquer la vitesse
      : (isInitialPhase
          ? Math.max(baseAccuracyThreshold, 60)
          : Math.max(baseAccuracyThreshold, 50));
    const poorAccuracy = coords.accuracy && coords.accuracy > accuracyThreshold;
    if (poorAccuracy && !isCourse) {
      lastCoords.current = { ...coords };
      return;
    }

    // Distance et téléportations
    const lastPoint = { latitude: lastCoords.current.latitude, longitude: lastCoords.current.longitude };
    const newPoint = { latitude: coords.latitude, longitude: coords.longitude };
    const newDist = calculateDistance(lastPoint, newPoint); // km
    const distanceMeters = newDist * 1000;

    const teleportThreshold = isCourse
      ? (coords.accuracy > 50 ? 70 : 30) // Course : encore plus tolérant pour ne pas couper la vitesse
      : (coords.accuracy > 50 ? 50 : 20);
    const maxDistPerSecond = teleportThreshold / 1000;
    if (newDist > maxDistPerSecond * Math.max(timeDiff, 1)) {
      lastCoords.current = { ...coords };
      return;
    }

    // Vitesse native
    const hasNativeSpeed = coords.speed !== null && coords.speed !== undefined && coords.speed >= 0;
    const gpsSpeedKmh = hasNativeSpeed ? coords.speed * 3.6 : null;

    // minDistance adaptatif à l'accuracy
    const minDistanceMetersBase = (sportConfig?.minDistance ?? 0.002) * 1000; // km -> m
    let minDistanceMeters = minDistanceMetersBase;
    if (isCourse) {
      minDistanceMeters = 0.5; // Course : seuil bas (0.5m) pour capter toutes les variations
    } else {
      // Marche/Randonnée : seuil très bas (0.5m) pour capter tous les mouvements en ville
      if (coords.accuracy) {
        const adaptive = Math.min(2, Math.max(0.5, coords.accuracy / 40)); // e.g. acc 40m -> 1m
        minDistanceMeters = isInitialPhase
          ? Math.min(minDistanceMetersBase, adaptive)
          : Math.max(0.5, adaptive); // Minimum absolu 0.5m au lieu de 2m
      } else if (isInitialPhase) {
        minDistanceMeters = Math.min(minDistanceMetersBase, 0.5);
      }
    }

    const isLikelyStopped = gpsSpeedKmh !== null ? gpsSpeedKmh < 0.5 : false;
    // Si course et accuracy médiocre, autoriser quand même l'accumulation pour que le fallback soit crédible
    const shouldAddDistance = distanceMeters >= minDistanceMeters;

    if (newDist > 0 && shouldAddDistance) {
      setDistance((prev) => prev + newDist);
      setTrackingPath((prev) => {
        if (prev.length > 0) {
          const lastTracked = prev[prev.length - 1];
          const distFromLast = calculateDistance(lastTracked, newPoint);
          if (distFromLast < 0.002) return prev; // <2m
        }
        return [...prev, { ...newPoint, timestamp: coords.timestamp }];
      });
      recentMovementWindow.current.push({ time: now, distance: newDist });
    }

    // Détection reprise après pause : GPS indique mouvement mais lastGpsSpeed = 0
    const isResumingFromStop = (gpsSpeedKmh !== null && gpsSpeedKmh > 1.0 && lastGpsSpeed.current === 0) ||
                                (distanceMeters > 5 && instantSpeed === 0);

    if (isResumingFromStop && !wasStoppedRecently.current) {
      // Débloquer : initialiser fenêtre avec GPS natif pour éviter pic
      if (gpsSpeedKmh !== null && gpsSpeedKmh > 0.5) {
        speedHistoryWindow.current = [gpsSpeedKmh]; // Démarrer avec vitesse GPS réelle
      } else {
        speedHistoryWindow.current = [];
      }
      lowSpeedDurationMs.current = 0;
      wasStoppedRecently.current = true;
    } else if (!isResumingFromStop) {
      wasStoppedRecently.current = false;
    }

    // Calcul vitesse
    const maxReasonableSpeed = (sportConfig?.maxSpeed || 35) * 2;
    let rawSpeedKmh = 0;

    const fallbackSpeed = Math.max((newDist / Math.max(timeDiff, isCourse ? 0.2 : 0.5)) * 3600, 0);

    if (isCourse) {
      // Course : prendre le meilleur des deux (natif ou distance/temps) pour éviter un plafonnement bas
      const candidates = [];
      if (gpsSpeedKmh !== null) candidates.push(gpsSpeedKmh);
      candidates.push(fallbackSpeed);
      rawSpeedKmh = Math.max(...candidates);
    } else {
      if (gpsSpeedKmh !== null && coords.accuracy && coords.accuracy < 50) {
        rawSpeedKmh = gpsSpeedKmh;
      } else {
        rawSpeedKmh = fallbackSpeed;
      }
    }

    if (rawSpeedKmh > maxReasonableSpeed) {
      rawSpeedKmh = 0;
    }
    if (rawSpeedKmh < 0.5) {
      rawSpeedKmh = 0;
    }

    // Lissage adaptatif : Course = fenêtre 1, sinon accuracy >25m => 1, sinon 2
    const maxWindow = isCourse ? 1 : (coords.accuracy && coords.accuracy > 25 ? 1 : 2);
    speedHistoryWindow.current.push(rawSpeedKmh);
    while (speedHistoryWindow.current.length > maxWindow) {
      speedHistoryWindow.current.shift();
    }

    const sortedSpeeds = [...speedHistoryWindow.current].sort((a, b) => a - b);
    const medianSpeed = sortedSpeeds[Math.floor(sortedSpeeds.length / 2)];

    const alpha = 0.4;
    const emaSpeed = lastGpsSpeed.current === 0
      ? medianSpeed
      : alpha * medianSpeed + (1 - alpha) * lastGpsSpeed.current;

    const baseDisplaySpeed = Math.round(emaSpeed * 10) / 10;
    const displaySpeed = isCourse
      ? Math.round(rawSpeedKmh * 10) / 10 // Course : pas d'inertie, vitesse la plus réactive
      : baseDisplaySpeed;

    const isLowSpeed = displaySpeed < 0.5;
    if (isLowSpeed) {
      lowSpeedDurationMs.current += timeDiff * 1000;
    } else {
      lowSpeedDurationMs.current = 0;
    }

    let finalSpeed = displaySpeed;
    const lowSpeedClamp = isCourse ? 200 : 300; // Course plus réactif
    if (lowSpeedDurationMs.current >= lowSpeedClamp) {
      finalSpeed = 0;
      lowSpeedDurationMs.current = lowSpeedClamp;
    }
    if (finalSpeed < 0.5) {
      finalSpeed = 0;
    }

    setInstantSpeed(finalSpeed);
    lastGpsSpeed.current = isCourse ? finalSpeed : emaSpeed;
    if (finalSpeed > 0.5) {
      setMaxSpeed((prev) => Math.max(prev, finalSpeed));
    }

    lastCoords.current = { ...coords };

  }, [coords, status, sportConfig]);

  // Détection arrêt : sans GPS = vitesse 0
  useEffect(() => {
    if (status !== 'running') return;
    const stopDetection = setInterval(() => {
      const timeSinceLastGPS = Date.now() - lastGpsUpdateTime.current;
      if (timeSinceLastGPS > 6000 && instantSpeed > 0) {
        setInstantSpeed(0);
        lastGpsSpeed.current = 0;
      }
    }, 1000);
    return () => clearInterval(stopDetection);
  }, [status, instantSpeed]);

  const reset = () => {
    setDistance(0);
    setInstantSpeed(0);
    setMaxSpeed(0);
    setTrackingPath([]);
    lastCoords.current = null;
    lastGpsSpeed.current = 0;
    lastGpsUpdateTime.current = Date.now();
    lowSpeedDurationMs.current = 0;
    recentMovementWindow.current = [];
    speedHistoryWindow.current = [];
  };

  return {
    distance,
    instantSpeed,
    maxSpeed,
    trackingPath,
    reset,
  };
};

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

    // Accuracy : on ne rejette plus les points GPS même si accuracy faible
    // Les seuils de téléportation adaptatifs (4 niveaux) se chargent du filtrage
    const isInitialPhase = trackingPath.length < 3 || distance < 0.05; // ~50m

    // Distance et téléportations
    const lastPoint = { latitude: lastCoords.current.latitude, longitude: lastCoords.current.longitude };
    const newPoint = { latitude: coords.latitude, longitude: coords.longitude };
    const newDist = calculateDistance(lastPoint, newPoint); // km
    const distanceMeters = newDist * 1000;

    // Seuils adaptés par sport avec 4 niveaux d'accuracy GPS dynamiques
    const sportName = sportConfig?.nom || 'Marche';
    const sportThresholds: Record<string, { excellent: number; good: number; medium: number; poor: number }> = {
      'Course': { excellent: 20, good: 25, medium: 35, poor: 50 },      // Course
      'Trail': { excellent: 15, good: 20, medium: 30, poor: 40 },       // Trail
      'Marche': { excellent: 10, good: 12, medium: 20, poor: 30 },      // Marche
      'Randonnée': { excellent: 10, good: 12, medium: 20, poor: 30 },   // Randonnée
      'VTT': { excellent: 25, good: 30, medium: 45, poor: 60 },         // VTT
      'Vélo': { excellent: 25, good: 30, medium: 45, poor: 60 },        // Vélo
      'Escalade': { excellent: 6, good: 8, medium: 12, poor: 20 },      // Escalade
      'Natation': { excellent: 8, good: 10, medium: 15, poor: 25 },     // Natation
      'SUP': { excellent: 12, good: 15, medium: 25, poor: 35 },         // SUP
      'Surf': { excellent: 30, good: 40, medium: 60, poor: 80 },        // Surf
      'Kayak': { excellent: 15, good: 18, medium: 28, poor: 40 },       // Kayak
    };
    const thresholds = sportThresholds[sportName] || { excellent: 10, good: 12, medium: 20, poor: 30 };

    // Détection dynamique de la qualité GPS (4 niveaux)
    const accuracy = coords.accuracy || 999;
    const prevAccuracy = lastCoords.current?.accuracy;
    let teleportThreshold: number;
    if (accuracy < 15) {
      teleportThreshold = thresholds.excellent; // Excellent: plein air dégagé
    } else if (accuracy < 35) {
      teleportThreshold = thresholds.good;      // Bon: normal
    } else if (accuracy < 70) {
      teleportThreshold = thresholds.medium;    // Moyen: sous arbres, ville
    } else {
      teleportThreshold = thresholds.poor;      // Mauvais: forêt dense, montagne
    }

    const maxDistPerSecond = teleportThreshold / 1000;
    // Si l'accuracy s'améliore brutalement (ex: 60m -> 10m), rejeter le premier point "bon" s'il saute trop loin/rapide
    const accuracyJump = prevAccuracy && prevAccuracy > 50 && accuracy < 20;
    if (accuracyJump) {
      const jumpDistMeters = newDist * 1000;
      const jumpSpeedKmh = (newDist / Math.max(timeDiff, 1)) * 3600;
      if (jumpDistMeters > 10 && jumpSpeedKmh > 10) {
        console.log(`⚠️ Saut ignoré après amélioration d'accuracy: ${jumpDistMeters.toFixed(1)}m à ${jumpSpeedKmh.toFixed(1)} km/h`);
        lastCoords.current = { ...coords };
        return;
      }
    }
    if (newDist > maxDistPerSecond * Math.max(timeDiff, 1)) {
      console.log(`🚫 Saut GPS rejeté: ${(newDist * 1000).toFixed(1)}m en ${timeDiff.toFixed(1)}s = ${((newDist / timeDiff) * 3600).toFixed(1)} km/h`);
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
        // Si accuracy mauvaise (>50m), relever le seuil pour éviter les petits sauts au passage "bon"
        if (coords.accuracy > 50) {
          minDistanceMeters = Math.max(minDistanceMeters, Math.min(5, coords.accuracy / 10)); // ex: acc 60 -> 5m max
        }
      } else if (isInitialPhase) {
        minDistanceMeters = Math.min(minDistanceMetersBase, 0.5);
      }
    }

    const isLikelyStopped = gpsSpeedKmh !== null ? gpsSpeedKmh < 0.5 : false;
    // Si accuracy très mauvaise et distance minuscule + vitesse quasi nulle, ignorer ce point
    if (coords.accuracy && coords.accuracy > 50 && distanceMeters < 5 && (gpsSpeedKmh === null || gpsSpeedKmh < 0.5)) {
      lastCoords.current = { ...coords };
      return;
    }
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

    // Calcul vitesse avec plafond basé sur le saut de distance
    const maxReasonableSpeed = (sportConfig?.maxSpeed || 35) * 2;
    let rawSpeedKmh = 0;

    // Plafond de vitesse basé sur le seuil de téléportation (évite spikes quand accuracy change)
    const speedCeiling = (teleportThreshold / 1000) * 3.6; // m/s -> km/h
    const fallbackSpeed = Math.max((newDist / Math.max(timeDiff, isCourse ? 0.2 : 0.5)) * 3600, 0);

    // Plafonner le fallback speed au seuil de téléportation pour éviter les explosions
    const cappedFallbackSpeed = Math.min(fallbackSpeed, speedCeiling);

    if (isCourse) {
      // Course : prendre le meilleur des deux (natif ou distance/temps) pour éviter un plafonnement bas
      const candidates = [];
      if (gpsSpeedKmh !== null) candidates.push(gpsSpeedKmh);
      candidates.push(cappedFallbackSpeed);
      rawSpeedKmh = Math.max(...candidates);
    } else {
      if (gpsSpeedKmh !== null && coords.accuracy && coords.accuracy < 50) {
        rawSpeedKmh = gpsSpeedKmh;
      } else {
        rawSpeedKmh = cappedFallbackSpeed;
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

  const hydrate = (data: { distance?: number; trackingPath?: Array<{latitude: number; longitude: number; timestamp: number}>; maxSpeed?: number; }) => {
    if (data.distance !== undefined) setDistance(data.distance);
    if (data.trackingPath !== undefined) setTrackingPath(data.trackingPath);
    if (data.maxSpeed !== undefined) setMaxSpeed(data.maxSpeed);
  };

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
    hydrate,
    reset,
  };
};

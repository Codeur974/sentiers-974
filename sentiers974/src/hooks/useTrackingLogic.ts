import * as Location from "expo-location";
import { useEffect, useState, useMemo } from "react";
import { Alert } from "react-native";
import { useLocationStore } from "../store/useLocationStore";
import { useSessionStore } from "../store/useSessionStore";
import { getSportType, getSportMetrics } from "../utils";
import { LocationHelper } from "../utils/locationUtils";
import {
  useGPSTracking,
  useDistanceCalculator,
  useElevationTracking,
  useSplits,
  useSessionPersistence,
} from "./tracking";

/**
 * Hook principal de tracking - Architecture modulaire refactorisée
 * Réduit de 1198 lignes → 350 lignes ✨
 *
 * Hooks modulaires (src/hooks/tracking/):
 * - useGPSTracking: GPS polling 1s (au lieu de 500ms)
 * - useDistanceCalculator: Filtrage 5-8m, timeout 5s (au lieu de 2s)
 * - useElevationTracking: Dénivelé adapté La Réunion
 * - useSplits: Chronométrage par km
 * - useSessionPersistence: Sauvegarde MongoDB + AsyncStorage
 *
 * Optimisations pour tracking fluide comme Strava:
 * ✅ Filtrage distance minimum (évite bruit GPS)
 * ✅ Timeout arrêt 5s au lieu de 2s
 * ✅ Polling GPS 1000ms au lieu de 500ms
 * ✅ Vitesse EMA simple
 * ✅ Aucun interval dupliqué
 */
export const useTrackingLogic = (selectedSport: any) => {
  const [duration, setDuration] = useState(0);
  const [steps, setSteps] = useState(0);
  const [initialPermissionChecked, setInitialPermissionChecked] = useState(false);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [chartData, setChartData] = useState<Array<{
    time: number;
    altitude: number | null;
    speed: number;
    distance: number;
    timestamp: number;
  }>>([]);

  const { status, start, pause, resume, stop, reset, duration: getDuration } = useSessionStore();
  const { coords, address, watching, locationError, setCoords, setPermission, setError, setIsLocating } = useLocationStore();

  // Mémoriser sportConfig pour éviter re-création à chaque render
  const sportConfig = useMemo(() => {
    const defaultConfig = {
      maxSpeed: 35,
      minDistance: 0.005,
      accuracyThreshold: 30,
      minPollingInterval: 1000,
      maxPollingInterval: 2500,
      allowSlowPolling: true,
      speedSmoothingWindow: 6,
    };

    if (!selectedSport) {
      return defaultConfig;
    }

    const sportConfigs: Record<string, any> = {
      'Course': {
        ...defaultConfig,
        maxSpeed: 25,
        minDistance: 0.005,
        accuracyThreshold: 30,
        maxPollingInterval: 2000,
        speedSmoothingWindow: 5,
      },
      'Trail': {
        ...defaultConfig,
        maxSpeed: 20,
        minDistance: 0.008,
        accuracyThreshold: 35,
        maxPollingInterval: 2000,
      },
      'Marche': {
        ...defaultConfig,
        maxSpeed: 8,
        minDistance: 0.005,
        accuracyThreshold: 35,
        allowSlowPolling: false,
        maxPollingInterval: 1500,
        speedSmoothingWindow: 4,
      },
      'Randonnée': {
        ...defaultConfig,
        maxSpeed: 10,
        minDistance: 0.005,
        accuracyThreshold: 40,
        maxPollingInterval: 2000,
        speedSmoothingWindow: 5,
      },
      'VTT': {
        ...defaultConfig,
        maxSpeed: 45,
        minDistance: 0.005,
        accuracyThreshold: 30,
      },
      'Vélo': {
        ...defaultConfig,
        maxSpeed: 50,
        minDistance: 0.005,
        accuracyThreshold: 25,
        maxPollingInterval: 2000,
      },
    };

    return sportConfigs[selectedSport.nom] || defaultConfig;
  }, [selectedSport?.nom]); // Ne recalculer que si le sport change

  // Hooks modulaires - Architecture propre
  const gpsTracking = useGPSTracking(sportConfig);
  const distanceCalc = useDistanceCalculator(coords, sportConfig, status);
  const elevation = useElevationTracking(coords, status);
  const splits = useSplits();
  const persistence = useSessionPersistence();

  useEffect(() => {
    if (selectedSport && !coords) {
      console.log("🎯 Sport sélectionné, localisation auto");
      getLocationForTracking();
    }
  }, [selectedSport, coords]);

  const getLocationForTracking = async () => {
    setIsLocating(true);
    setError(null);
    try {
      const result = await LocationHelper.getFullLocation();
      if (result.error) {
        setError(`Tracking: ${result.error}`);
        return;
      }
      if (result.coords) {
        console.log("📍 Position obtenue");
        setCoords(result.coords);
      }
    } catch (error) {
      setError("Impossible de localiser");
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (status === "running") {
      interval = setInterval(() => setDuration(getDuration()), 1000);
    }
    return () => clearInterval(interval);
  }, [status, getDuration]);

  useEffect(() => {
    if (status === "running" && selectedSport && distanceCalc.distance > 0) {
      const stepsPerKmMap: Record<string, number> = {
        Course: 1300, Trail: 1400, Marche: 1250, Randonnée: 1200, Escalade: 800
      };
      const stepsPerKm = stepsPerKmMap[selectedSport.nom] || 1200;
      setSteps(Math.round(distanceCalc.distance * stepsPerKm));
    }
  }, [status, selectedSport, distanceCalc.distance]);

  useEffect(() => {
    if (distanceCalc.distance > 0 && duration > 0) {
      const hours = duration / (1000 * 60 * 60);
      setAvgSpeed(distanceCalc.distance / hours);
    } else {
      setAvgSpeed(0);
    }
  }, [distanceCalc.distance, duration]);

  useEffect(() => {
    if (status === "running" && distanceCalc.distance > 0) {
      splits.createAutoSplit(distanceCalc.distance, getDuration());
    }
  }, [distanceCalc.distance, status]);

  useEffect(() => {
    if (coords && status === "running") {
      setChartData(prev => {
        const lastEntry = prev[prev.length - 1];
        const currentTime = getDuration();
        const shouldSample = !lastEntry || (currentTime - lastEntry.time) >= 5000;
        if (shouldSample) {
          return [...prev, {
            time: currentTime,
            altitude: coords.altitude || null,
            speed: distanceCalc.instantSpeed,
            distance: distanceCalc.distance,
            timestamp: Date.now()
          }];
        }
        return prev;
      });
    }
  }, [coords, status, distanceCalc.instantSpeed, distanceCalc.distance]);

  useEffect(() => {
    const checkInitialPermissions = async () => {
      if (selectedSport && !initialPermissionChecked) {
        setInitialPermissionChecked(true);
        try {
          const { status: permissionStatus } = await Location.getForegroundPermissionsAsync();
          if (permissionStatus !== "granted") {
            setError("Permission GPS requise");
            setPermission(false);
          } else {
            setPermission(true);
            setError(null);
          }
        } catch (error) {
          setError("Impossible de vérifier permissions GPS");
          setPermission(false);
        }
      }
    };
    checkInitialPermissions();
  }, [selectedSport, initialPermissionChecked]);

  useEffect(() => {
    return () => {
      if (watching) gpsTracking.stopGPSTracking();
    };
  }, [watching]);

  const calculateCalories = () => {
    if (!selectedSport || distanceCalc.distance <= 0) return 0;
    const sportType = getSportType(selectedSport.nom);
    const metrics = getSportMetrics(sportType);
    const baseCaloriesPerKm: Record<string, number> = {
      Course: 60, Trail: 65, Marche: 45, Randonnée: 50, Escalade: 80,
      VTT: 35, Vélo: 30, Natation: 120, SUP: 40, Surf: 45, Kayak: 35
    };
    let calories = (baseCaloriesPerKm[selectedSport.nom] || 50) * metrics.caloriesMultiplier;
    const { min, normal, max } = metrics.speedRange;
    if (distanceCalc.instantSpeed > max * 0.8) calories *= 1.3;
    else if (distanceCalc.instantSpeed > normal) calories *= 1.1;
    else if (distanceCalc.instantSpeed < min * 2) calories *= 0.8;
    return Math.round(distanceCalc.distance * calories);
  };

  const handleStartTracking = async () => {
    setError(null);
    await persistence.createSession(selectedSport, coords, address || '');
    const gpsSuccess = await gpsTracking.startGPSTracking();
    if (!gpsSuccess) return;
    const sessionSuccess = start();
    if (sessionSuccess) {
      setDuration(0);
      setSteps(0);
    }
  };

  const handlePauseTracking = () => pause();
  const handleResumeTracking = () => resume();

  const handleStopTracking = async () => {
    stop();
    gpsTracking.stopGPSTracking();
    const finalDuration = getDuration();
    Alert.alert(
      "Enregistrer la session ?",
      `Durée: ${Math.floor(finalDuration / 60000)}min ${Math.floor((finalDuration % 60000) / 1000)}s\nDistance: ${distanceCalc.distance.toFixed(2)}km`,
      [
        {
          text: "Non",
          style: "cancel",
          onPress: async () => {
            await persistence.clearSession();
            resetTracking();
          }
        },
        {
          text: "Oui",
          onPress: async () => {
            await persistence.saveSession({
              sport: selectedSport,
              distance: distanceCalc.distance,
              duration: finalDuration,
              calories: calculateCalories(),
              avgSpeed: avgSpeed,
              maxSpeed: distanceCalc.maxSpeed,
              steps: steps,
              trackingPath: distanceCalc.trackingPath,
              elevationGain: elevation.elevationGain,
              elevationLoss: elevation.elevationLoss
            });
            console.log('💾 Session sauvegardée');
            resetTracking();
          }
        }
      ]
    );
  };

  const resetTracking = () => {
    reset();
    setDuration(0);
    setSteps(0);
    setAvgSpeed(0);
    setChartData([]);
    distanceCalc.reset();
    elevation.reset();
    splits.reset();
  };

  const handleBackToSelection = async () => {
    resetTracking();
    gpsTracking.stopGPSTracking();
    setInitialPermissionChecked(false);
    await persistence.clearSession();
  };

  const handleNavigateAway = () => console.log('🧭 Navigation temporaire');
  const handleNewSession = () => resetTracking();
  const handleManualSplit = () => {
    if (status === "running" && distanceCalc.distance > 0) {
      splits.createManualSplit(distanceCalc.distance, getDuration());
    }
  };

  return {
    status,
    sessionId: persistence.sessionId,
    duration,
    steps,
    distance: distanceCalc.distance,
    instantSpeed: distanceCalc.instantSpeed,
    maxSpeed: distanceCalc.maxSpeed,
    avgSpeed,
    calories: calculateCalories(),
    coords,
    address,
    watching,
    locationError,
    trackingPath: distanceCalc.trackingPath,
    elevationGain: elevation.elevationGain,
    elevationLoss: elevation.elevationLoss,
    minAltitude: elevation.minAltitude,
    maxAltitude: elevation.maxAltitude,
    splits: splits.splits,
    splitStats: splits.getSplitStats(),
    chartData,
    handleStartTracking,
    handlePauseTracking,
    handleResumeTracking,
    handleStopTracking,
    handleBackToSelection,
    handleNavigateAway,
    handleNewSession,
    handleManualSplit,
  };
};

import * as Location from "expo-location";
import { useEffect, useState, useMemo } from "react";
import { Alert } from "react-native";
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useLocationStore } from "../store/useLocationStore";
import { useSessionStore } from "../store/useSessionStore";
import { getSportType, getSportMetrics } from "../utils";
import { LocationHelper } from "../utils/locationUtils";
import { GPXExporter } from "../utils/gpxExport";
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
      minDistance: 0.002,
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
        minDistance: 0.002,
        accuracyThreshold: 30,
        maxPollingInterval: 2000,
        speedSmoothingWindow: 5,
      },
      'Trail': {
        ...defaultConfig,
        maxSpeed: 20,
        minDistance: 0.002,
        accuracyThreshold: 35,
        maxPollingInterval: 2000,
      },
      'Marche': {
        ...defaultConfig,
        maxSpeed: 8,
        minDistance: 0.002,
        accuracyThreshold: 35,
        allowSlowPolling: false,
        maxPollingInterval: 1500,
        speedSmoothingWindow: 4,
      },
      'Randonnée': {
        ...defaultConfig,
        maxSpeed: 10,
        minDistance: 0.002,
        accuracyThreshold: 40,
        maxPollingInterval: 2000,
        speedSmoothingWindow: 5,
      },
      'VTT': {
        ...defaultConfig,
        maxSpeed: 45,
        minDistance: 0.002,
        accuracyThreshold: 30,
      },
      'Vélo': {
        ...defaultConfig,
        maxSpeed: 50,
        minDistance: 0.002,
        accuracyThreshold: 25,
        maxPollingInterval: 2000,
      },
      'Escalade': {
        ...defaultConfig,
        maxSpeed: 5,
        minDistance: 0.003,
        accuracyThreshold: 50,
        allowSlowPolling: false,
        maxPollingInterval: 1500,
        speedSmoothingWindow: 4,
      },
      'Natation': {
        ...defaultConfig,
        maxSpeed: 8,
        minDistance: 0.01,
        accuracyThreshold: 80,
        maxPollingInterval: 3000,
        speedSmoothingWindow: 6,
      },
      'SUP': {
        ...defaultConfig,
        maxSpeed: 12,
        minDistance: 0.008,
        accuracyThreshold: 60,
        maxPollingInterval: 2500,
        speedSmoothingWindow: 5,
      },
      'Surf': {
        ...defaultConfig,
        maxSpeed: 40,
        minDistance: 0.01,
        accuracyThreshold: 70,
        maxPollingInterval: 2500,
        speedSmoothingWindow: 6,
      },
      'Kayak': {
        ...defaultConfig,
        maxSpeed: 15,
        minDistance: 0.008,
        accuracyThreshold: 60,
        maxPollingInterval: 2500,
        speedSmoothingWindow: 5,
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
  }, [status]); // Retirer getDuration pour éviter re-création interval

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

    // Démarrer la session tout de suite pour ne pas bloquer l'UI
    const sessionStarted = start();
    if (!sessionStarted) return;
    setDuration(0);
    setSteps(0);

    // Création de session en arrière-plan (réseau potentiellement lent)
    persistence.createSession(selectedSport, coords, address || '').catch((err: any) => {
      console.log('⚠️ Création de session en arrière-plan échouée', err?.message || err);
    });

    // Lancer le GPS sans bloquer; si échec on arrête proprement
    gpsTracking.startGPSTracking().then((success: boolean) => {
      if (!success) {
        setError('GPS indisponible');
        stop();
      }
    }).catch((err: any) => {
      console.log('⚠️ GPS start error', err?.message || err);
      setError('GPS indisponible');
      stop();
    });
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
            console.log('❌ Utilisateur a cliqué NON - Suppression session');
            await persistence.clearSession();
            // Ne PAS appeler resetTracking() pour garder status="stopped"
            // et afficher les boutons Refaire/Export/Changer
          }
        },
        {
          text: "Oui",
          onPress: async () => {
            console.log('✅ Utilisateur a cliqué OUI - Sauvegarde session');
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
            // Ne PAS appeler resetTracking() ici pour garder le status "stopped"
            // et afficher les boutons Export GPX / Refaire / Changer
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
  const handleNewSession = async () => {
    await persistence.clearSession();
    resetTracking();
  };
  const handleManualSplit = () => {
    if (status === "running" && distanceCalc.distance > 0) {
      splits.createManualSplit(distanceCalc.distance, getDuration());
    }
  };

  const handleExportGPX = async () => {
    try {
      if (!distanceCalc.trackingPath || distanceCalc.trackingPath.length === 0) {
        Alert.alert('Erreur', 'Aucune donnée GPS à exporter');
        return;
      }

      if (!selectedSport) {
        Alert.alert('Erreur', 'Sport non sélectionné');
        return;
      }

      // Préparer les données
      const sessionData = GPXExporter.convertTrackingDataToGPX(
        distanceCalc.trackingPath,
        chartData || [],
        {
          sport: selectedSport.nom,
          startTime: Date.now() - duration,
          endTime: Date.now(),
          distance: distanceCalc.distance,
          duration: duration,
          elevationGain: elevation.elevationGain || 0,
          elevationLoss: elevation.elevationLoss || 0,
          maxSpeed: distanceCalc.maxSpeed,
          avgSpeed: avgSpeed
        }
      );

      // Générer le fichier GPX
      const gpxContent = GPXExporter.generateGPX(sessionData);

      // Créer le fichier avec la nouvelle API
      const fileName = `${selectedSport.nom}_${new Date().toISOString().split('T')[0]}.gpx`;
      const file = new File(Paths.document, fileName);
      file.write(gpxContent);

      // Partager le fichier
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/gpx+xml',
          dialogTitle: `Partager ${selectedSport.nom} - ${distanceCalc.distance.toFixed(2)}km`
        });
      } else {
        Alert.alert('Succès', `Fichier sauvegardé: ${fileName}`);
      }
    } catch (error) {
      console.error('Erreur export GPX:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter le fichier GPX');
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
    handleExportGPX,
  };
};

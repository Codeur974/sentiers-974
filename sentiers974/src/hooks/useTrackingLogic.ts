import * as Location from "expo-location";
import { useEffect, useState, useMemo, useRef } from "react";
import { Alert } from "react-native";
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useLocationStore } from "../store/useLocationStore";
import { useSessionStore } from "../store/useSessionStore";
import { usePOIs } from "../store/useDataStore";
import { getSportType, getSportMetrics } from "../utils";
import { LocationHelper } from "../utils/locationUtils";
import { GPXExporter } from "../utils/gpxExport";
import {
  useGPSTracking,
  useDistanceCalculator,
  useElevationTracking,
  useSplits,
  useSessionPersistence,
  useTrackingStatePersistence,
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

  const { status, start, pause, resume, stop, reset, duration: getDuration, hydrate } = useSessionStore();
  const { coords, address, watching, locationError, setCoords, setPermission, setError, setIsLocating, setAddress } = useLocationStore();
  const trackingState = useTrackingStatePersistence();
  const { snapshot, isHydrating, saveSnapshot, clearSnapshot } = trackingState;
  const hasHydratedState = useRef(false);
  const restoredFromSnapshot = useRef(false);
  const hasRestartedGPS = useRef(false);
  const [hydratedSport, setHydratedSport] = useState<any>(null);
  const activeSport = selectedSport || hydratedSport;

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

    if (!activeSport) {
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

    return sportConfigs[activeSport.nom] || defaultConfig;
  }, [activeSport?.nom]); // Ne recalculer que si le sport change

  // Hooks modulaires - Architecture propre
  const gpsTracking = useGPSTracking(sportConfig);
  const distanceCalc = useDistanceCalculator(coords, sportConfig, status);
  const elevation = useElevationTracking(coords, status);
  const splits = useSplits();
  const persistence = useSessionPersistence();
  const { confirmDraftPOIs, cancelDraftPOIs } = usePOIs();

  useEffect(() => {
    if (isHydrating || hasHydratedState.current) return;

    if (snapshot) {
      const snap = snapshot;
      hasHydratedState.current = true;
      restoredFromSnapshot.current = true;

      if (snap.selectedSport) {
        setHydratedSport(snap.selectedSport);
      }
      if (snap.coords) {
        setCoords(snap.coords);
      }
      if (snap.address) {
        setAddress(snap.address);
      }

      distanceCalc.hydrate({
        distance: snap.distance,
        trackingPath: snap.trackingPath,
      });

      elevation.hydrate({
        elevationGain: snap.elevationGain,
        elevationLoss: snap.elevationLoss,
      });

      setDuration(snap.duration || 0);
      setSteps(snap.steps || 0);
      setAvgSpeed(snap.avgSpeed || 0);
      setChartData(snap.chartData || []);

      if (snap.status === "running" || snap.status === "paused" || snap.status === "stopped") {
        hydrate(snap.duration || 0, snap.status);
      }
    } else {
      hasHydratedState.current = true;
      restoredFromSnapshot.current = false;
    }
  }, [isHydrating, snapshot, setCoords, setAddress, distanceCalc, elevation, hydrate]);

  useEffect(() => {
    // Relancer le watch GPS si une session est en cours/pausée et que le flux n'est pas actif
    if (!hasHydratedState.current) return;
    if (hasRestartedGPS.current) return;
    if (status === "running" || status === "paused") {
      if (!watching) {
        gpsTracking.startGPSTracking().then((ok: boolean) => {
          if (ok) {
            hasRestartedGPS.current = true;
          }
        }).catch(() => {
          // pas bloquant, on laisse l'utilisateur relancer
        });
      } else {
        hasRestartedGPS.current = true;
      }
    }
  }, [status, watching]);

  useEffect(() => {
    if (activeSport && !coords) {
      console.log("🎯 Sport sélectionné, localisation auto");
      getLocationForTracking();
    }
  }, [activeSport, coords]);

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
    if (status === "running" && activeSport && distanceCalc.distance > 0) {
      const stepsPerKmMap: Record<string, number> = {
        Course: 1300, Trail: 1400, Marche: 1250, Randonnée: 1200, Escalade: 800
      };
      const stepsPerKm = stepsPerKmMap[activeSport.nom] || 1200;
      setSteps(Math.round(distanceCalc.distance * stepsPerKm));
    }
  }, [status, activeSport, distanceCalc.distance]);

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
    if (isHydrating || !hasHydratedState.current) return;

    if (!activeSport || status === "idle") {
      clearSnapshot();
      return;
    }

    saveSnapshot({
      sessionId: persistence.sessionId,
      status,
      duration,
      selectedSport: activeSport,
      coords,
      address,
      distance: distanceCalc.distance,
      trackingPath: distanceCalc.trackingPath,
      steps,
      avgSpeed,
      chartData,
      elevationGain: elevation.elevationGain,
      elevationLoss: elevation.elevationLoss,
    });
  }, [
    isHydrating,
    saveSnapshot,
    clearSnapshot,
    activeSport,
    status,
    duration,
    coords,
    address,
    distanceCalc.distance,
    distanceCalc.trackingPath,
    steps,
    avgSpeed,
    chartData,
    elevation.elevationGain,
    elevation.elevationLoss,
    persistence.sessionId,
  ]);

  useEffect(() => {
    const checkInitialPermissions = async () => {
      if (activeSport && !initialPermissionChecked) {
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
  }, [activeSport, initialPermissionChecked]);

  useEffect(() => {
    return () => {
      if (watching) gpsTracking.stopGPSTracking();
    };
  }, [watching]);

  const calculateCalories = () => {
    if (!activeSport || distanceCalc.distance <= 0) return 0;
    const sportType = getSportType(activeSport.nom);
    const metrics = getSportMetrics(sportType);
    const baseCaloriesPerKm: Record<string, number> = {
      Course: 60, Trail: 65, Marche: 45, Randonnée: 50, Escalade: 80,
      VTT: 35, Vélo: 30, Natation: 120, SUP: 40, Surf: 45, Kayak: 35
    };
    let calories = (baseCaloriesPerKm[activeSport.nom] || 50) * metrics.caloriesMultiplier;
    const { min, normal, max } = metrics.speedRange;
    if (distanceCalc.instantSpeed > max * 0.8) calories *= 1.3;
    else if (distanceCalc.instantSpeed > normal) calories *= 1.1;
    else if (distanceCalc.instantSpeed < min * 2) calories *= 0.8;
    return Math.round(distanceCalc.distance * calories);
  };

  const handleStartTracking = async () => {
    setError(null);
    restoredFromSnapshot.current = false;
    hasRestartedGPS.current = false;

    // Démarrer la session tout de suite pour ne pas bloquer l'UI
    const sessionStarted = start();
    if (!sessionStarted) return;
    setDuration(0);
    setSteps(0);

    // Création de session en arrière-plan (réseau potentiellement lent)
    persistence.createSession(activeSport, coords, address || '').catch((err: any) => {
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
    const finalDuration = getDuration();

    // 1ère confirmation : Arrêter le tracking ?
    Alert.alert(
      "Arrêter le tracking ?",
      `Voulez-vous vraiment arrêter votre session ?\n\nDurée: ${Math.floor(finalDuration / 60000)}min ${Math.floor((finalDuration % 60000) / 1000)}s\nDistance: ${distanceCalc.distance.toFixed(2)}km`,
      [
        {
          text: "Annuler",
          style: "cancel",
          onPress: () => {
            console.log('↩️ Utilisateur a annulé l\'arrêt - Continue le tracking');
          }
        },
        {
          text: "Arrêter",
          style: "destructive",
          onPress: async () => {
            console.log('⏹️ Utilisateur confirme l\'arrêt');
            stop();
            gpsTracking.stopGPSTracking();

            // 2ème confirmation : Enregistrer la session ?
            Alert.alert(
              "Enregistrer la session ?",
              `Souhaitez-vous sauvegarder cette session ?\n\nDurée: ${Math.floor(finalDuration / 60000)}min ${Math.floor((finalDuration % 60000) / 1000)}s\nDistance: ${distanceCalc.distance.toFixed(2)}km`,
              [
                {
                  text: "Non",
                  style: "cancel",
                  onPress: async () => {
                    console.log('❌ Utilisateur a cliqué NON - Suppression session');
                    // Supprimer les POI temporaires de la session
                    if (persistence.sessionId) {
                      await cancelDraftPOIs(persistence.sessionId);
                      console.log('🗑️ POI temporaires supprimés');
                    }
                    await persistence.clearSession();
                    await clearSnapshot();
                    resetTracking();
                    setHydratedSport(null);
                  }
                },
                {
                  text: "Oui",
                  onPress: async () => {
                    console.log('========================================');
                    console.log('✅ useTrackingLogic: Utilisateur a cliqué OUI');
                    console.log('📊 useTrackingLogic: Session à sauvegarder:', {
                      sessionId: persistence.sessionId,
                      sport: activeSport?.nom,
                      distance: distanceCalc.distance,
                      duration: finalDuration
                    });
                    console.log('========================================');

                    // Confirmer les POI temporaires (les rendre permanents)
                    if (persistence.sessionId) {
                      console.log('🔄 useTrackingLogic: Confirmation POI draft...');
                      await confirmDraftPOIs(persistence.sessionId);
                      console.log('✅ useTrackingLogic: POI confirmés');
                    }

                    console.log('🔄 useTrackingLogic: Appel persistence.saveSession...');
                    await persistence.saveSession({
                      sport: activeSport,
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
                    console.log('✅ useTrackingLogic: persistence.saveSession terminé');

                    await clearSnapshot();
                    console.log('✅ useTrackingLogic: Snapshot cleared');

                    resetTracking();
                    setHydratedSport(null);
                    console.log('✅ useTrackingLogic: Tracking reset - TERMINÉ');
                    console.log('========================================');
                  }
                }
              ]
            );
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
    hasRestartedGPS.current = false;
    restoredFromSnapshot.current = false;
  };

  const handleBackToSelection = async () => {
    resetTracking();
    gpsTracking.stopGPSTracking();
    setInitialPermissionChecked(false);
    await persistence.clearSession();
    await clearSnapshot();
    setHydratedSport(null);
  };

  const handleNavigateAway = () => console.log('🧭 Navigation temporaire');
  const handleNewSession = async () => {
    await persistence.clearSession();
    await clearSnapshot();
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

      if (!activeSport) {
        Alert.alert('Erreur', 'Sport non sélectionné');
        return;
      }

      // Préparer les données
      const sessionData = GPXExporter.convertTrackingDataToGPX(
        distanceCalc.trackingPath,
        chartData || [],
        {
          sport: activeSport.nom,
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
      const fileName = `${activeSport.nom}_${new Date().toISOString().split('T')[0]}.gpx`;
      const file = new File(Paths.document, fileName);
      file.write(gpxContent);

      // Partager le fichier
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/gpx+xml',
          dialogTitle: `Partager ${activeSport.nom} - ${distanceCalc.distance.toFixed(2)}km`
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
    activeSport,
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

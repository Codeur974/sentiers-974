import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { useLocationStore } from "../store/useLocationStore";
import { useSessionStore } from "../store/useSessionStore";
import { getSportType, getSportMetrics } from "../utils";

export const useTrackingLogic = (selectedSport: any) => {
  const [duration, setDuration] = useState(0);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [lastCoords, setLastCoords] = useState<any>(null);
  const [instantSpeed, setInstantSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [initialPermissionChecked, setInitialPermissionChecked] = useState(false);
  
  const stepInterval = useRef<any>(null);
  const pausedSteps = useRef(0);
  const pausedDistance = useRef(0);

  const { status, start, pause, resume, stop, reset, duration: getDuration } = useSessionStore();
  const {
    coords,
    address,
    watching,
    locationError,
    setWatching,
    setCoords,
    setPermission,
    setError,
    setIsLocating,
    setWatchSubscription,
  } = useLocationStore();

  // Configuration universelle qui s'adapte à toute vitesse
  const getSportConfig = () => {
    return {
      maxSpeed: 35, // Vitesse max généreuse pour tous les sports
      minDistance: 0.00003, // 3cm minimum pour détecter tous les mouvements
      timeInterval: 800, // 0.8 seconde pour une bonne réactivité
      distanceInterval: 0.5 // 0.5 mètre pour capturer tous les mouvements
    };
  };

  // Mettre à jour la durée toutes les secondes
  useEffect(() => {
    let interval: any;
    if (status === "running") {
      interval = setInterval(() => {
        setDuration(getDuration());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, getDuration]);

  // Simuler les pas de manière plus réaliste basé sur la vitesse ET le mouvement
  useEffect(() => {
    if (status === "running" && selectedSport && distance > 0) {
      if (stepInterval.current) {
        clearInterval(stepInterval.current);
      }

      const stepsPerKmMap: Record<string, number> = {
        Course: 1300,
        Trail: 1400,
        Marche: 1250,
        Randonnée: 1200,
        Escalade: 800,
      };
      const stepsPerKm = stepsPerKmMap[selectedSport.nom] || 1200;

      const totalSteps = distance * stepsPerKm;

      stepInterval.current = setInterval(() => {
        setSteps((prev) => {
          const diff = totalSteps - prev;
          if (diff > 0) {
            return prev + Math.min(diff, diff * 0.1 + 1);
          }
          return prev;
        });
      }, 500);
    } else {
      if (stepInterval.current) {
        clearInterval(stepInterval.current);
      }
    }

    return () => {
      if (stepInterval.current) {
        clearInterval(stepInterval.current);
      }
    };
  }, [status, selectedSport, distance]);

  // Calculer distance et vitesse avec filtrage GPS amélioré
  useEffect(() => {
    if (coords && status === "running") {
      setLocationHistory((prev) => {
        const newHistory = [...prev, coords].slice(-10);
        return newHistory;
      });

      if (lastCoords) {
        const newDist = calculateSimpleDistance(lastCoords, coords);
        const timeDiff = (coords.timestamp - lastCoords.timestamp) / 1000;

        if (timeDiff > 0.5 && timeDiff < 30) {
          const config = getSportConfig();
          const theoreticalMaxDist = (config.maxSpeed / 3600) * timeDiff;

          if (
            newDist > config.minDistance &&
            newDist < theoreticalMaxDist &&
            coords.accuracy &&
            coords.accuracy < 50
          ) {
            setDistance((prev) => prev + newDist);

            const rawSpeedKmh = (newDist / timeDiff) * 3600;
            
            setSpeedHistory((prev) => {
              const newHistory = [...prev, rawSpeedKmh].slice(-5);
              return newHistory;
            });
            
            setInstantSpeed((prev) => {
              let targetSpeed = rawSpeedKmh;
              
              if (speedHistory.length >= 3) {
                const recentSpeeds = [...speedHistory, rawSpeedKmh].slice(-4);
                const sorted = [...recentSpeeds].sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                
                if (Math.abs(rawSpeedKmh - median) > 4) {
                  targetSpeed = (rawSpeedKmh + median) / 2;
                }
              }
              
              // Mettre à jour la vitesse max si nécessaire
              if (targetSpeed > maxSpeed) {
                setMaxSpeed(targetSpeed);
              }
              
              if (targetSpeed < 1) {
                return targetSpeed;
              }
              
              const speedDiff = Math.abs(targetSpeed - prev);
              if (speedDiff > 2) {
                return prev + (targetSpeed - prev) * 0.6;
              }
              
              return prev * 0.3 + targetSpeed * 0.7;
            });
          }
        }
      }

      setLastCoords(coords);
    }
  }, [coords, status, lastCoords, selectedSport, speedHistory]);

  // Calculer la vitesse moyenne séparément
  useEffect(() => {
    if (distance > 0 && duration > 0) {
      const hours = duration / (1000 * 60 * 60);
      setAvgSpeed(distance / hours);
    } else {
      setAvgSpeed(0);
    }
  }, [distance, duration]);

  // Vérifier les permissions GPS dès la sélection du sport
  useEffect(() => {
    const checkInitialPermissions = async () => {
      if (selectedSport && !initialPermissionChecked) {
        setInitialPermissionChecked(true);
        try {
          const { status: permissionStatus } = await Location.getForegroundPermissionsAsync();
          if (permissionStatus !== "granted") {
            setError("Permission GPS requise pour le tracking");
            setPermission(false);
          } else {
            setPermission(true);
            setError(null);
          }
        } catch (error) {
          setError("Impossible de vérifier les permissions GPS");
          setPermission(false);
        }
      }
    };

    checkInitialPermissions();
  }, [selectedSport, initialPermissionChecked]);

  // Cleanup GPS au démontage du composant
  useEffect(() => {
    return () => {
      if (watching) {
        stopLocationTracking();
      }
      if (stepInterval.current) {
        clearInterval(stepInterval.current);
      }
    };
  }, []);

  // Fonction pour calculer la distance simple
  const calculateSimpleDistance = (coord1: any, coord2: any) => {
    const R = 6371;
    const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.latitude * Math.PI) / 180) *
        Math.cos((coord2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fonction pour calculer la vitesse
  const calculateSpeed = (useInstant = false) => {
    if (useInstant) {
      return instantSpeed > 0 ? instantSpeed : 0;
    }
    return avgSpeed > 0 ? avgSpeed : 0;
  };

  // Fonction pour calculer les calories adaptées au sport
  const calculateCalories = () => {
    if (!selectedSport) return 0;
    if (distance <= 0) return 0;

    const sportType = getSportType(selectedSport.nom);
    const metrics = getSportMetrics(sportType);
    const currentSpeed = calculateSpeed(true);

    const getCaloriesPerKm = () => {
      const baseCaloriesPerKm: Record<string, number> = {
        Course: 60,
        Trail: 65,
        Marche: 45,
        Randonnée: 50,
        Escalade: 80,
        VTT: 35,      // Moins de calories/km qu'à pied
        Vélo: 30,     // Route, encore moins
        Natation: 120, // Plus intense
        SUP: 40,
        Surf: 45,
        Kayak: 35,
      };

      let baseCalories = baseCaloriesPerKm[selectedSport.nom] || 50;
      
      // Appliquer le multiplicateur du type de sport
      baseCalories *= metrics.caloriesMultiplier;

      // Ajuster selon la vitesse et les seuils du sport
      const { min, normal, max } = metrics.speedRange;
      if (currentSpeed > max * 0.8) {
        baseCalories *= 1.3; // Très rapide pour ce sport
      } else if (currentSpeed > normal) {
        baseCalories *= 1.1; // Rapide pour ce sport
      } else if (currentSpeed < min * 2) {
        baseCalories *= 0.8; // Lent pour ce sport
      }

      return baseCalories;
    };

    return Math.round(distance * getCaloriesPerKm());
  };

  // Démarrer le GPS tracking
  const startLocationTracking = async () => {
    try {
      setIsLocating(true);
      setError(null);
      setWatching(false); // S'assurer que watching est false au début

      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== "granted") {
        setError("Permission GPS requise pour le tracking");
        setPermission(false);
        setIsLocating(false);
        return false;
      }

      setPermission(true);

      const config = getSportConfig();
      const watchOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: config.timeInterval,
        distanceInterval: config.distanceInterval,
        mayShowUserSettingsDialog: true,
      };

      const subscription = await Location.watchPositionAsync(
        watchOptions,
        (location) => {
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp || Date.now(),
          };
          setCoords(coords);
        }
      );

      setWatchSubscription(subscription);
      setWatching(true);
      setIsLocating(false);
      return true;
    } catch (error) {
      console.log("Erreur GPS:", error);
      setError("Impossible d'activer le GPS");
      setIsLocating(false);
      setWatching(false);
      return false;
    }
  };

  // Arrêter le GPS tracking
  const stopLocationTracking = () => {
    setWatching(false);
    setLocationHistory([]);
  };

  // Actions de tracking
  const handleStartTracking = async () => {
    // Réinitialiser l'état d'erreur avant de commencer
    setError(null);
    
    const gpsSuccess = await startLocationTracking();
    if (!gpsSuccess) {
      // Arrêter tout processus de tracking en cas d'échec GPS
      return;
    }

    const sessionSuccess = start();
    if (sessionSuccess) {
      setDuration(0);
      setSteps(pausedSteps.current);
      setDistance(pausedDistance.current);
      setLastCoords(null);
      setInstantSpeed(0);
      setMaxSpeed(0);
      setAvgSpeed(0);
      setLocationHistory([]);
    }
  };

  const handlePauseTracking = () => {
    pause();
    pausedSteps.current = steps;
    pausedDistance.current = distance;
  };

  const handleResumeTracking = () => {
    resume();
  };

  const handleStopTracking = () => {
    stop();
    stopLocationTracking();
    setDuration(getDuration());
  };

  const resetTracking = () => {
    reset();
    setDuration(0);
    setSteps(0);
    setDistance(0);
    setLastCoords(null);
    setInstantSpeed(0);
    setMaxSpeed(0);
    setAvgSpeed(0);
    setSpeedHistory([]);
    pausedSteps.current = 0;
    pausedDistance.current = 0;
  };

  const handleBackToSelection = () => {
    resetTracking();
    stopLocationTracking();
    setInitialPermissionChecked(false); // Reset pour la prochaine sélection
  };

  const handleNewSession = () => {
    resetTracking();
  };

  return {
    // État
    status,
    duration,
    steps,
    distance,
    instantSpeed: calculateSpeed(true),
    maxSpeed,
    avgSpeed: calculateSpeed(false),
    calories: calculateCalories(),
    coords,
    address,
    watching,
    locationError,
    
    // Actions
    handleStartTracking,
    handlePauseTracking,
    handleResumeTracking,
    handleStopTracking,
    handleBackToSelection,
    handleNewSession,
  };
};
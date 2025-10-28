import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocationStore } from "../store/useLocationStore";
import { useSessionStore } from "../store/useSessionStore";
import { getSportType, getSportMetrics } from "../utils";
import { LocationHelper } from "../utils/locationUtils";

export const useTrackingLogic = (selectedSport: any) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Charger le sessionId depuis AsyncStorage au démarrage
  useEffect(() => {
    const loadSessionId = async () => {
      try {
        const storedSessionId = await AsyncStorage.getItem('currentSessionId');
        if (storedSessionId) {
          setSessionId(storedSessionId);
          console.log('🔄 SessionId restauré:', storedSessionId);
        }
      } catch (error) {
        console.error('❌ Erreur chargement sessionId:', error);
      }
    };
    
    loadSessionId();
  }, []);
  const [duration, setDuration] = useState(0);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [lastCoords, setLastCoords] = useState<any>(null);
  const [instantSpeed, setInstantSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const speedWindowRef = useRef<Array<{ timestamp: number; distance: number }>>([]);
  const [initialPermissionChecked, setInitialPermissionChecked] = useState(false);
  const [trackingPath, setTrackingPath] = useState<Array<{latitude: number; longitude: number}>>([]);
  const lastGpsUpdateTime = useRef<number>(Date.now()); // Timestamp dernière MAJ GPS
  const lastGpsSpeed = useRef<number>(0); // Dernière vitesse GPS reçue
  const [elevationGain, setElevationGain] = useState(0);
  const [elevationLoss, setElevationLoss] = useState(0);
  const [minAltitude, setMinAltitude] = useState<number | null>(null);
  const [maxAltitude, setMaxAltitude] = useState<number | null>(null);
  const [lastAltitude, setLastAltitude] = useState<number | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0); // État pour forcer les re-renders
  
  // Splits et chronométrage avancé
  const [splits, setSplits] = useState<Array<{
    km: number;
    time: number;
    duration: number;
    avgSpeed: number;
    type: 'auto' | 'manual';
    timestamp: number;
  }>>([]);
  const [lastSplitDistance, setLastSplitDistance] = useState(0);
  
  // Données pour graphiques
  const [chartData, setChartData] = useState<Array<{
    time: number;           // Temps écoulé en ms
    altitude: number | null; // Altitude en m
    speed: number;          // Vitesse instantanée km/h
    distance: number;       // Distance parcourue km
    timestamp: number;      // Timestamp réel
  }>>([]);
  
  // Points d'intérêt
  const [pointsOfInterest, setPointsOfInterest] = useState<Array<{
    id: string;
    latitude: number;
    longitude: number;
    altitude?: number;
    distance: number;       // Distance au moment où créé
    time: number;          // Temps écoulé
    title: string;
    note?: string;
    photo?: string;        // URI de la photo
    timestamp: number;     // Timestamp réel
  }>>([]);
  
  const stepInterval = useRef<any>(null);
  const gpsPollingInterval = useRef<any>(null);
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
    setAddress,
    setPermission,
    setError,
    setIsLocating,
    setWatchSubscription,
  } = useLocationStore();

  // Localisation automatique au premier chargement si pas de coordonnées
  useEffect(() => {
    if (selectedSport && !coords) {
      console.log("🎯 Sport sélectionné mais pas de coords, localisation auto");
      getLocationForTracking();
    }
  }, [selectedSport, coords]);

  const getLocationForTracking = async () => {
    console.log("🎯 Localisation automatique pour le tracking");
    setIsLocating(true);
    setError(null);

    try {
      const result = await LocationHelper.getFullLocation();
      
      if (result.error) {
        console.log("❌ Erreur localisation tracking:", result.error);
        setError(`Tracking: ${result.error}`);
        return;
      }

      if (result.coords) {
        console.log("📍 Position obtenue pour tracking:", result.coords);
        setCoords(result.coords);
        setAddress(result.address);
      }
    } catch (error) {
      console.log("❌ Erreur localisation tracking:", error);
      setError("Impossible de localiser pour le tracking");
    } finally {
      setIsLocating(false);
    }
  };

  // Configuration GPS optimisée pour la précision
  const getSportConfig = () => {
    if (!selectedSport) {
      return {
        maxSpeed: 35,
        minDistance: 0.005, // 5m minimum pour éviter le bruit GPS
        timeInterval: 2000,  // 2s pour laisser le GPS se stabiliser
        distanceInterval: 5, // 5m minimum entre updates
        accuracyThreshold: 20 // Précision minimum acceptée
      };
    }

    // Configuration optimisée selon le sport pour éliminer les erreurs GPS
    const sportConfigs: Record<string, any> = {
      'Course': {
        maxSpeed: 25, // km/h max réaliste
        minDistance: 0.008, // 8m minimum - élimine la plupart du bruit GPS
        timeInterval: 1000,  // 1s pour réactivité Strava
        distanceInterval: 1, // 1m pour updates fréquentes
        accuracy: Location.Accuracy.BestForNavigation,
        accuracyThreshold: 15 // Très précis requis pour course
      },
      'Trail': {
        maxSpeed: 20,
        minDistance: 0.010, // 10m - terrain difficile, GPS moins précis
        timeInterval: 3000,  // 3s - terrain variable
        distanceInterval: 8,
        accuracy: Location.Accuracy.BestForNavigation,
        accuracyThreshold: 20
      },
      'Marche': {
        maxSpeed: 8,
        minDistance: 0.002, // 2m - réactif mais stable
        timeInterval: 1000,  // 1s pour réactivité
        distanceInterval: 1, // 1m pour updates fréquentes
        accuracy: Location.Accuracy.BestForNavigation,
        accuracyThreshold: 20
      },
      'Randonnée': {
        maxSpeed: 10,
        minDistance: 0.010, // 10m - terrain montagneux
        timeInterval: 4000,  // 4s - économie batterie en montagne
        distanceInterval: 10,
        accuracy: Location.Accuracy.High,
        accuracyThreshold: 25 // GPS moins précis en montagne
      },
      'VTT': {
        maxSpeed: 45,
        minDistance: 0.015, // 15m - vitesse élevée, moins de points
        timeInterval: 1500,  // 1.5s - rapide
        distanceInterval: 10,
        accuracy: Location.Accuracy.BestForNavigation,
        accuracyThreshold: 20
      },
      'Vélo': {
        maxSpeed: 50,
        minDistance: 0.020, // 20m - route, vitesse constante
        timeInterval: 2000,  // 2s
        distanceInterval: 15,
        accuracy: Location.Accuracy.BestForNavigation,
        accuracyThreshold: 15
      }
    };

    return sportConfigs[selectedSport.nom] || {
      maxSpeed: 35,
      minDistance: 0.008,
      timeInterval: 2500,
      distanceInterval: 8,
      accuracy: Location.Accuracy.High,
      accuracyThreshold: 20
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

  // Calculer les pas directement basé sur la distance - pas d'interval
  useEffect(() => {
    if (status === "running" && selectedSport && distance > 0) {
      const stepsPerKmMap: Record<string, number> = {
        Course: 1300,
        Trail: 1400,
        Marche: 1250,
        Randonnée: 1200,
        Escalade: 800,
      };
      const stepsPerKm = stepsPerKmMap[selectedSport.nom] || 1200;

      // Calcul direct des pas basé sur la distance
      const calculatedSteps = Math.round(distance * stepsPerKm);
      setSteps(calculatedSteps);
      
      // Log pas calculés supprimé
    }
    
    // Plus besoin d'interval - nettoyage
    if (stepInterval.current) {
      clearInterval(stepInterval.current);
      stepInterval.current = null;
    }
  }, [status, selectedSport, distance]);

  // Calculer distance et vitesse avec filtrage GPS amélioré
  useEffect(() => {
    if (coords && status === "running") {
      const config = getSportConfig();
      
      // Débogage GPS
      console.log(`📡 GPS Update - Précision: ${coords.accuracy?.toFixed(1)}m, Seuil: ${config.accuracyThreshold}m`);
      
      setLocationHistory((prev) => {
        const newHistory = [...prev, coords].slice(-10);
        return newHistory;
      });

      // Ajouter le point au tracé avec seuil de précision adapté
      const accuracyThreshold = config.accuracyThreshold || 25;
      if (coords.accuracy && coords.accuracy <= accuracyThreshold) {
        setTrackingPath((prev) => {
          const newPoint = {
            latitude: coords.latitude,
            longitude: coords.longitude
          };
          
          // Éviter les doublons trop proches - distance adaptée au sport
          if (prev.length > 0) {
            const lastPoint = prev[prev.length - 1];
            const distance = calculateSimpleDistance(lastPoint, newPoint);
            const config = getSportConfig();
            
            // Distance minimale adaptée au sport et à la précision GPS
            const minTrackingDistance = Math.max(config.minDistance, 0.002); // 2m minimum absolu
            if (distance < minTrackingDistance) {
              return prev;
            }
          }
          
          return [...prev, newPoint];
        });
      }

      // Calcul du dénivelé si on a l'altitude
      if (coords.altitude && status === "running") {
        // Initialiser les altitudes min/max au premier point
        if (minAltitude === null || maxAltitude === null) {
          setMinAltitude(coords.altitude);
          setMaxAltitude(coords.altitude);
        } else {
          // Mettre à jour min/max
          if (coords.altitude < minAltitude) setMinAltitude(coords.altitude);
          if (coords.altitude > maxAltitude) setMaxAltitude(coords.altitude);
        }

        // Calculer gain/perte d'altitude
        if (lastAltitude !== null) {
          const altitudeDiff = coords.altitude - lastAltitude;
          
          // Seuil adaptatif selon l'altitude pour La Réunion (0-3070m)
          // Plus l'altitude est élevée, plus on accepte de variation (pression atmosphérique)
          const currentAltitude = coords.altitude;
          let threshold = 1; // Base: 1m
          
          if (currentAltitude > 2000) {
            threshold = 3; // Haute montagne: 3m (Piton des Neiges, Maïdo)
          } else if (currentAltitude > 1000) {
            threshold = 2; // Moyenne montagne: 2m (Cilaos, volcans)
          }
          
          if (Math.abs(altitudeDiff) > threshold) {
            if (altitudeDiff > 0) {
              setElevationGain(prev => prev + altitudeDiff);
            } else {
              setElevationLoss(prev => prev + Math.abs(altitudeDiff));
            }
          }
        }
        
        setLastAltitude(coords.altitude);
      }

      if (lastCoords) {
        const newDist = calculateSimpleDistance(lastCoords, coords);
        const timeDiff = (coords.timestamp - lastCoords.timestamp) / 1000;

        if (!Number.isFinite(timeDiff)) {
          setLastCoords(coords);
          return;
        }

        // Si doublon timestamp (timeDiff <= 0), juste mettre à jour refs et skip calculs
        if (timeDiff <= 0) {
          // Ne pas logger pour ne pas polluer les logs
          lastGpsUpdateTime.current = Date.now(); // MAJ pour éviter "Arrêt détecté"
          return; // NE PAS mettre à jour lastCoords pour garder le dernier point valide
        }

        const isDistanceValid = true;

        if (isDistanceValid) {
          console.log(`✅ Point accepté - ${(newDist * 1000).toFixed(1)}m / ${timeDiff.toFixed(1)}s = ${((newDist / timeDiff) * 3600).toFixed(1)} km/h`);

          setDistance((prev) => {
            const newTotalDistance = prev + newDist;
            const prevKm = Math.floor(prev);
            const newKm = Math.floor(newTotalDistance);

            if (newKm > prevKm) {
              const currentTime = getDuration();

              for (let km = prevKm + 1; km <= newKm; km++) {
                const lastSplitTime = splits.length > 0 ? splits[splits.length - 1].time : 0;
                const splitTime = currentTime - lastSplitTime;

                setSplits(prevSplits => [...prevSplits, {
                  km,
                  time: currentTime,
                  duration: splitTime,
                  avgSpeed: splitTime > 0 ? (3600000 / splitTime) : 0,
                  type: 'auto',
                  timestamp: Date.now()
                }]);

                console.log(`🚴 Split automatique ${km}km - Distance réelle: ${newTotalDistance.toFixed(3)}km - Temps split: ${splitTime}ms`);
              }
            }

            console.log(`📏 Distance totale: ${newTotalDistance.toFixed(3)} km`);
            return newTotalDistance;
          });
        }

        // Utiliser vitesse native GPS (m/s) en priorité, sinon calculer
        let rawSpeedKmh;
        const config = getSportConfig();
        const maxReasonableSpeed = config.maxSpeed * 2; // 2x vitesse max du sport

        // Si précision GPS mauvaise (>50m), ignorer ce point
        if (coords.accuracy && coords.accuracy > 50) {
          console.log(`⚠️ GPS imprécis (${coords.accuracy.toFixed(0)}m), point ignoré`);
          lastGpsUpdateTime.current = Date.now();
          return; // Skip ce point
        }

        if (coords.speed !== null && coords.speed !== undefined && coords.speed >= 0) {
          // Vitesse GPS native en m/s → km/h
          rawSpeedKmh = coords.speed * 3.6;

          // Filtrer vitesses aberrantes
          if (rawSpeedKmh > maxReasonableSpeed) {
            console.log(`🚫 Vitesse aberrante: ${rawSpeedKmh.toFixed(1)} km/h, utilise calculée`);
            rawSpeedKmh = (newDist / timeDiff) * 3600;
          } else {
            console.log(`🛰️ Vitesse GPS: ${rawSpeedKmh.toFixed(1)} km/h`);
          }
        } else {
          // Fallback: calculer depuis distance/temps
          rawSpeedKmh = (newDist / timeDiff) * 3600;
          console.log(`📐 Vitesse calculée: ${rawSpeedKmh.toFixed(1)} km/h`);
        }

        // Double filtrage aberration
        if (rawSpeedKmh > maxReasonableSpeed) {
          console.log(`🚫 Vitesse ${rawSpeedKmh.toFixed(1)} km/h rejetée (max: ${maxReasonableSpeed.toFixed(1)})`);
          rawSpeedKmh = 0;
        }

        setSpeedHistory(prevHistory => {
          // Historique réduit à 5 points pour plus de réactivité
          const newHistory = [...prevHistory, rawSpeedKmh].slice(-5);

          // Au début (< 3 points), afficher vitesse brute pour réactivité immédiate
          if (newHistory.length < 3) {
            const finalSpeed = rawSpeedKmh < 0.1 ? 0 : rawSpeedKmh;
            setInstantSpeed(finalSpeed);
            lastGpsSpeed.current = finalSpeed;
            lastGpsUpdateTime.current = Date.now();

            if (finalSpeed > 0) {
              setMaxSpeed(prevMax => finalSpeed > prevMax ? finalSpeed : prevMax);
              console.log(`📊 Vitesse initiale: ${finalSpeed.toFixed(1)} km/h (démarrage)`);
            }

            return newHistory;
          }

          // Médiane pour éliminer valeurs aberrantes
          const sorted = [...newHistory].sort((a, b) => a - b);
          const medianSpeed = sorted[Math.floor(sorted.length / 2)];

          // Moyenne mobile sur 3 derniers points
          const recentPoints = newHistory.slice(-3);
          const movingAvg = recentPoints.reduce((sum, s) => sum + s, 0) / recentPoints.length;

          // EMA avec alpha plus élevé pour réactivité
          const alpha = 0.6; // Plus réactif qu'avant (0.3)
          const emaSpeed = lastGpsSpeed.current === 0
            ? rawSpeedKmh // Première valeur = vitesse brute
            : (alpha * rawSpeedKmh) + ((1 - alpha) * lastGpsSpeed.current);

          // Combinaison finale: 50% vitesse brute + 30% EMA + 20% médiane
          // Favorise réactivité tout en gardant stabilité
          let finalSpeed = (rawSpeedKmh * 0.5) + (emaSpeed * 0.3) + (medianSpeed * 0.2);

          // Seuil ultra bas pour détecter tout mouvement
          finalSpeed = finalSpeed < 0.1 ? 0 : finalSpeed;

          setInstantSpeed(finalSpeed);
          lastGpsSpeed.current = finalSpeed;

          // Mise à jour vitesse max
          setMaxSpeed(prevMax => {
            if (finalSpeed > prevMax) {
              console.log(`🏁 Vitesse max: ${finalSpeed.toFixed(1)} km/h`);
              return finalSpeed;
            }
            return prevMax;
          });

          console.log(`📊 Vitesse finale: ${finalSpeed.toFixed(1)} km/h`);

          // MAJ timestamp pour détection arrêt
          lastGpsUpdateTime.current = Date.now();

          return newHistory;
        });

        const shouldRecordChart = isDistanceValid || timeDiff >= 2;
        if (shouldRecordChart) {
          const currentTime = getDuration();
          setChartData(prev => {
            const lastEntry = prev[prev.length - 1];
            const shouldSample = !lastEntry || (currentTime - lastEntry.time) >= 5000;

            if (shouldSample && status === "running") {
              return [...prev, {
                time: currentTime,
                altitude: coords.altitude || null,
                speed: rawSpeedKmh,
                distance: distance + (isDistanceValid ? newDist : 0),
                timestamp: Date.now()
              }];
            }
            return prev;
          });
        }
      }
      // Toujours mettre à jour lastCoords
      setLastCoords(coords);
      // Mettre à jour le timestamp de dernière MAJ GPS
      lastGpsUpdateTime.current = Date.now();
    } // Fin if (coords && status === "running")
  }, [coords, status, lastCoords, selectedSport]);

  // Calculer la vitesse moyenne séparément
  useEffect(() => {
    if (distance > 0 && duration > 0) {
      const hours = duration / (1000 * 60 * 60);
      setAvgSpeed(distance / hours);
    } else {
      setAvgSpeed(0);
    }
  }, [distance, duration]);

  // Détection d'arrêt automatique si pas de MAJ GPS
  useEffect(() => {
    if (status !== "running") return;

    const checkStopTimeout = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastGpsUpdateTime.current;
      // Si pas de MAJ GPS depuis 2s → arrêt, vitesse à 0
      if (timeSinceLastUpdate > 2000 && instantSpeed > 0) {
        console.log(`⏸️ Arrêt détecté - Pas de MAJ GPS depuis ${(timeSinceLastUpdate/1000).toFixed(1)}s`);
        setInstantSpeed(0);
      }
    }, 1000);

    return () => clearInterval(checkStopTimeout);
  }, [status, instantSpeed]);

  // Mise à jour fluide de la vitesse toutes les secondes (type Strava)
  useEffect(() => {
    if (status !== "running") return;

    const speedUpdateInterval = setInterval(() => {
      const timeSinceLastGPS = Date.now() - lastGpsUpdateTime.current;

      // Si GPS reçu récemment (< 3s), afficher la dernière vitesse GPS
      if (timeSinceLastGPS < 3000 && lastGpsSpeed.current > 0) {
        setInstantSpeed(lastGpsSpeed.current);
      }
    }, 1000); // Mise à jour fluide chaque seconde

    return () => clearInterval(speedUpdateInterval);
  }, [status]);

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

  // Détection d'arrêt : si pas de GPS pendant 2s, vitesse à 0
  useEffect(() => {
    if (status !== "running") return;

    const stopDetectionInterval = setInterval(() => {
      const timeSinceLastGPS = Date.now() - lastGpsUpdateTime.current;

      if (timeSinceLastGPS > 2000 && instantSpeed > 0) {
        console.log(`⏸️ Arrêt détecté - Pas de GPS depuis ${(timeSinceLastGPS / 1000).toFixed(1)}s`);
        setInstantSpeed(0);
      }
    }, 1000);

    return () => clearInterval(stopDetectionInterval);
  }, [status, instantSpeed]);

  // Fonction de calcul de distance ultra-précise (formule de Vincenty simplifiée)
  const calculateSimpleDistance = (coord1: any, coord2: any) => {
    // Rayon terrestre moyen en km (plus précis que 6371)
    const R = 6371.008;
    
    // Conversion en radians
    const lat1 = (coord1.latitude * Math.PI) / 180;
    const lat2 = (coord2.latitude * Math.PI) / 180;
    const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    // Formule de Haversine améliorée pour petites distances
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    // Distance en km
    const distance = R * c;
    
    // Pour les très petites distances, vérification de cohérence
    if (distance < 0.001) { // Moins d'1 mètre
      return 0; // Considérer comme pas de mouvement
    }
    
    return distance;
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
      setWatching(false);

      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== "granted") {
        setError("Permission GPS requise pour le tracking");
        setPermission(false);
        setIsLocating(false);
        return false;
      }

      setPermission(true);

      // Polling GPS manuel ultra-rapide (500ms) type Strava
      // watchPositionAsync ne respecte pas timeInterval sur Android
      let lastPollTimestamp = 0;

      const pollGPS = async () => {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });

          // Ignorer si c'est exactement le même timestamp (cached)
          if (location.timestamp === lastPollTimestamp) {
            return;
          }

          lastPollTimestamp = location.timestamp;

          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            timestamp: location.timestamp || Date.now(),
          };
          setCoords(coords);
        } catch (error) {
          // Ignorer erreurs silencieusement pour ne pas polluer logs
        }
      };

      // Premier poll immédiat
      await pollGPS();

      // Puis polling toutes les 500ms
      gpsPollingInterval.current = setInterval(pollGPS, 500);

      setWatching(true);
      setIsLocating(false);
      console.log('✅ GPS tracking démarré (polling 500ms)');
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
    // Nettoyer le polling interval
    if (gpsPollingInterval.current) {
      clearInterval(gpsPollingInterval.current);
      gpsPollingInterval.current = null;
      console.log('⏹️ GPS polling arrêté');
    }

    // Nettoyer aussi watchSubscription si existe
    const { watchSubscription } = useLocationStore.getState();
    if (watchSubscription) {
      watchSubscription.remove();
      setWatchSubscription(null);
    }

    setWatching(false);
    setLocationHistory([]);
  };

  // Actions de tracking
  const handleStartTracking = async () => {
    // Réinitialiser l'état d'erreur avant de commencer
    setError(null);
    
    // Générer un sessionId unique seulement s'il n'y en a pas déjà un
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(currentSessionId);
      // Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem('currentSessionId', currentSessionId);
      console.log('🆔 Nouveau sessionId créé et sauvegardé:', currentSessionId);

      // Créer la session sur MongoDB immédiatement
      try {
        const initialSessionData = {
          sessionId: currentSessionId,
          userId: 'default-user',
          sport: selectedSport,
          startLocation: coords ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
            address: address || 'Position inconnue'
          } : null,
          startTime: new Date().toISOString(),
          distance: 0,
          duration: 0,
          averageSpeed: 0,
          maxSpeed: 0,
          elevationGain: 0,
          calories: 0,
          steps: 0,
          photos: [],
          status: 'active'
        };

        const response = await fetch('http://192.168.1.12:3001/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(initialSessionData)
        });

        if (response.ok) {
          const responseData = await response.json();
          const serverSessionId = responseData.data?.id || responseData.data?.sessionId;
          if (serverSessionId && serverSessionId !== currentSessionId) {
            // Le serveur a retourné un ID différent, utilisons celui-ci
            setSessionId(serverSessionId);
            await AsyncStorage.setItem('currentSessionId', serverSessionId);
            console.log('🔄 SessionId mis à jour avec l\'ID serveur:', serverSessionId);
          } else {
            console.log('✅ Session créée sur MongoDB avec ID:', currentSessionId);
          }
        } else {
          console.log('⚠️ Échec création session MongoDB, continuera en local');
        }
      } catch (error) {
        console.log('⚠️ Erreur création session MongoDB:', error.message);
      }
    } else {
      console.log('🆔 SessionId existant conservé:', currentSessionId);
    }
    
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

  // Sauvegarder les performances quotidiennes
  const saveDailyPerformance = async (finalDuration: number) => {
    if (!sessionId || !selectedSport) return;
    
    try {
      const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
      const statsKey = `daily_stats_${today}`;
      
      // Calculer les performances de cette session
      const sessionPerformance = {
        distance: distance,
        duration: finalDuration,
        calories: calculateCalories(),
        avgSpeed: avgSpeed,
        maxSpeed: maxSpeed,
        steps: steps,
        sport: selectedSport.nom,
        sessionId: sessionId,
        timestamp: Date.now()
      };
      
      // Préparer les données pour MongoDB
      const sessionData = {
        sessionId: sessionId,
        userId: 'default-user', // Sera remplacé par l'authentification plus tard
        sport: {
          nom: selectedSport.nom,
          emoji: selectedSport.emoji || '🏃'
        },
        distance: distance * 1000, // Convertir km en mètres pour MongoDB
        duration: finalDuration,
        calories: calculateCalories(),
        avgSpeed: avgSpeed,
        maxSpeed: maxSpeed,
        steps: steps,
        trackingPath: trackingPath.map((point, index) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: Date.now() - finalDuration + (index * 1000), // Timestamp approximatif
          accuracy: 10 // Valeur par défaut
        })),
        pois: pointsOfInterest.map(poi => ({
          id: poi.id,
          title: poi.title,
          note: poi.note,
          coordinates: {
            latitude: poi.latitude,
            longitude: poi.longitude
          },
          photo: poi.photo,
          timestamp: poi.timestamp
        })),
        status: 'completed'
      };

      // Sauvegarder dans MongoDB
      try {
        const response = await fetch('http://192.168.1.12:3001/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sessionData)
        });

        if (response.ok) {
          const savedSession = await response.json();
          const finalSessionId = savedSession.data?.id || savedSession.data?.sessionId;
          console.log('✅ Session sauvegardée dans MongoDB:', finalSessionId);

          // Mettre à jour l'ID local si le serveur a retourné un ID différent
          if (finalSessionId && finalSessionId !== sessionId) {
            setSessionId(finalSessionId);
            await AsyncStorage.setItem('currentSessionId', finalSessionId);
            console.log('🔄 SessionId mis à jour après sauvegarde:', finalSessionId);
          }
        } else {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
      } catch (mongoError) {
        console.error('❌ Erreur MongoDB, fallback AsyncStorage:', mongoError);
        
        // Fallback: continuer avec AsyncStorage si MongoDB échoue
        const existingStatsJson = await AsyncStorage.getItem(statsKey);
        let dayPerformance = existingStatsJson ? JSON.parse(existingStatsJson) : {
          totalDistance: 0,
          totalTime: 0,
          totalCalories: 0,
          avgSpeed: 0,
          sessions: 0,
          maxSpeed: 0,
          totalSteps: 0,
          sessionsList: []
        };
        
        // Mettre à jour les stats du jour
        dayPerformance.totalDistance += distance;
        dayPerformance.totalTime += finalDuration;
        dayPerformance.totalCalories += calculateCalories();
        dayPerformance.sessions += 1;
        dayPerformance.maxSpeed = Math.max(dayPerformance.maxSpeed, maxSpeed);
        dayPerformance.totalSteps += steps;
        dayPerformance.avgSpeed = (dayPerformance.totalTime > 0) ? 
          ((dayPerformance.totalDistance / (dayPerformance.totalTime / 3600000)) || 0) : 0;
        
        // Ajouter cette session à la liste
        dayPerformance.sessionsList = dayPerformance.sessionsList || [];
        dayPerformance.sessionsList.push(sessionPerformance);
        
        // Sauvegarder en local
        await AsyncStorage.setItem(statsKey, JSON.stringify(dayPerformance));
        console.log('📱 Sauvegarde AsyncStorage (fallback)');
      }

      // Maintenir aussi la sauvegarde locale pour l'historique existant
      const existingStatsJson = await AsyncStorage.getItem(statsKey);
      let dayPerformance = existingStatsJson ? JSON.parse(existingStatsJson) : {
        totalDistance: 0,
        totalTime: 0,
        totalCalories: 0,
        avgSpeed: 0,
        sessions: 0,
        maxSpeed: 0,
        totalSteps: 0,
        sessionsList: []
      };
      
      // Mettre à jour les stats du jour
      dayPerformance.totalDistance += distance;
      dayPerformance.totalTime += finalDuration;
      dayPerformance.totalCalories += calculateCalories();
      dayPerformance.sessions += 1;
      dayPerformance.maxSpeed = Math.max(dayPerformance.maxSpeed, maxSpeed);
      dayPerformance.totalSteps += steps;
      dayPerformance.avgSpeed = (dayPerformance.totalTime > 0) ? 
        ((dayPerformance.totalDistance / (dayPerformance.totalTime / 3600000)) || 0) : 0;
      
      // Ajouter cette session à la liste
      dayPerformance.sessionsList = dayPerformance.sessionsList || [];
      dayPerformance.sessionsList.push(sessionPerformance);
      
      // Sauvegarder aussi en local
      await AsyncStorage.setItem(statsKey, JSON.stringify(dayPerformance));
      
      console.log('📊 Session sauvegardée:', {
        date: today,
        sessionId: sessionId,
        sport: selectedSport.nom,
        distance: distance.toFixed(2) + 'km'
      });
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde performances:', error);
    }
  };

  const handleStopTracking = async () => {
    stop();
    stopLocationTracking();
    const finalDuration = getDuration();
    
    // Demander confirmation pour sauvegarder
    Alert.alert(
      "Enregistrer la session ?",
      `Durée: ${Math.floor(finalDuration / 60000)}min ${Math.floor((finalDuration % 60000) / 1000)}s\nDistance: ${distance.toFixed(2)}km`,
      [
        {
          text: "Non",
          style: "cancel",
          onPress: async () => {
            // Reset direct sans sauvegarde
            // Supprimer le sessionId pour éviter les conflits lors de la prochaine session
            try {
              await AsyncStorage.removeItem('currentSessionId');
              console.log('🗑️ SessionId supprimé (session non sauvegardée)');
            } catch (error) {
              console.error('Erreur suppression sessionId:', error);
            }
            resetTracking();
          }
        },
        {
          text: "Oui", 
          onPress: async () => {
            // Sauvegarder puis stop session
            await saveDailyPerformance(finalDuration);
            // Garder le sessionId pour permettre l'ajout de photos après session
            console.log('💾 Session sauvegardée, sessionId conservé pour photos futures:', sessionId);
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
    setDistance(0);
    setLastCoords(null);
    setInstantSpeed(0);
    setMaxSpeed(0);
    setAvgSpeed(0);
    setSpeedHistory([]);
    speedWindowRef.current = [];
    setTrackingPath([]);
    setElevationGain(0);
    setElevationLoss(0);
    setMinAltitude(null);
    setMaxAltitude(null);
    setLastAltitude(null);
    setSplits([]);
    setLastSplitDistance(0);
    setChartData([]);
    pausedSteps.current = 0;
    pausedDistance.current = 0;
  };

  const handleBackToSelection = async () => {
    resetTracking();
    stopLocationTracking();
    setInitialPermissionChecked(false); // Reset pour la prochaine sélection
    setSessionId(null); // Reset complet - nouvelle session
    
    // Nettoyer AsyncStorage
    try {
      await AsyncStorage.removeItem('currentSessionId');
      console.log('🧹 SessionId supprimé d\'AsyncStorage');
    } catch (error) {
      console.error('❌ Erreur suppression sessionId:', error);
    }
  };

  // Navigation temporaire sans perdre la session
  const handleNavigateAway = () => {
    // Pas de resetTracking() - on garde tout l'état
    console.log('🧭 Navigation temporaire - sessionId conservé:', sessionId);
  };

  const handleNewSession = () => {
    resetTracking();
  };

  // Fonction pour créer un split manuel
  const handleManualSplit = () => {
    if (status === "running" && distance > 0) {
      const currentTime = getDuration();
      const lastSplitTime = splits.length > 0 ? splits[splits.length - 1].time : 0;
      const splitTime = currentTime - lastSplitTime;
      
      // Éviter les splits trop rapprochés (minimum 10 secondes)
      if (splitTime < 10000) {
        console.log(`⚠️ Split manuel ignoré - trop rapproché (${splitTime}ms)`);
        return;
      }
      
      const previousSplitDistance = splits.length > 0 ? 
        (splits[splits.length - 1].type === 'auto' ? splits[splits.length - 1].km : 0) : 0;
      const distanceSinceLastSplit = distance - previousSplitDistance;
      
      setSplits(prevSplits => [...prevSplits, {
        km: Math.round(distance * 100) / 100, // Distance avec 2 décimales
        time: currentTime,
        duration: splitTime,
        avgSpeed: splitTime > 0 && distanceSinceLastSplit > 0 ? 
          (distanceSinceLastSplit * 3600000 / splitTime) : 0,
        type: 'manual',
        timestamp: Date.now()
      }]);
      
      console.log(`⏱️ Split manuel - Distance: ${distance.toFixed(2)}km - Temps split: ${splitTime}ms - Vitesse: ${distanceSinceLastSplit > 0 ? (distanceSinceLastSplit * 3600000 / splitTime).toFixed(1) : 0} km/h`);
    }
  };
  
  // Calculer les statistiques des splits
  const getSplitStats = () => {
    if (splits.length === 0) return null;
    
    const autoSplits = splits.filter(s => s.type === 'auto');
    if (autoSplits.length === 0) return null;
    
    const durations = autoSplits.map(s => s.duration);
    const avgSplitTime = durations.reduce((a, b) => a + b, 0) / durations.length;
    const bestSplit = Math.min(...durations);
    const worstSplit = Math.max(...durations);
    
    return {
      bestSplit,
      worstSplit,
      avgSplitTime,
      totalSplits: splits.length,
      autoSplits: autoSplits.length
    };
  };

  return {
    // État
    status,
    sessionId,
    duration,
    steps,
    distance,
    instantSpeed: instantSpeed,
    maxSpeed,
    avgSpeed: calculateSpeed(false),
    calories: calculateCalories(),
    coords,
    address,
    watching,
    locationError,
    trackingPath,
    
    // Dénivelé
    elevationGain,
    elevationLoss,
    minAltitude,
    maxAltitude,
    
    // Chronométrage avancé
    splits,
    splitStats: getSplitStats(),
    
    // Données pour graphiques
    chartData,
    
    // Force update pour synchronisation UI
    _forceUpdate: forceUpdate,
    
    // Actions
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

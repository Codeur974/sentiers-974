import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../../store/useLocationStore';
import { LocationHelper } from '../../utils/locationUtils';
import { logger } from '../../utils/logger';

/**
 * Hook spécialisé pour la gestion des coordonnées et localisation
 * Gère: permissions, coordonnées, adresses, tracking path, location history
 */
export function useTrackingLocation() {
  const [lastCoords, setLastCoords] = useState<any>(null);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [trackingPath, setTrackingPath] = useState<Array<{latitude: number; longitude: number}>>([]);
  const [initialPermissionChecked, setInitialPermissionChecked] = useState(false);
  
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

  // Localisation automatique au premier chargement
  useEffect(() => {
    if (!coords && !initialPermissionChecked) {
      checkAndRequestPermissions();
      setInitialPermissionChecked(true);
    }
  }, [coords, initialPermissionChecked]);

  // Vérification et demande de permissions
  const checkAndRequestPermissions = async () => {
    try {
      logger.gps('Vérification permissions localisation');
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setPermission('denied');
        setError('Permission de localisation refusée');
        logger.error('Permissions localisation refusées');
        return false;
      }

      setPermission('granted');
      logger.gps('Permissions accordées');
      
      // Demander aussi la permission en arrière-plan pour un tracking continu
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus === 'granted') {
        logger.gps('Permission arrière-plan accordée');
      }
      
      return true;
    } catch (error) {
      logger.error('Erreur permissions:', error);
      setError(`Erreur permissions: ${error}`);
      return false;
    }
  };

  // Obtenir la position actuelle
  const getCurrentLocation = useCallback(async (enableHighAccuracy = true) => {
    if (!await checkAndRequestPermissions()) {
      return null;
    }

    try {
      setIsLocating(true);
      logger.gps('Récupération position actuelle');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: enableHighAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
        timeout: 15000,
      });

      const newCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: location.timestamp
      };

      setCoords(newCoords);
      setLastCoords(newCoords);
      setError(null);
      
      logger.gps('Position obtenue', {
        lat: newCoords.latitude.toFixed(6),
        lon: newCoords.longitude.toFixed(6),
        accuracy: newCoords.accuracy?.toFixed(1)
      });

      return newCoords;
    } catch (error) {
      logger.error('Erreur getCurrentLocation:', error);
      setError(`Erreur localisation: ${error}`);
      return null;
    } finally {
      setIsLocating(false);
    }
  }, [setCoords, setError, setIsLocating, setLastCoords]);

  // Démarrer le tracking GPS
  const startLocationTracking = useCallback(async () => {
    if (!await checkAndRequestPermissions()) {
      return false;
    }

    try {
      logger.gps('Démarrage tracking GPS');
      
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Mise à jour chaque seconde
          distanceInterval: 5, // Ou tous les 5 mètres
        },
        (location) => {
          const newCoords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            heading: location.coords.heading,
            timestamp: location.timestamp
          };

          // Filtrer les coordonnées avec une précision trop faible
          if (newCoords.accuracy && newCoords.accuracy > 50) {
            logger.warn('Précision GPS trop faible', { accuracy: newCoords.accuracy });
            return;
          }

          setCoords(newCoords);
          
          // Ajouter à l'historique
          setLocationHistory(prev => {
            const newHistory = [...prev, newCoords];
            // Garder seulement les 1000 derniers points
            if (newHistory.length > 1000) {
              return newHistory.slice(-1000);
            }
            return newHistory;
          });

          // Ajouter au parcours si c'est différent du dernier point
          if (lastCoords) {
            const distance = LocationHelper.calculateDistance(
              lastCoords.latitude,
              lastCoords.longitude,
              newCoords.latitude,
              newCoords.longitude
            );
            
            // Ajouter seulement si on a bougé d'au moins 5 mètres
            if (distance >= 5) {
              setTrackingPath(prev => [...prev, {
                latitude: newCoords.latitude,
                longitude: newCoords.longitude
              }]);
            }
          }

          setLastCoords(newCoords);
        }
      );

      setWatchSubscription(subscription);
      setWatching(true);
      logger.gps('Tracking GPS actif');
      return true;
    } catch (error) {
      logger.error('Erreur startLocationTracking:', error);
      setError(`Erreur tracking: ${error}`);
      return false;
    }
  }, [checkAndRequestPermissions, lastCoords, setCoords, setWatchSubscription, setWatching, setError]);

  // Arrêter le tracking GPS
  const stopLocationTracking = useCallback(async () => {
    try {
      const { watchSubscription } = useLocationStore.getState();
      if (watchSubscription) {
        watchSubscription.remove();
        setWatchSubscription(null);
      }
      setWatching(false);
      logger.gps('Tracking GPS arrêté');
    } catch (error) {
      logger.error('Erreur stopLocationTracking:', error);
    }
  }, [setWatching, setWatchSubscription]);

  // Obtenir l'adresse à partir des coordonnées
  const getAddressFromCoords = useCallback(async (latitude: number, longitude: number) => {
    try {
      logger.gps('Récupération adresse');
      const addressResults = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addressResults && addressResults.length > 0) {
        const addr = addressResults[0];
        const formattedAddress = LocationHelper.formatAddress(addr);
        setAddress(formattedAddress);
        logger.gps('Adresse trouvée', { address: formattedAddress });
        return formattedAddress;
      }
      return null;
    } catch (error) {
      logger.error('Erreur getAddressFromCoords:', error);
      return null;
    }
  }, [setAddress]);

  // Reset des données de localisation
  const resetLocation = useCallback(() => {
    logger.gps('Reset données localisation');
    setLastCoords(null);
    setLocationHistory([]);
    setTrackingPath([]);
    setCoords(null);
    setAddress('');
    setError(null);
  }, [setCoords, setAddress, setError]);

  // Calculer la distance totale du parcours
  const calculateTotalDistance = useCallback(() => {
    if (trackingPath.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < trackingPath.length; i++) {
      const distance = LocationHelper.calculateDistance(
        trackingPath[i-1].latitude,
        trackingPath[i-1].longitude,
        trackingPath[i].latitude,
        trackingPath[i].longitude
      );
      totalDistance += distance;
    }
    
    return totalDistance;
  }, [trackingPath]);

  return {
    // States
    coords,
    address,
    watching,
    locationError,
    lastCoords,
    locationHistory,
    trackingPath,
    initialPermissionChecked,
    
    // Actions
    checkAndRequestPermissions,
    getCurrentLocation,
    startLocationTracking,
    stopLocationTracking,
    getAddressFromCoords,
    resetLocation,
    calculateTotalDistance,
    
    // Setters
    setTrackingPath,
    setLocationHistory
  };
}
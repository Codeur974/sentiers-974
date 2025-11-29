import { useRef } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../../store/useLocationStore';

/**
 * Hook GPS "style Strava" :
 * - Premier fix agressif (Balanced puis ReducedAccuracy, timeout 8s)
 * - Watch haute précision 1s / 1m pour flux dense
 * - Pas d'impact sur sessions/photos
 */
export const useGPSTracking = (_sportConfig: any) => {
  const hasFirstFix = useRef(false);

  const {
    setCoords,
    setWatching,
    setPermission,
    setError,
    setIsLocating,
    setWatchSubscription,
  } = useLocationStore();

  const startGPSTracking = async () => {
    try {
      hasFirstFix.current = false;
      setIsLocating(true);
      setError(null);
      setWatching(false);

      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== 'granted') {
        setError('Permission GPS requise pour le tracking');
        setPermission(false);
        setIsLocating(false);
        return false;
      }
      setPermission(true);

      // Nettoyer une éventuelle subscription existante
      const { watchSubscription: existing } = useLocationStore.getState();
      if (existing) {
        existing.remove();
        setWatchSubscription(null);
      }

      // Premier fix agressif : Balanced puis ReducedAccuracy, timeout total 8s
      const tryFirstFix = async () => {
        const attempts = [
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, maximumAge: 1000 }),
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Reduced, maximumAge: 2000 }),
        ];
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('first fix timeout')), 8000));
        for (const attempt of attempts) {
          try {
            const loc = await Promise.race([attempt, timeout]) as any;
            if (loc?.coords) return loc;
          } catch (_e) {
            continue;
          }
        }
        throw new Error('first fix failed');
      };

      try {
        const firstLocation = await tryFirstFix();
        const coords = {
          latitude: firstLocation.coords.latitude,
          longitude: firstLocation.coords.longitude,
          altitude: firstLocation.coords.altitude,
          accuracy: firstLocation.coords.accuracy,
          speed: firstLocation.coords.speed,
          timestamp: firstLocation.timestamp || Date.now(),
        };
        hasFirstFix.current = true;
        setCoords(coords);
        setError(null);
        setIsLocating(false);
      } catch {
        // On continue quand même avec le watch
      }

      // Watch haute précision (1s / 1m)
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          if (!location || !location.coords) return;
          hasFirstFix.current = true;
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            timestamp: location.timestamp || Date.now(),
          };
          setCoords(coords);
          setError(null);
          setIsLocating(false);
          setWatching(true);
        }
      );

      setWatchSubscription(subscription);
      setWatching(true);
      setIsLocating(false);
      return true;
    } catch (error) {
      setError('Impossible d\'activer le GPS');
      setIsLocating(false);
      setWatching(false);
      return false;
    }
  };

  const stopGPSTracking = () => {
    const { watchSubscription } = useLocationStore.getState();
    if (watchSubscription) {
      watchSubscription.remove();
      setWatchSubscription(null);
    }
    setWatching(false);
  };

  return {
    startGPSTracking,
    stopGPSTracking,
  };
};

import { useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../../store/useLocationStore';

/**
 * Hook pour gérer le tracking GPS
 * - Polling GPS adaptatif (1-3s selon conditions)
 * - Gestion permissions
 * - Timeout intelligent
 */
export const useGPSTracking = (sportConfig: any) => {
  const gpsPollingInterval = useRef<any>(null);
  const lastPollTimestamp = useRef(0);
  const minPollingInterval = sportConfig?.minPollingInterval ?? 1000;
  const maxPollingInterval = sportConfig?.maxPollingInterval ?? 3000;
  const allowSlowPolling = sportConfig?.allowSlowPolling ?? true;
  const currentPollingInterval = useRef(minPollingInterval);
  const consecutiveTimeouts = useRef(0);

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
      currentPollingInterval.current = minPollingInterval;
      consecutiveTimeouts.current = 0;
      lastPollTimestamp.current = 0;
      setIsLocating(true);
      setError(null);
      setWatching(false);

      // Vérifier permissions
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== 'granted') {
        setError('Permission GPS requise pour le tracking');
        setPermission(false);
        setIsLocating(false);
        return false;
      }

      setPermission(true);

      // Polling GPS adaptatif (ajuste selon conditions)
      const pollGPS = async () => {
        try {
          // Timeout adaptatif : 10s (assez pour GPS satellite pur)
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
            maximumAge: 1000, // Cache récent acceptable
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('GPS timeout')), 10000)
          );

          const location = await Promise.race([locationPromise, timeoutPromise]) as any;

          // Ignorer si c'est le même timestamp (cached)
          if (location.timestamp === lastPollTimestamp.current) {
            return;
          }

          lastPollTimestamp.current = location.timestamp;

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

          // GPS OK → réduire intervalle si possible
          consecutiveTimeouts.current = 0;
          if (currentPollingInterval.current > minPollingInterval) {
            currentPollingInterval.current = Math.max(
              minPollingInterval,
              currentPollingInterval.current - 500
            );
            restartPolling();
          }
        } catch (error: any) {
          consecutiveTimeouts.current++;

          // GPS lent → augmenter intervalle progressivement
          if (
            allowSlowPolling &&
            consecutiveTimeouts.current >= 3 &&
            currentPollingInterval.current < maxPollingInterval
          ) {
            currentPollingInterval.current = Math.min(
              maxPollingInterval,
              currentPollingInterval.current + 500
            );
            restartPolling();
          }
        }
      };

      const restartPolling = () => {
        if (gpsPollingInterval.current) {
          clearInterval(gpsPollingInterval.current);
          gpsPollingInterval.current = setInterval(pollGPS, currentPollingInterval.current);
        }
      };

      // Premier poll immédiat
      await pollGPS();

      // Polling adaptatif (démarre à l'intervalle minimum du sport)
      gpsPollingInterval.current = setInterval(pollGPS, currentPollingInterval.current);

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
    if (gpsPollingInterval.current) {
      clearInterval(gpsPollingInterval.current);
      gpsPollingInterval.current = null;
    }

    // Nettoyer watchSubscription si existe
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

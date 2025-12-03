import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACKING_STATE_KEY = 'tracking_state_v1';

export type TrackingSnapshot = {
  sessionId: string | null;
  status: "idle" | "running" | "paused" | "stopped";
  duration: number;
  selectedSport: any | null;
  coords: any | null;
  address: string | null;
  distance: number;
  trackingPath: Array<{ latitude: number; longitude: number; timestamp: number }>;
  steps: number;
  avgSpeed: number;
  chartData: Array<{
    time: number;
    altitude: number | null;
    speed: number;
    distance: number;
    timestamp: number;
  }>;
  elevationGain: number;
  elevationLoss: number;
};

export const useTrackingStatePersistence = () => {
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const loadSnapshot = async () => {
      try {
        const stored = await AsyncStorage.getItem(TRACKING_STATE_KEY);
        if (stored) {
          setSnapshot(JSON.parse(stored));
        }
      } catch (error) {
        console.log('⚠️ Impossible de charger le snapshot de tracking', error);
      } finally {
        setIsHydrating(false);
      }
    };
    loadSnapshot();
  }, []);

  const saveSnapshot = useCallback(async (data: TrackingSnapshot) => {
    setSnapshot(data);
    try {
      await AsyncStorage.setItem(TRACKING_STATE_KEY, JSON.stringify(data));
    } catch (error) {
      console.log('⚠️ Impossible de sauvegarder le snapshot de tracking', error);
    }
  }, []);

  const clearSnapshot = useCallback(async () => {
    setSnapshot(null);
    try {
      await AsyncStorage.removeItem(TRACKING_STATE_KEY);
    } catch (error) {
      console.log('⚠️ Impossible de nettoyer le snapshot de tracking', error);
    }
  }, []);

  return {
    snapshot,
    isHydrating,
    saveSnapshot,
    clearSnapshot,
  };
};

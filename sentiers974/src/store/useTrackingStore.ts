import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../utils/logger';

/**
 * Store Zustand pour les données de tracking centralisées
 * Remplace les useState dispersés dans useTrackingLogic
 */

interface TrackingMetrics {
  distance: number;
  steps: number;
  instantSpeed: number;
  maxSpeed: number;
  avgSpeed: number;
  speedHistory: number[];
  elevationGain: number;
  elevationLoss: number;
  minAltitude: number | null;
  maxAltitude: number | null;
  lastAltitude: number | null;
}

interface TrackingSplit {
  km: number;
  time: number;
  duration: number;
  avgSpeed: number;
  type: 'auto' | 'manual';
  timestamp: number;
}

interface ChartDataPoint {
  time: number;
  altitude: number | null;
  speed: number;
  distance: number;
  timestamp: number;
}

interface PointOfInterest {
  id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  distance: number;
  time: number;
  title: string;
  note?: string;
  photo?: string;
  timestamp: number;
}

interface TrackingState {
  // Session data
  sessionId: string | null;
  selectedSport: any;
  
  // Metrics
  metrics: TrackingMetrics;
  splits: TrackingSplit[];
  lastSplitDistance: number;
  
  // Location tracking
  trackingPath: Array<{latitude: number; longitude: number}>;
  locationHistory: any[];
  lastCoords: any;
  
  // Chart and analysis data
  chartData: ChartDataPoint[];
  pointsOfInterest: PointOfInterest[];
  
  // Actions - Session
  setSessionId: (id: string | null) => void;
  setSelectedSport: (sport: any) => void;
  
  // Actions - Metrics
  updateDistance: (distance: number) => void;
  updateSpeed: (speed: number) => void;
  updateSteps: (steps: number) => void;
  updateAltitude: (altitude: number | null) => void;
  resetMetrics: () => void;
  
  // Actions - Splits
  addSplit: (split: TrackingSplit) => void;
  clearSplits: () => void;
  
  // Actions - Location
  addLocationPoint: (coords: any) => void;
  addTrackingPoint: (point: {latitude: number; longitude: number}) => void;
  setLastCoords: (coords: any) => void;
  clearLocationData: () => void;
  
  // Actions - Chart data
  addChartPoint: (point: ChartDataPoint) => void;
  clearChartData: () => void;
  
  // Actions - POI
  addPOI: (poi: PointOfInterest) => void;
  updatePOI: (id: string, updates: Partial<PointOfInterest>) => void;
  deletePOI: (id: string) => void;
  clearPOIs: () => void;
  
  // Global reset
  resetAll: () => void;
}

const initialMetrics: TrackingMetrics = {
  distance: 0,
  steps: 0,
  instantSpeed: 0,
  maxSpeed: 0,
  avgSpeed: 0,
  speedHistory: [],
  elevationGain: 0,
  elevationLoss: 0,
  minAltitude: null,
  maxAltitude: null,
  lastAltitude: null
};

export const useTrackingStore = create<TrackingState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionId: null,
      selectedSport: null,
      metrics: initialMetrics,
      splits: [],
      lastSplitDistance: 0,
      trackingPath: [],
      locationHistory: [],
      lastCoords: null,
      chartData: [],
      pointsOfInterest: [],

      // Session actions
      setSessionId: (id) => {
        logger.tracking('Session ID mis à jour', { sessionId: id });
        set({ sessionId: id });
      },

      setSelectedSport: (sport) => {
        logger.tracking('Sport sélectionné', { sport: sport?.name });
        set({ selectedSport: sport });
      },

      // Metrics actions
      updateDistance: (distance) => {
        set(state => ({
          metrics: { ...state.metrics, distance }
        }));
      },

      updateSpeed: (speed) => {
        set(state => {
          const newSpeedHistory = [...state.metrics.speedHistory, speed];
          if (newSpeedHistory.length > 100) {
            newSpeedHistory.shift();
          }

          const maxSpeed = Math.max(state.metrics.maxSpeed, speed);
          const avgSpeed = newSpeedHistory.reduce((a, b) => a + b, 0) / newSpeedHistory.length;

          return {
            metrics: {
              ...state.metrics,
              instantSpeed: speed,
              maxSpeed,
              avgSpeed,
              speedHistory: newSpeedHistory
            }
          };
        });
      },

      updateSteps: (steps) => {
        set(state => ({
          metrics: { ...state.metrics, steps }
        }));
      },

      updateAltitude: (altitude) => {
        if (altitude === null) return;

        set(state => {
          const { lastAltitude, elevationGain, elevationLoss, minAltitude, maxAltitude } = state.metrics;
          
          let newElevationGain = elevationGain;
          let newElevationLoss = elevationLoss;
          
          if (lastAltitude !== null) {
            const diff = altitude - lastAltitude;
            if (diff > 0) {
              newElevationGain += diff;
            } else {
              newElevationLoss += Math.abs(diff);
            }
          }
          
          const newMinAltitude = minAltitude === null ? altitude : Math.min(minAltitude, altitude);
          const newMaxAltitude = maxAltitude === null ? altitude : Math.max(maxAltitude, altitude);

          return {
            metrics: {
              ...state.metrics,
              lastAltitude: altitude,
              elevationGain: newElevationGain,
              elevationLoss: newElevationLoss,
              minAltitude: newMinAltitude,
              maxAltitude: newMaxAltitude
            }
          };
        });
      },

      resetMetrics: () => {
        logger.tracking('Métriques reset');
        set({ metrics: initialMetrics });
      },

      // Splits actions
      addSplit: (split) => {
        set(state => ({
          splits: [...state.splits, split],
          lastSplitDistance: split.km * 1000
        }));
        logger.tracking('Split ajouté', { km: split.km, type: split.type });
      },

      clearSplits: () => {
        set({ splits: [], lastSplitDistance: 0 });
      },

      // Location actions
      addLocationPoint: (coords) => {
        set(state => {
          const newHistory = [...state.locationHistory, coords];
          if (newHistory.length > 1000) {
            newHistory.shift();
          }
          return { locationHistory: newHistory };
        });
      },

      addTrackingPoint: (point) => {
        set(state => ({
          trackingPath: [...state.trackingPath, point]
        }));
      },

      setLastCoords: (coords) => {
        set({ lastCoords: coords });
      },

      clearLocationData: () => {
        set({
          trackingPath: [],
          locationHistory: [],
          lastCoords: null
        });
      },

      // Chart data actions
      addChartPoint: (point) => {
        set(state => {
          const newChartData = [...state.chartData, point];
          if (newChartData.length > 1000) {
            newChartData.shift();
          }
          return { chartData: newChartData };
        });
      },

      clearChartData: () => {
        set({ chartData: [] });
      },

      // POI actions
      addPOI: (poi) => {
        set(state => ({
          pointsOfInterest: [...state.pointsOfInterest, poi]
        }));
        logger.tracking('POI ajouté', { title: poi.title });
      },

      updatePOI: (id, updates) => {
        set(state => ({
          pointsOfInterest: state.pointsOfInterest.map(poi =>
            poi.id === id ? { ...poi, ...updates } : poi
          )
        }));
        logger.tracking('POI mis à jour', { id, updates });
      },

      deletePOI: (id) => {
        set(state => ({
          pointsOfInterest: state.pointsOfInterest.filter(poi => poi.id !== id)
        }));
        logger.tracking('POI supprimé', { id });
      },

      clearPOIs: () => {
        set({ pointsOfInterest: [] });
      },

      // Global reset
      resetAll: () => {
        logger.tracking('Reset complet du store tracking');
        set({
          sessionId: null,
          selectedSport: null,
          metrics: initialMetrics,
          splits: [],
          lastSplitDistance: 0,
          trackingPath: [],
          locationHistory: [],
          lastCoords: null,
          chartData: [],
          pointsOfInterest: []
        });
      }
    }),
    {
      name: 'tracking-store',
      // Ne persister que les données importantes
      partialize: (state) => ({
        sessionId: state.sessionId,
        selectedSport: state.selectedSport,
        pointsOfInterest: state.pointsOfInterest
      })
    }
  )
);

// Hooks utilitaires
export const useTrackingMetrics = () => {
  const {
    metrics,
    updateDistance,
    updateSpeed,
    updateSteps,
    updateAltitude,
    resetMetrics
  } = useTrackingStore();

  return {
    metrics,
    updateDistance,
    updateSpeed,
    updateSteps,
    updateAltitude,
    resetMetrics
  };
};

export const useTrackingSplits = () => {
  const {
    splits,
    addSplit,
    clearSplits
  } = useTrackingStore();

  return {
    splits,
    addSplit,
    clearSplits
  };
};

export const useTrackingLocation = () => {
  const {
    trackingPath,
    locationHistory,
    lastCoords,
    addLocationPoint,
    addTrackingPoint,
    setLastCoords,
    clearLocationData
  } = useTrackingStore();

  return {
    trackingPath,
    locationHistory,
    lastCoords,
    addLocationPoint,
    addTrackingPoint,
    setLastCoords,
    clearLocationData
  };
};

export const useTrackingPOIs = () => {
  const {
    pointsOfInterest,
    addPOI,
    updatePOI,
    deletePOI,
    clearPOIs
  } = useTrackingStore();

  return {
    pointsOfInterest,
    addPOI,
    updatePOI,
    deletePOI,
    clearPOIs
  };
};
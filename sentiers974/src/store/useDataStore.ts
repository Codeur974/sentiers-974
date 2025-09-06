import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../utils/logger';

/**
 * Store Zustand pour les données de l'application
 * Remplace les useState dans useActivity, usePointsOfInterest, etc.
 * Centralise les données pour éviter les re-renders inutiles
 */

interface Activity {
  _id: string;
  title: string;
  sport: string;
  date: string;
  distance: number;
  duration: number;
  photos: Array<{
    url: string;
    caption?: string;
  }>;
  notes?: string;
  isActive?: boolean;
}

interface POI {
  id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  title: string;
  note?: string;
  photoUri?: string;
  sessionId?: string;
  createdAt: number;
  updatedAt?: number;
}

interface DataState {
  // Activities data
  activities: Activity[];
  activitiesLoading: boolean;
  activitiesError: string | null;
  lastActivitiesUpdate: number | null;
  
  // POIs data
  pois: POI[];
  poisLoading: boolean;
  poisError: string | null;
  lastPoisUpdate: number | null;
  
  // Cache management
  cacheExpiry: number;
  
  // Activities actions
  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  setActivitiesLoading: (loading: boolean) => void;
  setActivitiesError: (error: string | null) => void;
  
  // POIs actions
  setPOIs: (pois: POI[]) => void;
  addPOI: (poi: POI) => void;
  updatePOI: (id: string, updates: Partial<POI>) => void;
  deletePOI: (id: string) => void;
  setPOIsLoading: (loading: boolean) => void;
  setPOIsError: (error: string | null) => void;
  
  // Cache management
  invalidateCache: () => void;
  isDataStale: () => boolean;
  
  // Cleanup
  clearAll: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      // Initial state
      activities: [],
      activitiesLoading: false,
      activitiesError: null,
      lastActivitiesUpdate: null,
      
      pois: [],
      poisLoading: false,
      poisError: null,
      lastPoisUpdate: null,
      
      cacheExpiry: CACHE_DURATION,
      
      // Activities actions
      setActivities: (activities) => {
        logger.debug('Activities mises à jour', { count: activities.length }, 'DATA');
        set({
          activities,
          lastActivitiesUpdate: Date.now(),
          activitiesError: null
        });
      },
      
      addActivity: (activity) => {
        set(state => ({
          activities: [activity, ...state.activities],
          lastActivitiesUpdate: Date.now()
        }));
        logger.info('Activité ajoutée', { id: activity._id, sport: activity.sport }, 'DATA');
      },
      
      updateActivity: (id, updates) => {
        set(state => ({
          activities: state.activities.map(activity =>
            activity._id === id ? { ...activity, ...updates } : activity
          ),
          lastActivitiesUpdate: Date.now()
        }));
        logger.info('Activité mise à jour', { id, updates }, 'DATA');
      },
      
      deleteActivity: (id) => {
        set(state => ({
          activities: state.activities.filter(activity => activity._id !== id),
          lastActivitiesUpdate: Date.now()
        }));
        logger.info('Activité supprimée', { id }, 'DATA');
      },
      
      setActivitiesLoading: (loading) => {
        set({ activitiesLoading: loading });
      },
      
      setActivitiesError: (error) => {
        logger.error('Erreur activities', error, 'DATA');
        set({ activitiesError: error });
      },
      
      // POIs actions
      setPOIs: (pois) => {
        logger.debug('POIs mis à jour', { count: pois.length }, 'DATA');
        set({
          pois,
          lastPoisUpdate: Date.now(),
          poisError: null
        });
      },
      
      addPOI: (poi) => {
        set(state => ({
          pois: [poi, ...state.pois],
          lastPoisUpdate: Date.now()
        }));
        logger.info('POI ajouté', { id: poi.id, title: poi.title }, 'DATA');
      },
      
      updatePOI: (id, updates) => {
        set(state => ({
          pois: state.pois.map(poi =>
            poi.id === id ? { ...poi, ...updates, updatedAt: Date.now() } : poi
          ),
          lastPoisUpdate: Date.now()
        }));
        logger.info('POI mis à jour', { id, updates }, 'DATA');
      },
      
      deletePOI: (id) => {
        set(state => ({
          pois: state.pois.filter(poi => poi.id !== id),
          lastPoisUpdate: Date.now()
        }));
        logger.info('POI supprimé', { id }, 'DATA');
      },
      
      setPOIsLoading: (loading) => {
        set({ poisLoading: loading });
      },
      
      setPOIsError: (error) => {
        logger.error('Erreur POIs', error, 'DATA');
        set({ poisError: error });
      },
      
      // Cache management
      invalidateCache: () => {
        logger.debug('Cache invalidé', undefined, 'DATA');
        set({
          lastActivitiesUpdate: null,
          lastPoisUpdate: null
        });
      },
      
      isDataStale: () => {
        const state = get();
        const now = Date.now();
        
        const activitiesStale = !state.lastActivitiesUpdate || 
          (now - state.lastActivitiesUpdate) > state.cacheExpiry;
        
        const poisStale = !state.lastPoisUpdate || 
          (now - state.lastPoisUpdate) > state.cacheExpiry;
        
        return activitiesStale || poisStale;
      },
      
      // Cleanup
      clearAll: () => {
        logger.info('Données effacées', undefined, 'DATA');
        set({
          activities: [],
          activitiesLoading: false,
          activitiesError: null,
          lastActivitiesUpdate: null,
          pois: [],
          poisLoading: false,
          poisError: null,
          lastPoisUpdate: null
        });
      }
    }),
    {
      name: 'data-store',
      // Persister toutes les données avec cache intelligent
      partialize: (state) => ({
        activities: state.activities,
        lastActivitiesUpdate: state.lastActivitiesUpdate,
        pois: state.pois,
        lastPoisUpdate: state.lastPoisUpdate
      })
    }
  )
);

// Hooks utilitaires spécialisés
export const useActivities = () => {
  const {
    activities,
    activitiesLoading,
    activitiesError,
    setActivities,
    addActivity,
    updateActivity,
    deleteActivity,
    setActivitiesLoading,
    setActivitiesError
  } = useDataStore();

  return {
    activities,
    loading: activitiesLoading,
    error: activitiesError,
    setActivities,
    addActivity,
    updateActivity,
    deleteActivity,
    setLoading: setActivitiesLoading,
    setError: setActivitiesError
  };
};

export const usePOIs = () => {
  const {
    pois,
    poisLoading,
    poisError,
    setPOIs,
    addPOI,
    updatePOI,
    deletePOI,
    setPOIsLoading,
    setPOIsError
  } = useDataStore();

  return {
    pois,
    loading: poisLoading,
    error: poisError,
    setPOIs,
    addPOI,
    updatePOI,
    deletePOI,
    setLoading: setPOIsLoading,
    setError: setPOIsError
  };
};

export const useDataCache = () => {
  const {
    lastActivitiesUpdate,
    lastPoisUpdate,
    invalidateCache,
    isDataStale,
    clearAll
  } = useDataStore();

  return {
    lastActivitiesUpdate,
    lastPoisUpdate,
    invalidateCache,
    isDataStale,
    clearAll
  };
};
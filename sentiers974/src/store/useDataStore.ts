import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { PhotoManager } from '../utils/photoUtils';

const STORAGE_KEY = 'sentiers974_pois';
let isLoadingPOIs = false;

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
  distance: number;
  time: number;
  title: string;
  note?: string;
  photoUri?: string;
  sessionId?: string;
  createdAt: number;
  updatedAt?: number;
  source?: 'local' | 'mongodb';
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
  loadPOIs: () => Promise<void>;
  setPOIs: (pois: POI[]) => void;
  addPOI: (poi: POI) => void;
  createPOI: (data: {
    title: string;
    note?: string;
    photoUri?: string;
    latitude: number;
    longitude: number;
    distance: number;
    time: number;
    sessionId?: string;
    createdAt?: number;
  }) => Promise<POI>;
  updatePOI: (id: string, updates: Partial<POI>) => void;
  deletePOI: (id: string) => Promise<void>;
  deletePOIsBatch: (ids: string[]) => Promise<void>;
  getPOIsForSession: (sessionId: string) => POI[];
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
      
      // Load POIs from MongoDB + AsyncStorage
      loadPOIs: async () => {
        if (isLoadingPOIs) {
          logger.debug('Chargement POI déjà en cours, skip', undefined, 'DATA');
          return;
        }

        isLoadingPOIs = true;
        set({ poisLoading: true });
        logger.debug('Chargement POI...', undefined, 'DATA');

        try {
          const [mongoPois, localPois] = await Promise.all([
            (Promise.race([
              fetch('http://192.168.1.17:3001/api/pointofinterests'),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]) as Promise<Response>)
              .then(r => r.ok ? r.json() : [])
              .catch(() => []),

            AsyncStorage.getItem(STORAGE_KEY)
              .then(json => json ? JSON.parse(json) : [])
              .catch(() => [])
          ]);

          const uniquePois = Array.from(
            new Map(
              [...mongoPois, ...localPois].map(poi => [poi.id, poi])
            ).values()
          );

          set({ pois: uniquePois, lastPoisUpdate: Date.now(), poisError: null });
          logger.info('POI chargés', { count: uniquePois.length }, 'DATA');
        } catch (error) {
          logger.error('Erreur chargement POI', error, 'DATA');
          set({ poisError: String(error) });
        } finally {
          set({ poisLoading: false });
          isLoadingPOIs = false;
        }
      },

      createPOI: async (data) => {
        logger.debug('Création POI', data, 'DATA');

        const poi: POI = {
          id: 'poi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          latitude: data.latitude,
          longitude: data.longitude,
          distance: data.distance,
          time: data.time,
          title: data.title,
          note: data.note,
          photoUri: data.photoUri,
          sessionId: data.sessionId,
          createdAt: data.createdAt ?? Date.now(),
          source: 'local'
        };

        set(state => ({
          pois: [poi, ...state.pois],
          lastPoisUpdate: Date.now()
        }));

        const state = get();
        const localPois = state.pois.filter(p => p.source !== 'mongodb');
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localPois));

        if (data.sessionId) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);

            const formData = new FormData();
            formData.append('title', data.title);
            if (data.note) formData.append('note', data.note);
            formData.append('latitude', String(data.latitude));
            formData.append('longitude', String(data.longitude));
            formData.append('distance', String(data.distance));
            formData.append('time', String(data.time));
            if (data.photoUri) {
              formData.append('photo', {
                uri: data.photoUri,
                type: 'image/jpeg',
                name: 'photo.jpg'
              } as any);
            }

            const response = await fetch('http://192.168.1.17:3001/api/sessions/' + data.sessionId + '/poi', {
              method: 'POST',
              body: formData,
              signal: controller.signal,
            });

            clearTimeout(timeout);

            if (response.ok) {
              const returnedPhoto = await response.json();
              poi.id = returnedPhoto.data?.id || poi.id;
              const returnedUri = returnedPhoto.data?.photoUrl || returnedPhoto.data?.uri;
              if (returnedUri) {
                poi.photoUri = returnedUri;
              }
              poi.source = 'mongodb';

              set(state => ({
                pois: state.pois.map(p => p.id === poi.id ? poi : p),
                lastPoisUpdate: Date.now()
              }));

              logger.info('POI créé sur MongoDB', { id: poi.id }, 'DATA');
            }
          } catch (mongoError) {
            logger.warn('POI créé localement seulement', mongoError, 'DATA');
          }
        }

        logger.info('POI créé', { id: poi.id, title: poi.title }, 'DATA');
        return poi;
      },

      deletePOIsBatch: async (ids) => {
        logger.debug('Suppression batch POI', { count: ids.length }, 'DATA');
        
        for (const poiId of ids) {
          await get().deletePOI(poiId);
        }
        
        logger.info('Batch suppression terminée', { count: ids.length }, 'DATA');
      },

      getPOIsForSession: (sessionId) => {
        const state = get();
        return state.pois.filter(poi => poi.sessionId === sessionId);
      },

      deletePOI: async (id) => {
        const state = get();
        const poiToDelete = state.pois.find(p => p.id === id);
        if (!poiToDelete) {
          logger.warn('POI introuvable', { id }, 'DATA');
          return;
        }

        logger.debug('Suppression POI', { id, source: poiToDelete.source, title: poiToDelete.title }, 'DATA');

        try {
          // MongoDB cleanup
          if (poiToDelete.source === 'mongodb') {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 2000);

              const response = await fetch(`http://192.168.1.17:3001/api/pointofinterests/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
              });

              clearTimeout(timeout);

              if (response.ok) {
                logger.info('POI MongoDB supprimé du serveur', { id }, 'DATA');
              } else {
                logger.warn('Échec suppression serveur', { id, status: response.status }, 'DATA');
              }
            } catch (serverError) {
              logger.warn('Erreur serveur, suppression locale seulement', serverError, 'DATA');
            }
          }

          // Photo cleanup
          if (poiToDelete?.photoUri && !poiToDelete.photoUri.includes('placeholder')) {
            await PhotoManager.deletePhoto(poiToDelete.photoUri);
          }

          // Local state update
          set(state => ({
            pois: state.pois.filter(poi => poi.id !== id),
            lastPoisUpdate: Date.now()
          }));

          // AsyncStorage update
          const updatedPois = get().pois.filter(p => p.source !== 'mongodb');
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPois));

          logger.info('POI supprimé', { id, title: poiToDelete.title }, 'DATA');
        } catch (error) {
          logger.error('Erreur suppression POI', error, 'DATA');
          throw error;
        }
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
      storage: createJSONStorage(() => AsyncStorage),
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
    loadPOIs,
    setPOIs,
    addPOI,
    createPOI,
    updatePOI,
    deletePOI,
    deletePOIsBatch,
    getPOIsForSession,
    setPOIsLoading,
    setPOIsError
  } = useDataStore();

  return {
    pois,
    loading: poisLoading,
    error: poisError,
    loadPOIs,
    reload: loadPOIs,
    setPOIs,
    addPOI,
    createPOI,
    updatePOI,
    deletePOI,
    deletePOIsBatch,
    getPOIsForSession,
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

import { Alert } from "react-native";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { logger } from "../utils/logger";
import { PhotoManager } from "../utils/photoUtils";
import { purgeLegacyCaches } from "./purgeLegacyCaches";

const STORAGE_KEY = "sentiers974_pois";
let isLoadingPOIs = false;
const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || "https://sentiers-974.onrender.com";

// Purger d'anciennes clés (daily_stats_ / data-store / sentiers974_pois) pour éviter les sessions fantômes
purgeLegacyCaches().catch(() => {});

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
  source?: "local" | "mongodb" | "backend";
  isDraft?: boolean; // POI temporaire pendant la session active
}

interface PendingSession {
  id: string;
  sessionData: any;
  timestamp: number;
  retryCount: number;
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

  // Sync Queue data
  pendingSessions: PendingSession[];
  isSyncing: boolean;

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
    isDraft?: boolean;
  }) => Promise<POI>;
  updatePOI: (id: string, updates: Partial<POI>) => void;
  deletePOI: (id: string) => Promise<void>;
  deletePOIsBatch: (ids: string[]) => Promise<void>;
  getPOIsForSession: (sessionId: string) => POI[];
  confirmDraftPOIs: (sessionId: string) => Promise<void>; // Confirmer les POI draft (session sauvegardée)
  cancelDraftPOIs: (sessionId: string) => Promise<void>; // Supprimer les POI draft (session annulée)
  setPOIsLoading: (loading: boolean) => void;
  setPOIsError: (error: string | null) => void;

  // Sync Queue actions
  addToSyncQueue: (sessionData: any) => Promise<void>;
  removeFromSyncQueue: (id: string) => Promise<void>;
  incrementRetry: (id: string) => Promise<void>;
  setSyncing: (syncing: boolean) => void;
  getPendingSessions: () => PendingSession[];

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

      pendingSessions: [],
      isSyncing: false,

      cacheExpiry: CACHE_DURATION,

      // Activities actions
      setActivities: (activities) => {
        logger.debug(
          "Activities mises à jour",
          { count: activities.length },
          "DATA"
        );
        set({
          activities,
          lastActivitiesUpdate: Date.now(),
          activitiesError: null,
        });
      },

      addActivity: (activity) => {
        set((state) => ({
          activities: [activity, ...state.activities],
          lastActivitiesUpdate: Date.now(),
        }));
        logger.info(
          "Activité ajoutée",
          { id: activity._id, sport: activity.sport },
          "DATA"
        );
      },

      updateActivity: (id, updates) => {
        set((state) => ({
          activities: state.activities.map((activity) =>
            activity._id === id ? { ...activity, ...updates } : activity
          ),
          lastActivitiesUpdate: Date.now(),
        }));
        logger.info("Activité mise à jour", { id, updates }, "DATA");
      },

      deleteActivity: (id) => {
        set((state) => ({
          activities: state.activities.filter(
            (activity) => activity._id !== id
          ),
          lastActivitiesUpdate: Date.now(),
        }));
        logger.info("Activité supprimée", { id }, "DATA");
      },

      setActivitiesLoading: (loading) => {
        set({ activitiesLoading: loading });
      },

      setActivitiesError: (error) => {
        logger.error("Erreur activities", error, "DATA");
        set({ activitiesError: error });
      },

      // POIs actions
      setPOIs: (pois) => {
        logger.debug("POIs mis à jour", { count: pois.length }, "DATA");
        set({
          pois,
          lastPoisUpdate: Date.now(),
          poisError: null,
        });
      },

      addPOI: (poi) => {
        set((state) => ({
          pois: [poi, ...state.pois],
          lastPoisUpdate: Date.now(),
        }));
        logger.info("POI ajouté", { id: poi.id, title: poi.title }, "DATA");
      },

      updatePOI: (id, updates) => {
        set((state) => ({
          pois: state.pois.map((poi) =>
            poi.id === id ? { ...poi, ...updates, updatedAt: Date.now() } : poi
          ),
          lastPoisUpdate: Date.now(),
        }));
        logger.info("POI mis à jour", { id, updates }, "DATA");
      },

      // Load POIs from MongoDB + AsyncStorage
      loadPOIs: async () => {
        if (isLoadingPOIs) {
          logger.debug("Chargement POI déjà en cours, skip", undefined, "DATA");
          return;
        }

        isLoadingPOIs = true;
        set({ poisLoading: true });
        logger.debug("Chargement POI...", undefined, "DATA");

        try {
          console.log('🔍 Appel API /api/pointofinterests...');

          // Récupérer le token pour l'authentification (même logique que apiService)
          let token = await AsyncStorage.getItem("authToken");
          if (!token) {
            token = await AsyncStorage.getItem("userToken");
          }
          console.log('🔑 Token trouvé:', token ? 'OUI' : 'NON');

          const [mongoPoisRaw, localPois] = await Promise.all([
            (
              Promise.race([
                fetch(`${API_BASE_URL}/api/pointofinterests`, {
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                  },
                }),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("timeout")), 3000)
                ),
              ]) as Promise<Response>
            )
              .then((r) => {
                console.log('📡 Response /api/pointofinterests:', { ok: r.ok, status: r.status });
                return r.ok ? r.json() : [];
              })
              .catch((err) => {
                console.log('❌ Erreur fetch /api/pointofinterests:', err.message);
                return [];
              }),

            AsyncStorage.getItem(STORAGE_KEY)
              .then((json) => (json ? JSON.parse(json) : []))
              .catch(() => []),
          ]);

          console.log('📦 POIs MongoDB bruts:', Array.isArray(mongoPoisRaw) ? mongoPoisRaw.length : 'pas un array', mongoPoisRaw);

          const mongoPois = (mongoPoisRaw || []).map((p: any) => ({
            ...p,
            source: "backend",
            photoUri: p.photoUri || p.photo,
            createdAt: p.createdAt || p.timestamp || Date.now(), // assurer un timestamp pour éviter "invalid date"
            timestamp: p.timestamp || p.createdAt || Date.now(),
          }));

          console.log('✅ POIs MongoDB après mapping:', mongoPois.length);

          const uniquePois = Array.from(
            new Map(
              [...mongoPois, ...localPois].map((poi) => [poi.id, poi])
            ).values()
          );

          // Dédupliquer les doublons (ex: même photo/session mais id différent)
          const dedupByPhoto = Array.from(
            new Map(
              uniquePois.map((poi) => {
                const key = `${poi.sessionId || ""}|${
                  poi.photoUri || poi.photo || ""
                }|${poi.title || ""}`;
                return [key, poi];
              })
            ).values()
          );

          set({
            pois: dedupByPhoto,
            lastPoisUpdate: Date.now(),
            poisError: null,
          });
          logger.info("POI chargés", { count: dedupByPhoto.length }, "DATA");
        } catch (error) {
          logger.error("Erreur chargement POI", error, "DATA");
          set({ poisError: String(error) });
        } finally {
          set({ poisLoading: false });
          isLoadingPOIs = false;
        }
      },

      createPOI: async (data) => {
        logger.debug("Création POI", data, "DATA");

        // Sanitize createdAt (ms) pour éviter les dates invalides (1970)
        const rawCreatedAt = data.createdAt ?? Date.now();
        let safeCreatedAt = Number(rawCreatedAt);
        if (!Number.isFinite(safeCreatedAt) || safeCreatedAt <= 0) {
          safeCreatedAt = Date.now();
        }
        // Si en secondes (ex: 10 digits), convertir en ms
        if (safeCreatedAt < 1e12) {
          safeCreatedAt = safeCreatedAt * 1000;
        }

        if (!data.photoUri) {
          const message = "Ajoute une photo à ta session avant de valider.";
          logger.warn("createPOI: tentative sans photo", data, "DATA");
          Alert.alert("Ajout impossible", message);
          return null;
        }

        const poi: POI = {
          id:
            "poi_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
          latitude: data.latitude,
          longitude: data.longitude,
          distance: data.distance,
          time: data.time,
          title: data.title,
          note: data.note,
          photoUri: data.photoUri,
          sessionId: data.sessionId,
          createdAt: safeCreatedAt,
          source: "local",
          isDraft: data.isDraft !== undefined ? data.isDraft : !!data.sessionId, // Utiliser isDraft fourni, sinon draft si sessionId existe
        };

        set((state) => ({
          pois: [poi, ...state.pois],
          lastPoisUpdate: Date.now(),
        }));

        const state = get();
        const localPois = state.pois.filter((p) => p.source !== "mongodb");
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localPois));

        if (data.sessionId) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);

            const formData = new FormData();
            if (!data.photoUri) {
              clearTimeout(timeout);
              throw new Error(
                "Une photo est requise pour enregistrer ce point d'intérêt."
              );
            }
            // Envoyer l'id généré côté client pour permettre au backend de le réutiliser
            formData.append("id", poi.id);
            formData.append("title", data.title);
            if (data.note) formData.append("note", data.note);
            formData.append("latitude", String(data.latitude));
            formData.append("longitude", String(data.longitude));
            formData.append("distance", String(data.distance));
            formData.append("time", String(data.time));
            if (data.photoUri) {
              formData.append("photo", {
                uri: data.photoUri,
                type: "image/jpeg",
                name: "photo.jpg",
              } as any);
            }

            const token =
              (await AsyncStorage.getItem("authToken")) ||
              (await AsyncStorage.getItem("userToken"));

            const response = await fetch(
              `${API_BASE_URL}/api/sessions/${data.sessionId}/poi`,
              {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: formData,
                signal: controller.signal,
              }
            );

            clearTimeout(timeout);

            if (response.ok) {
              const returnedPhoto = await response.json();
              const originalId = poi.id;
              poi.id = returnedPhoto.data?.id || poi.id;
              const returnedUri =
                returnedPhoto.data?.photoUrl || returnedPhoto.data?.uri;
              if (returnedUri) {
                poi.photoUri = returnedUri;
              }
              poi.source = "mongodb";

              set((state) => ({
                // Remplacer l'entrée locale (id initial) ou l'éventuel id serveur
                pois: state.pois.map((p) =>
                  p.id === poi.id || p.id === originalId ? poi : p
                ),
                lastPoisUpdate: Date.now(),
              }));

              logger.info("POI créé sur MongoDB", { id: poi.id }, "DATA");
            }
          } catch (mongoError) {
            logger.warn("POI créé localement seulement", mongoError, "DATA");
          }
        }

        logger.info("POI créé", { id: poi.id, title: poi.title }, "DATA");
        return poi;
      },

      deletePOIsBatch: async (ids) => {
        logger.debug("Suppression batch POI", { count: ids.length }, "DATA");

        for (const poiId of ids) {
          await get().deletePOI(poiId);
        }

        logger.info(
          "Batch suppression terminée",
          { count: ids.length },
          "DATA"
        );
      },

      getPOIsForSession: (sessionId) => {
        const state = get();
        return state.pois.filter((poi) => poi.sessionId === sessionId);
      },

      // Confirmer les POI draft : marquer comme permanents (session sauvegardée)
      confirmDraftPOIs: async (sessionId) => {
        logger.info(
          "Confirmation POI draft pour session",
          { sessionId },
          "DATA"
        );

        const state = get();
        const draftPOIs = state.pois.filter(
          (poi) => poi.sessionId === sessionId && poi.isDraft
        );

        if (draftPOIs.length === 0) {
          logger.debug("Aucun POI draft à confirmer", { sessionId }, "DATA");
          return;
        }

        // Marquer tous les POI draft comme permanents
        set((state) => ({
          pois: state.pois.map((poi) =>
            poi.sessionId === sessionId && poi.isDraft
              ? { ...poi, isDraft: false }
              : poi
          ),
          lastPoisUpdate: Date.now(),
        }));

        // Sauvegarder dans AsyncStorage
        const updatedPois = get().pois.filter((p) => p.source !== "mongodb");
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPois));

        logger.info(
          "POI draft confirmés",
          { sessionId, count: draftPOIs.length },
          "DATA"
        );
      },

      // Supprimer les POI draft (session annulée)
      cancelDraftPOIs: async (sessionId) => {
        logger.info("Annulation POI draft pour session", { sessionId }, "DATA");

        const state = get();
        const draftPOIs = state.pois.filter(
          (poi) => poi.sessionId === sessionId && poi.isDraft
        );

        if (draftPOIs.length === 0) {
          logger.debug("Aucun POI draft à annuler", { sessionId }, "DATA");
          return;
        }

        // Supprimer les photos associées
        for (const poi of draftPOIs) {
          if (poi.photoUri && !poi.photoUri.includes("placeholder")) {
            await PhotoManager.deletePhoto(poi.photoUri);
          }
        }

        // Supprimer les POI draft du store
        set((state) => ({
          pois: state.pois.filter(
            (poi) => !(poi.sessionId === sessionId && poi.isDraft)
          ),
          lastPoisUpdate: Date.now(),
        }));

        // Sauvegarder dans AsyncStorage
        const updatedPois = get().pois.filter((p) => p.source !== "mongodb");
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPois));

        logger.info(
          "POI draft annulés",
          { sessionId, count: draftPOIs.length },
          "DATA"
        );
      },

      deletePOI: async (id) => {
        const state = get();
        const poiToDelete = state.pois.find((p) => p.id === id);
        if (!poiToDelete) {
          logger.warn("POI introuvable", { id }, "DATA");
          return;
        }

        logger.debug(
          "Suppression POI",
          { id, source: poiToDelete.source, title: poiToDelete.title },
          "DATA"
        );

        try {
          // Suppression backend : tenter la route session/poi puis fallback pointofinterests
          if (poiToDelete.source === "mongodb" || poiToDelete.sessionId) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const token =
              (await AsyncStorage.getItem("authToken")) ||
              (await AsyncStorage.getItem("userToken"));

            const endpoints = [
              poiToDelete.sessionId
                ? `${API_BASE_URL}/api/sessions/${poiToDelete.sessionId}/poi/${id}`
                : null,
              `${API_BASE_URL}/api/pointofinterests/${id}`,
            ].filter(Boolean) as string[];

            let deletedRemote = false;
            for (const url of endpoints) {
              try {
                const response = await fetch(url, {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  signal: controller.signal,
                });

                if (response.ok) {
                  deletedRemote = true;
                  logger.info("POI supprim� du serveur", { id, url }, "DATA");
                  break;
                } else {
                  logger.warn(
                    "�chec suppression serveur",
                    { id, status: response.status, url },
                    "DATA"
                  );
                }
              } catch (serverError) {
                logger.warn(
                  "Erreur appel suppression serveur",
                  { id, url, serverError },
                  "DATA"
                );
              }
            }

            clearTimeout(timeout);
            if (!deletedRemote) {
              logger.warn(
                "Aucune suppression distante confirm�e (continuation locale)",
                { id },
                "DATA"
              );
            }
          }

          // Photo cleanup
          if (
            poiToDelete?.photoUri &&
            !poiToDelete.photoUri.includes("placeholder")
          ) {
            await PhotoManager.deletePhoto(poiToDelete.photoUri);
          }

          // Local state update
          set((state) => ({
            pois: state.pois.filter((poi) => poi.id !== id),
            lastPoisUpdate: Date.now(),
          }));

          // AsyncStorage update
          const updatedPois = get().pois.filter((p) => p.source !== "mongodb");
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPois));

          logger.info("POI supprim�", { id, title: poiToDelete.title }, "DATA");
        } catch (error) {
          logger.error("Erreur suppression POI", error, "DATA");
          throw error;
        }
      },      setPOIsLoading: (loading) => {
        set({ poisLoading: loading });
      },

      setPOIsError: (error) => {
        logger.error("Erreur POIs", error, "DATA");
        set({ poisError: error });
      },

      // Sync Queue actions
      addToSyncQueue: async (sessionData) => {
        const newSession: PendingSession = {
          id: `pending_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          sessionData,
          timestamp: Date.now(),
          retryCount: 0,
        };

        set((state) => ({
          pendingSessions: [...state.pendingSessions, newSession],
        }));

        logger.info(
          "Session ajoutée à la sync queue",
          { id: newSession.id },
          "DATA"
        );
      },

      removeFromSyncQueue: async (id) => {
        set((state) => ({
          pendingSessions: state.pendingSessions.filter((s) => s.id !== id),
        }));

        logger.info("Session retirée de la sync queue", { id }, "DATA");
      },

      incrementRetry: async (id) => {
        set((state) => ({
          pendingSessions: state.pendingSessions.map((s) =>
            s.id === id ? { ...s, retryCount: s.retryCount + 1 } : s
          ),
        }));
      },

      setSyncing: (syncing) => {
        set({ isSyncing: syncing });
      },

      getPendingSessions: () => {
        return get().pendingSessions;
      },

      // Cache management
      invalidateCache: () => {
        logger.debug("Cache invalidé", undefined, "DATA");
        set({
          lastActivitiesUpdate: null,
          lastPoisUpdate: null,
        });
      },

      isDataStale: () => {
        const state = get();
        const now = Date.now();

        const activitiesStale =
          !state.lastActivitiesUpdate ||
          now - state.lastActivitiesUpdate > state.cacheExpiry;

        const poisStale =
          !state.lastPoisUpdate ||
          now - state.lastPoisUpdate > state.cacheExpiry;

        return activitiesStale || poisStale;
      },

      // Cleanup
      clearAll: () => {
        logger.info("Données effacées", undefined, "DATA");
        set({
          activities: [],
          activitiesLoading: false,
          activitiesError: null,
          lastActivitiesUpdate: null,
          pois: [],
          poisLoading: false,
          poisError: null,
          lastPoisUpdate: null,
        });
      },
    }),
    {
      name: "data-store-v2",
      storage: createJSONStorage(() => AsyncStorage),
      // Persister toutes les données avec cache intelligent
      partialize: (state) => ({
        activities: state.activities,
        lastActivitiesUpdate: state.lastActivitiesUpdate,
        pois: state.pois,
        lastPoisUpdate: state.lastPoisUpdate,
        pendingSessions: state.pendingSessions,
      }),
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
    setActivitiesError,
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
    setError: setActivitiesError,
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
    confirmDraftPOIs,
    cancelDraftPOIs,
    setPOIsLoading,
    setPOIsError,
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
    confirmDraftPOIs,
    cancelDraftPOIs,
    setLoading: setPOIsLoading,
    setError: setPOIsError,
  };
};

export const useDataCache = () => {
  const {
    lastActivitiesUpdate,
    lastPoisUpdate,
    invalidateCache,
    isDataStale,
    clearAll,
  } = useDataStore();

  return {
    lastActivitiesUpdate,
    lastPoisUpdate,
    invalidateCache,
    isDataStale,
    clearAll,
  };
};

// Utilitaire dev : nettoyer la persistance locale (stats, POI, store)
export const clearLocalPersistence = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter(
      (k) =>
        k === STORAGE_KEY ||
        k === "data-store-v2" ||
        k === "currentSessionId" ||
        k.startsWith("daily_stats_")
    );

    if (keysToRemove.length) {
      await AsyncStorage.multiRemove(keysToRemove);
    }

    // Réinitialiser le store en mémoire
    useDataStore.getState().clearAll();

    logger.info("Persistance locale nettoyée (dev)", { removed: keysToRemove }, "DATA");
  } catch (error) {
    logger.error("Erreur clearLocalPersistence", error, "DATA");
    throw error;
  }
};


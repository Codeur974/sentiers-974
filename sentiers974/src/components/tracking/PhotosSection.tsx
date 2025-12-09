import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { View, Text, Alert, TouchableOpacity, useWindowDimensions, ActivityIndicator, DeviceEventEmitter, ScrollView } from "react-native";
import { usePOIs } from '../../store/useDataStore';
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiService from "../../services/api";

// Hooks
import { usePhotoSelection } from "../../hooks/tracking/selection/usePhotoSelection";
import { usePhotoDeleter } from "../../hooks/tracking/deletion/usePhotoDeleter";
import { useSessionDeleter } from "../../hooks/tracking/deletion/useSessionDeleter";
import { useDayDeleter } from "../../hooks/tracking/deletion/useDayDeleter";
import { useBulkDeleter } from "../../hooks/tracking/deletion/useBulkDeleter";
import { useAddPhoto } from "../../hooks/tracking/photos/useAddPhoto";

// Components
import { SelectionControls } from "./controls/SelectionControls";
import { PhotoDayHeader } from "./day/PhotoDayHeader";
import { PhotoDayContent } from "./day/PhotoDayContent";
import { PhotoModal } from "./photos/PhotoModal";
import { AddPhotoModal } from "./modals/AddPhotoModal";
import Svg, { Polyline, Circle } from "react-native-svg";

interface PhotosSectionProps {
  isVisible: boolean;
  onInteraction?: () => void;
  onCreatePost?: (photos: any[]) => void;
}

export interface PhotosSectionRef {
  closeAllSections: () => void;
}

interface DayPerformance {
  totalDistance: number;
  totalTime: number;
  totalCalories: number;
  avgSpeed: number;
  sessions: number;
  maxSpeed: number;
  totalSteps: number;
  sessionsList: SessionPerformance[];
}

interface SessionPerformance {
  distance: number;
  duration: number;
  calories: number;
  avgSpeed: number;
  maxSpeed: number;
  steps: number;
  sport: string;
  sessionId: string;
  timestamp: number;
}

interface PhotoItem {
  id: string;
  uri: string;
  title: string;
  note?: string;
  sessionId?: string;
  createdAt: number;
  source: "poi" | "backend";
}

interface PhotoGroup {
  date: string;
  displayDate: string;
  photos: PhotoItem[];
  performance?: DayPerformance;
  sessionGroups?: SessionGroup[];
  orphanPhotos?: PhotoItem[];
}

interface SessionGroup {
  sessionId: string;
  photos: PhotoItem[];
  performance?: SessionPerformance;
}

const MIN_TIMESTAMP = new Date("2020-01-01").getTime();

const normalizeTimestamp = (value: any) => {
  if (value === undefined || value === null) {
    return Date.now();
  }

  let ts =
    typeof value === "string" ? new Date(value).getTime() : Number(value);

  // Convert seconds (10 digits) to ms
  if (Number.isFinite(ts) && ts > 1e9 && ts < 1e12) {
    ts = ts * 1000;
  }

  if (!Number.isFinite(ts) || ts <= 0 || ts < MIN_TIMESTAMP) {
    ts = Date.now();
  }

  return ts;
};

const buildSessionPerformance = (session: any): SessionPerformance | null => {
  if (!session) return null;

  const sessionId = session.sessionId || session.id || session._id;
  if (!sessionId) {
    return null;
  }

  const timestampSource = session.createdAt || session.date || session.timestamp;
  const timestamp = normalizeTimestamp(timestampSource);

  const sport =
    typeof session.sport === "string"
      ? session.sport
      : session.sport?.nom || session.sport || "Sport";

  return {
    sessionId,
    distance: session.distance || 0,
    duration: session.duration || 0,
    calories: session.calories || 0,
    avgSpeed: session.avgSpeed || 0,
    maxSpeed: session.maxSpeed || 0,
    steps: session.steps || 0,
    sport,
    timestamp,
  };
};

const PhotosSection = forwardRef<PhotosSectionRef, PhotosSectionProps>(
  ({ isVisible, onInteraction }, ref) => {
    const { pois, reload: reloadPois, deletePOI } = usePOIs();
    const dayStatsCache = useRef<Map<string, DayPerformance | undefined>>(
      new Map()
    );
    const inflightDayStats = useRef<
      Map<string, Promise<DayPerformance | undefined>>
    >(new Map());
    const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([]);
    const photoGroupsRef = useRef<PhotoGroup[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<{
      uri: string;
      title: string;
      note?: string;
    } | null>(null);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
      new Set()
    );
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [metric, setMetric] = useState<"distance" | "avgSpeed">("distance");
    const [isLoadingMongoDB, setIsLoadingMongoDB] = useState(false);
    const { width: screenWidth } = useWindowDimensions();

    useEffect(() => {
      dayStatsCache.current.clear();
      inflightDayStats.current.clear();
    }, [refreshTrigger]);

    // Hooks personnalisés
    const { activateSelectionMode, deactivateSelectionMode } =
      usePhotoSelection();

    const handleRefresh = () => {
      setRefreshTrigger((prev) => prev + 1);
      reloadPois();
    };

    const { confirmDeletePhoto } = usePhotoDeleter(handleRefresh);
    const { confirmDeleteSession } = useSessionDeleter(handleRefresh);
    const { confirmDeleteDay } = useDayDeleter(handleRefresh);
    const { deleteSelectedItems, getSelectedCount } = useBulkDeleter(
      photoGroups,
      expandedSections,
      handleRefresh
    );

    const {
      showAddPhotoModal,
      photoTitle,
      photoNote,
      selectedPhotoUri,
      creatingPhoto,
      handleAddForgottenPhoto,
      handleCloseModal,
      handleTakePhoto,
      handlePickPhoto,
      handleRemovePhoto,
      handleCreateForgottenPhoto,
      setPhotoTitle,
      setPhotoNote,
    } = useAddPhoto(handleRefresh);

    // Recharger les photos quand le composant devient visible
    useEffect(() => {
      if (isVisible) {
        reloadPois();
      }
    }, [isVisible]);

    // Écouter l'event sessionSaved pour recharger automatiquement
    useEffect(() => {
      console.log('🎧 PhotosSection: Installation listener sessionSaved');
      const subscription = DeviceEventEmitter.addListener('sessionSaved', (data) => {
        console.log('📢 PhotosSection: Event sessionSaved reçu !', data);
        console.log('🔄 PhotosSection: Appel handleRefresh...');
        handleRefresh();
        console.log('✅ PhotosSection: handleRefresh appelé');
      });

      return () => {
        console.log('🎧 PhotosSection: Suppression listener sessionSaved');
        subscription.remove();
      };
    }, []);

    // Effet pour désactiver la sélection quand toutes les sections sont fermées
    useEffect(() => {
      if (expandedSections.size === 0) {
        deactivateSelectionMode();
      }
    }, [expandedSections.size, deactivateSelectionMode]);

    // Exposer la fonction pour fermer toutes les sections
    useImperativeHandle(ref, () => ({
      closeAllSections: () => {
        setExpandedSections(new Set());
      },
    }));

    // Fonction de gestion du clic sur la corbeille
    const handleDeleteClick = async () => {
      const isFirstClick = activateSelectionMode();
      if (isFirstClick) {
        if (expandedSections.size === 0) {
          Alert.alert(
            "Aucune sélection",
            "Vous devez ouvrir au moins une section et sélectionner des éléments à supprimer."
          );
          deactivateSelectionMode();
        }
        return;
      }

      const totalCount = getSelectedCount();
      if (totalCount === 0) {
        Alert.alert(
          "Aucune sélection",
          "Vous devez sélectionner au moins un élément à supprimer."
        );
        return;
      }

      await deleteSelectedItems();
    };

    // Fonctions pour gérer les photos
    const handlePhotoPress = (photo: PhotoItem) => {
      setSelectedPhoto({
        uri: photo.uri,
        title: photo.title,
        note: photo.note,
      });
      onInteraction?.();
    };

    const toggleSection = (date: string) => {
      setExpandedSections((prev) => {
        const newSet = new Set<string>();
        if (!prev.has(date)) {
          newSet.add(date);
        }
        return newSet;
      });
    };

    // Fonction utilitaire pour formater les dates
    const getLocalDateString = (timestamp: any) => {
      const ts = normalizeTimestamp(timestamp);
      const date = new Date(ts);

      const now = Date.now();
      const maxFuture = now + 24 * 60 * 60 * 1000;
      if (ts > maxFuture) {
        const todayDate = new Date();
        const year = todayDate.getFullYear();
        const month = String(todayDate.getMonth() + 1).padStart(2, "0");
        const day = String(todayDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Charger les performances d'une journ?e depuis AsyncStorage uniquement (rapide)
    const loadDayPerformanceLocal = async (
      dateString: string
    ): Promise<DayPerformance | undefined> => {
      if (!dateString) return undefined;

      if (dayStatsCache.current.has(dateString)) {
        return dayStatsCache.current.get(dateString);
      }

      try {
        const statsKey = `daily_stats_${dateString}`;
        const savedStats = await AsyncStorage.getItem(statsKey);
        if (savedStats) {
          const localStats = JSON.parse(savedStats);
          dayStatsCache.current.set(dateString, localStats);
          return localStats;
        }
      } catch (error) {
        console.error("⚠️ Erreur lecture AsyncStorage:", error);
      }

      return undefined;
    };

    // Charger les performances d'une journ?e depuis MongoDB (lent)
    const loadDayPerformanceRemote = async (
      dateString: string
    ): Promise<DayPerformance | undefined> => {
      if (!dateString) return undefined;

      if (inflightDayStats.current.has(dateString)) {
        return inflightDayStats.current.get(dateString);
      }

      const fetchPromise = (async () => {
        try {
          console.log("🔍 Chargement MongoDB pour:", dateString);
          const response = await apiService.getDailyStats(dateString);

          if (response.success && response.data) {
            console.log("✅ Stats jour chargées depuis MongoDB:", dateString);
            const mongoStats = (response.data as any)?.data || response.data;

            const adaptedStats: DayPerformance = {
              totalDistance: mongoStats.totalDistance / 1000,
              totalTime: mongoStats.totalDuration,
              totalCalories: mongoStats.totalCalories,
              avgSpeed: mongoStats.avgSpeed,
              sessions: mongoStats.totalSessions,
              maxSpeed: mongoStats.maxSpeed,
              totalSteps: mongoStats.totalSteps || 0,
              sessionsList:
                mongoStats.sessions?.map((session: any) => ({
                  distance: session.distance,
                  duration: session.duration,
                  calories: 0,
                  avgSpeed: session.avgSpeed || 0,
                  maxSpeed: session.maxSpeed || 0,
                  steps: session.steps || 0,
                  sport: session.sport?.nom || session.sport || 'Sport', // Extraire le nom du sport si c'est un objet
                  sessionId: session.id,
                  timestamp: new Date(session.createdAt).getTime(),
                })) || [],
            };

            dayStatsCache.current.set(dateString, adaptedStats);
            return adaptedStats;
          }

          return undefined;
        } catch (error) {
          console.error("❌ Erreur chargement MongoDB:", error);
          return undefined;
        }
      })();

      inflightDayStats.current.set(dateString, fetchPromise);
      const result = await fetchPromise;
      inflightDayStats.current.delete(dateString);
      return result;
    };

    // Fonction helper pour associer photos aux sessions
    const associatePhotosToSessions = (
      photos: PhotoItem[],
      sessionGroups: Record<string, SessionGroup>
    ) => {
      const orphanPhotos: PhotoItem[] = [];

      console.log('🔗 Association photos → sessions:', {
        photosTotal: photos.length,
        sessionsDisponibles: Object.keys(sessionGroups).length
      });

      photos.forEach((photo) => {
        console.log('  📸 Photo:', photo.title, '→ sessionId:', photo.sessionId);

        if (photo.sessionId && sessionGroups[photo.sessionId]) {
          // Photo associée à une session existante avec performance
          sessionGroups[photo.sessionId].photos.push(photo);
          console.log('    ✅ Associée à session:', photo.sessionId);
        } else {
          // Photo sans sessionId OU avec sessionId inexistant → orpheline
          orphanPhotos.push(photo);
          console.log('    ❌ Orpheline (session non trouvée)');
        }
      });

      console.log('📊 Résultat association:');
      Object.values(sessionGroups).forEach(sg => {
        console.log(`  Session ${sg.sessionId}: ${sg.photos.length} photo(s)`);
      });

      return orphanPhotos;
    };

    // PHASE 1: Chargement rapide depuis AsyncStorage
    useEffect(() => {
      const loadLocalData = async () => {
        console.log('🔄 PhotosSection PHASE 1: Début chargement données locales');
        console.log('📊 PhotosSection PHASE 1: POIs totaux:', pois.length);

        // Créer les photos à partir des POI (filtrer les draft)
        const allPhotos: PhotoItem[] = pois
          .filter((poi) => !poi.isDraft) // Exclure les POI temporaires (session active)
          .map((poi) => {
            const createdAt = normalizeTimestamp(poi.createdAt);
            return {
              id: poi.id,
              uri:
                poi.photoUri ||
                "https://via.placeholder.com/150x150/e5e7eb/6b7280?text=Pas+de+photo",
              title: poi.title,
              note: poi.note,
              sessionId: poi.sessionId,
              createdAt,
              source: poi.source === "mongodb" ? "backend" : "poi",
            };
          });

        console.log('📊 PhotosSection PHASE 1: POIs après filtre draft:', allPhotos.length);

        // Grouper par date
        const groupedByDate = allPhotos.reduce((groups, photo) => {
          const date = getLocalDateString(photo.createdAt);
          const displayDate = new Date(photo.createdAt).toLocaleDateString(
            "fr-FR",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          );

          if (!groups[date]) {
            groups[date] = { date, displayDate, photos: [] };
          }

          groups[date].photos.push(photo);
          return groups;
        }, {} as Record<string, PhotoGroup>);

        const groupsArray = Object.values(groupedByDate);
        console.log('📊 PhotosSection PHASE 1: Groupes par date:', groupsArray.length);

        // Charger uniquement depuis AsyncStorage (rapide)
        const localGroups = await Promise.all(
          groupsArray.map(async (group) => {
            console.log('📅 PhotosSection PHASE 1: Chargement stats pour date', group.date);
            const performance = await loadDayPerformanceLocal(group.date);

            const sessionGroups: Record<string, SessionGroup> = {};

            if (performance?.sessionsList) {
              console.log('📊 PhotosSection PHASE 1: Stats trouvées -', {
                date: group.date,
                sessions: performance.sessionsList.length
              });
              performance.sessionsList.forEach((sessionPerformance) => {
                console.log('  ➡️ Session:', sessionPerformance.sessionId, sessionPerformance.sport);
                if (!sessionGroups[sessionPerformance.sessionId]) {
                  sessionGroups[sessionPerformance.sessionId] = {
                    sessionId: sessionPerformance.sessionId,
                    photos: [],
                    performance: sessionPerformance,
                  };
                }
              });
            } else {
              console.log('⚠️ PhotosSection PHASE 1: Pas de stats pour date', group.date);
            }

            const orphanPhotos = associatePhotosToSessions(group.photos, sessionGroups);

            return {
              ...group,
              performance,
              sessionGroups: Object.values(sessionGroups),
              orphanPhotos,
            };
          })
        );

        // Trier par date (plus récent en premier)
        const sortedGroups = localGroups.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        console.log('✅ PhotosSection PHASE 1: Groupes créés -', {
          total: sortedGroups.length,
          avecSessions: sortedGroups.filter(g => g.sessionGroups && g.sessionGroups.length > 0).length
        });

        setPhotoGroups(sortedGroups);
        photoGroupsRef.current = sortedGroups; // Mettre à jour la ref pour Phase 2
        setExpandedSections(new Set());
      };

      loadLocalData();
    }, [pois, refreshTrigger]);

    // PHASE 2: Chargement depuis MongoDB en arrière-plan
    useEffect(() => {
      const loadRemoteData = async () => {
        setIsLoadingMongoDB(true);

        try {
          const today = new Date();
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);

          // Récupérer toutes les sessions MongoDB
          const sessionsResponse = await apiService.getUserSessions({
            limit: 100,
            dateFrom: thirtyDaysAgo.toISOString(),
            dateTo: today.toISOString(),
          });

          const allDatesWithPerformance = new Set<string>();
          photoGroups.forEach((group) => allDatesWithPerformance.add(group.date));
          const sessionsByDate = new Map<string, SessionPerformance[]>();
          const photosFromSessions = new Map<string, PhotoItem[]>();

          if (sessionsResponse.success && sessionsResponse.data) {
            const sessions = Array.isArray(sessionsResponse.data)
              ? sessionsResponse.data
              : (sessionsResponse.data as any)?.data;
            if (sessions && Array.isArray(sessions)) {
              sessions.forEach((session: any) => {
                const performance = buildSessionPerformance(session);
                if (!performance) {
                  return;
                }

                const sessionDate = getLocalDateString(
                  session.createdAt || session.date || performance.timestamp
                );

                if (sessionDate) {
                  allDatesWithPerformance.add(sessionDate);
                  const bucket = sessionsByDate.get(sessionDate) || [];
                  bucket.push(performance);
                  sessionsByDate.set(sessionDate, bucket);

                  // Extraire les photos de la session
                  if (session.photos && Array.isArray(session.photos) && session.photos.length > 0) {
                    const sessionPhotos: PhotoItem[] = session.photos.map((photo: any) => ({
                      id: photo.id,
                      uri: photo.uri || photo.url || "https://via.placeholder.com/150x150/e5e7eb/6b7280?text=Pas+de+photo",
                      title: photo.title || photo.caption || "Photo",
                      note: photo.caption,
                      sessionId: session.id || session.sessionId,
                      createdAt: normalizeTimestamp(photo.timestamp || photo.createdAt || session.createdAt),
                      source: "backend" as const,
                    }));

                    const existingPhotos = photosFromSessions.get(sessionDate) || [];
                    photosFromSessions.set(sessionDate, [...existingPhotos, ...sessionPhotos]);

                    console.log(`📸 Extracted ${sessionPhotos.length} photos from session ${session.id || session.sessionId} for date ${sessionDate}`);
                  }
                }
              });
            }
          }

          const validDates = Array.from(allDatesWithPerformance).filter(
            (date) =>
              date &&
              date !== "null" &&
              date !== "undefined" &&
              !date.includes("NaN")
          );

          // Créer les photos depuis POI (filtrer les draft)
          const photosFromPOIs: PhotoItem[] = pois
            .filter((poi) => !poi.isDraft) // Exclure les POI temporaires (session active)
            .map((poi) => {
              const createdAt = normalizeTimestamp(poi.createdAt);
              return {
                id: poi.id,
                uri:
                  poi.photoUri ||
                  "https://via.placeholder.com/150x150/e5e7eb/6b7280?text=Pas+de+photo",
                title: poi.title,
                note: poi.note,
                sessionId: poi.sessionId,
                createdAt,
                source: poi.source === "mongodb" ? "backend" : "poi",
              };
            });

          // Combiner les photos POI avec les photos des sessions MongoDB
          const allPhotos: PhotoItem[] = [...photosFromPOIs];
          photosFromSessions.forEach((sessionPhotos, date) => {
            allPhotos.push(...sessionPhotos);
          });

          console.log(`📊 Total photos: ${allPhotos.length} (POIs: ${photosFromPOIs.length}, Sessions: ${allPhotos.length - photosFromPOIs.length})`);

          // Dédupliquer les photos par ID pour éviter les doublons
          const uniquePhotos = Array.from(
            new Map(allPhotos.map((photo) => [photo.id, photo])).values()
          );

          console.log(`📊 Photos after dedup: ${uniquePhotos.length}`);

          const groupedByDate = uniquePhotos.reduce((groups, photo) => {
            const date = getLocalDateString(photo.createdAt);
            const displayDate = new Date(photo.createdAt).toLocaleDateString(
              "fr-FR",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            );

            if (!groups[date]) {
              groups[date] = { date, displayDate, photos: [] };
            }

            groups[date].photos.push(photo);
            return groups;
          }, {} as Record<string, PhotoGroup>);

          const groupsArray = Object.values(groupedByDate);

          const allGroups = validDates.map((date) => {
            const existingGroup = groupsArray.find((g) => g.date === date);
            return (
              existingGroup || {
                date,
                displayDate: new Date(date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                photos: [],
              }
            );
          });

          // Charger les performances depuis MongoDB
          const remoteGroups = await Promise.all(
            allGroups.map(async (group) => {
              const performance = await loadDayPerformanceRemote(group.date);

            const sessionGroups: Record<string, SessionGroup> = {};
            const statsSessions = performance?.sessionsList || [];
            const fallbackSessions = sessionsByDate.get(group.date) || [];
            const mergedPerformances: Record<string, SessionPerformance> = {};

            [...statsSessions, ...fallbackSessions].forEach((sessionPerformance) => {
              if (!sessionPerformance?.sessionId) return;
              if (!mergedPerformances[sessionPerformance.sessionId]) {
                mergedPerformances[sessionPerformance.sessionId] = sessionPerformance;
              }
            });

            Object.values(mergedPerformances).forEach((sessionPerformance) => {
              sessionGroups[sessionPerformance.sessionId] = {
                sessionId: sessionPerformance.sessionId,
                photos: [],
                performance: sessionPerformance,
              };
            });

            if (!statsSessions.length && fallbackSessions.length) {
              console.log(
                `PhotosSection PHASE 2: Fallback ${fallbackSessions.length} sessions pour ${group.date} (stats manquantes)`
              );
            }

              const orphanPhotos = associatePhotosToSessions(group.photos, sessionGroups);

              return {
                ...group,
                performance,
                sessionGroups: Object.values(sessionGroups),
                orphanPhotos,
              };
            })
          );

          // Fusionner avec les données locales (Phase 1) pour éviter de perdre les données quand MongoDB échoue
          // Utiliser photoGroupsRef.current pour obtenir les données les plus récentes
          const currentLocalGroups = photoGroupsRef.current;
          console.log(`🔄 Début fusion - Remote: ${remoteGroups.length} groupes, Local: ${currentLocalGroups.length} groupes`);

          const mergedGroups: PhotoGroup[] = remoteGroups.map((remoteGroup) => {
            const localGroup = currentLocalGroups.find((g) => g.date === remoteGroup.date);

            const remoteSessions = remoteGroup.sessionGroups?.length || 0;
            const localSessions = localGroup?.sessionGroups?.length || 0;
            const countPhotosAll = (group?: PhotoGroup) =>
              (group?.sessionGroups?.reduce((sum, sg) => sum + (sg.photos?.length || 0), 0) || 0) +
              (group?.orphanPhotos?.length || 0);
            const countPhotosAssigned = (group?: PhotoGroup) =>
              group?.sessionGroups?.reduce((sum, sg) => sum + (sg.photos?.length || 0), 0) || 0;

            const remotePhotos = countPhotosAll(remoteGroup);
            const localPhotos = countPhotosAll(localGroup);
            const remotePhotosAssigned = countPhotosAssigned(remoteGroup);
            const localPhotosAssigned = countPhotosAssigned(localGroup);

            console.log(`🔄 Date ${remoteGroup.date}: Remote ${remoteSessions} sessions, Local ${localSessions} sessions`);

            // Prioriser LOCAL s'il a des donn?es (sessions ou photos), sauf si le REMOTE apporte vraiment plus
            if (localGroup && (localSessions > 0 || localPhotos > 0)) {
              const remoteWins =
                remotePhotos > localPhotos ||
                remotePhotosAssigned > localPhotosAssigned ||
                (remoteSessions > localSessions && remotePhotos >= localPhotos);

              if (remoteWins) {
                console.log(
                  `[Merge]: Utiliser MongoDB pour ${remoteGroup.date} (remote > local : sessions ${remoteSessions}/${localSessions}, photos ${remotePhotos}/${localPhotos})`
                );
                return remoteGroup;
              }

              console.log(
                `[Merge]: Garder donn?es locales pour ${remoteGroup.date} (local prioritaire : sessions ${localSessions}, photos ${localPhotos})`
              );
              return localGroup;
            }

            // Pas de donnÃ©es locales -> prendre Mongo si dispo
            if (remoteSessions > 0 || remotePhotos > 0) {
              console.log(`[Merge]: Utiliser ${remoteSessions} sessions MongoDB pour ${remoteGroup.date} (pas de local)`);
              return remoteGroup;
            }

            // Aucun remote utile, retourner le groupe remote (mÃªme vide) pour cohÃ©rence
            return remoteGroup;
          });

          // Ajouter les groupes locaux qui n'existent pas dans MongoDB
          currentLocalGroups.forEach((localGroup) => {
            const existsInRemote = mergedGroups.some((g) => g && g.date === localGroup.date);
            const localSessions = localGroup.sessionGroups?.length || 0;
            const localPhotos =
              (localGroup.sessionGroups?.reduce((sum, sg) => sum + (sg.photos?.length || 0), 0) || 0) +
              (localGroup.orphanPhotos?.length || 0);

            if (!existsInRemote && (localSessions > 0 || localPhotos > 0)) {
              console.log(`[Merge]: Ajouter groupe local ${localGroup.date} avec ${localSessions} sessions / ${localPhotos} photos (absent de MongoDB)`);
              mergedGroups.push(localGroup);
            }
          });

          // Trier par date
          const sortedGroups = mergedGroups
            .filter((g) => g !== undefined)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          // Filtrer les groupes vides OU avec date invalide (<2020) pour éviter les affichages fantômes
          const nonEmptyGroups = sortedGroups.filter((g) => {
            if (!g) return false;
            const sessionsCount = g.sessionGroups?.length || 0;
            const photosCount =
              (g.sessionGroups?.reduce((sum, sg) => sum + (sg.photos?.length || 0), 0) || 0) +
              (g.orphanPhotos?.length || 0);
            const year = Number((g.date || '').slice(0, 4));
            if (!year || year < 2020) return false;
            return sessionsCount > 0 || photosCount > 0;
          });

          console.log(`✅ Merge terminé: ${sortedGroups.length} groupes de dates (après filtre: ${nonEmptyGroups.length})`);
          nonEmptyGroups.forEach(group => {
            const sessions = group.sessionGroups?.length || 0;
            const photos =
              (group.sessionGroups?.reduce((sum, sg) => sum + (sg.photos?.length || 0), 0) || 0) +
              (group.orphanPhotos?.length || 0);
            console.log(`  - ${group.date}: ${sessions} sessions, ${photos} photos`);
          });

          setPhotoGroups(nonEmptyGroups);
          photoGroupsRef.current = nonEmptyGroups; // Mettre à jour la ref
        } catch (error) {
          console.error("❌ Erreur chargement MongoDB:", error);
        } finally {
          setIsLoadingMongoDB(false);
        }
      };

      // Délai de 100ms pour laisser Phase 1 terminer, puis chargement distant même si aucun groupe local
      const timer = setTimeout(() => {
        loadRemoteData();
      }, 100);

      return () => clearTimeout(timer);
    }, [pois, refreshTrigger]);

    // Vérifier s'il y a des sessions même sans photos
    const hasAnySessions = photoGroups.some(
      (group) => group.sessionGroups && group.sessionGroups.length > 0
    );

    if (!isVisible || (photoGroups.length === 0 && !hasAnySessions)) {
      return (
        <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <Text className="text-center text-blue-600 font-bold text-lg mb-2">
            Mon Historique
          </Text>
          <Text className="text-center text-gray-500 text-sm">
            {photoGroups.length === 0 && !hasAnySessions
              ? "Aucune activité pour le moment.\nCommencez un entraînement pour créer votre historique !"
              : "Historique masqué"}
          </Text>
        </View>
      );
    }

    return (
      <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
        {/* Header avec indicateur de sync MongoDB */}
        <View className="flex-row items-center justify-center mb-3">
          <Text className="text-blue-800 font-bold text-lg text-center">
            Mon Historique
          </Text>
          {isLoadingMongoDB && (
            <View className="ml-2">
              <ActivityIndicator size="small" color="#1e40af" />
            </View>
          )}
        </View>

        {/* Graphique de progression */}
        {(() => {
          const allSessions = photoGroups
            .flatMap((group) => group.sessionGroups || [])
            .map((session) => session.performance)
            .filter((p) => !!p)
            .sort((a, b) => a.timestamp - b.timestamp);

          const recentSessions = allSessions.slice(-20);

          if (recentSessions.length < 2) {
            return (
              <Text className="text-center text-gray-500 text-xs mb-3">
                Pas assez de sessions pour afficher une progression.
              </Text>
            );
          }

          const isDistance = metric === "distance";
          const unit = isDistance ? "km" : "km/h";
          const values = recentSessions.map((s) => (isDistance ? s.distance : s.avgSpeed));
          const dates = recentSessions.map((s) => s.timestamp);
          const minVal = Math.min(...values);
          const maxVal = Math.max(...values);
          const minDate = Math.min(...dates);
          const maxDate = Math.max(...dates);
          const totalDistance = recentSessions.reduce((sum, s) => sum + s.distance, 0);

          const padding = 8;
          const width = Math.max(200, Math.min(320, screenWidth - 64));
          const height = 64;

          const scaleX = (t: number) =>
            padding + ((t - minDate) / Math.max(1, maxDate - minDate)) * (width - 2 * padding);
          const scaleY = (d: number) => {
            if (maxVal === minVal) return height / 2;
            return height - padding - ((d - minVal) / (maxVal - minVal)) * (height - 2 * padding);
          };

          const points = recentSessions
            .map((s) => `${scaleX(s.timestamp)},${scaleY(isDistance ? s.distance : s.avgSpeed)}`)
            .join(" ");

          const lastSession = recentSessions[recentSessions.length - 1];

          return (
            <View className="mb-4 bg-white/70 rounded-lg border border-blue-100 p-3">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-blue-800">Progression des sessions</Text>
                  <Text className="text-[10px] text-gray-600">
                    Sessions: {recentSessions.length} | Total: {totalDistance.toFixed(1)} km
                  </Text>
                </View>
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    className="px-3 py-1.5 rounded-lg border"
                    activeOpacity={1}
                    style={{
                      backgroundColor: isDistance ? "#2563eb" : "#e5e7eb",
                      borderColor: isDistance ? "#2563eb" : "#d1d5db",
                    }}
                    onPress={() => setMetric("distance")}
                  >
                    <Text className={isDistance ? "text-white text-xs font-semibold" : "text-gray-700 text-xs font-semibold"}>
                      Distance
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="px-3 py-1.5 rounded-lg border"
                    activeOpacity={1}
                    style={{
                      backgroundColor: !isDistance ? "#2563eb" : "#e5e7eb",
                      borderColor: !isDistance ? "#2563eb" : "#d1d5db",
                    }}
                    onPress={() => setMetric("avgSpeed")}
                  >
                    <Text className={!isDistance ? "text-white text-xs font-semibold" : "text-gray-700 text-xs font-semibold"}>
                      Vitesse moy
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View className="items-center">
                <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
                  <Polyline
                    points={points}
                    fill="none"
                    stroke="#1D4ED8"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {recentSessions.map((s, idx) => (
                    <Circle
                      key={s.sessionId || idx}
                      cx={scaleX(s.timestamp)}
                      cy={scaleY(isDistance ? s.distance : s.avgSpeed)}
                      r={3}
                      fill="#1D4ED8"
                    />
                  ))}
                </Svg>
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-[10px] text-gray-600">Min {minVal.toFixed(1)} {unit}</Text>
                <Text className="text-[10px] text-gray-600">Max {maxVal.toFixed(1)} {unit}</Text>
                <Text className="text-[10px] text-gray-600">Derniere {(isDistance ? lastSession.distance : lastSession.avgSpeed).toFixed(1)} {unit}</Text>
              </View>
            </View>
          );
        })()}

        {/* Contrôles de sélection */}
        <SelectionControls
          visiblePhotoIds={photoGroups
            .filter((group) => expandedSections.has(group.date))
            .flatMap((group) =>
              [
                ...(group.sessionGroups?.flatMap((session) => session.photos) ||
                  []),
                ...(group.orphanPhotos || []),
              ].map((photo) => photo.id)
            )}
          visibleSessionIds={photoGroups
            .filter((group) => expandedSections.has(group.date))
            .flatMap(
              (group) =>
                group.sessionGroups?.map((session) => session.sessionId) || []
            )}
          onDeleteClick={handleDeleteClick}
        />

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          pointerEvents={expandedSections.size > 0 ? "auto" : "box-none"}
        >
          {photoGroups.map((group) => {
            const isExpanded = expandedSections.has(group.date);

            return (
              <View key={group.date} className="mb-3">
                <PhotoDayHeader
                  group={group}
                  isExpanded={isExpanded}
                  onToggle={toggleSection}
                  onDeleteDay={confirmDeleteDay}
                  onInteraction={onInteraction}
                />

                {isExpanded && (
                  <PhotoDayContent
                    group={group}
                    onAddPhoto={handleAddForgottenPhoto}
                    onDeleteSession={confirmDeleteSession}
                    onPhotoPress={handlePhotoPress}
                    onPhotoDelete={confirmDeletePhoto}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Modal photo plein écran */}
        <PhotoModal
          visible={selectedPhoto !== null}
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />

        {/* Modal d'ajout de photo oubliée */}
        <AddPhotoModal
          visible={showAddPhotoModal}
          photoTitle={photoTitle}
          photoNote={photoNote}
          selectedPhotoUri={selectedPhotoUri}
          creatingPhoto={creatingPhoto}
          onClose={handleCloseModal}
          onTitleChange={setPhotoTitle}
          onNoteChange={setPhotoNote}
          onTakePhoto={handleTakePhoto}
          onPickPhoto={handlePickPhoto}
          onRemovePhoto={handleRemovePhoto}
          onCreate={handleCreateForgottenPhoto}
        />
      </View>
    );
  }
);

PhotosSection.displayName = "PhotosSection";

export default PhotosSection;

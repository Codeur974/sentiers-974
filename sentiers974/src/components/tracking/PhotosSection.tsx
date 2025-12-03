import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { View, Text, Alert, TouchableOpacity, useWindowDimensions, ActivityIndicator } from "react-native";
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

const PhotosSection = forwardRef<PhotosSectionRef, PhotosSectionProps>(
  ({ isVisible, onInteraction }, ref) => {
    const { pois, reload: reloadPois } = usePOIs();
    const dayStatsCache = useRef<Map<string, DayPerformance | undefined>>(
      new Map()
    );
    const inflightDayStats = useRef<
      Map<string, Promise<DayPerformance | undefined>>
    >(new Map());
    const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([]);
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
      let ts = timestamp;
      if (typeof timestamp === "string") {
        ts = new Date(timestamp).getTime();
      }
      if (!ts || isNaN(ts) || ts === 0) {
        const todayDate = new Date();
        const year = todayDate.getFullYear();
        const month = String(todayDate.getMonth() + 1).padStart(2, "0");
        const day = String(todayDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

      const date = new Date(ts);
      if (isNaN(date.getTime())) {
        const todayDate = new Date();
        const year = todayDate.getFullYear();
        const month = String(todayDate.getMonth() + 1).padStart(2, "0");
        const day = String(todayDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

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

    // Charger les performances d'une journée depuis AsyncStorage uniquement (rapide)
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

    // Charger les performances d'une journée depuis MongoDB (lent)
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
                  sport: session.sport,
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

      photos.forEach((photo) => {
        if (photo.sessionId && sessionGroups[photo.sessionId]) {
          sessionGroups[photo.sessionId].photos.push(photo);
        } else if (photo.sessionId) {
          if (!sessionGroups[photo.sessionId]) {
            sessionGroups[photo.sessionId] = {
              sessionId: photo.sessionId,
              photos: [],
              performance: undefined,
            };
          }
          sessionGroups[photo.sessionId].photos.push(photo);
        } else {
          orphanPhotos.push(photo);
        }
      });

      return orphanPhotos;
    };

    // PHASE 1: Chargement rapide depuis AsyncStorage
    useEffect(() => {
      const loadLocalData = async () => {
        // Créer les photos à partir des POI
        const allPhotos: PhotoItem[] = pois.map((poi) => ({
          id: poi.id,
          uri:
            poi.photoUri ||
            "https://via.placeholder.com/150x150/e5e7eb/6b7280?text=Pas+de+photo",
          title: poi.title,
          note: poi.note,
          sessionId: poi.sessionId,
          createdAt: poi.createdAt,
          source: poi.source === "mongodb" ? "backend" : "poi",
        }));

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

        // Charger uniquement depuis AsyncStorage (rapide)
        const localGroups = await Promise.all(
          groupsArray.map(async (group) => {
            const performance = await loadDayPerformanceLocal(group.date);

            const sessionGroups: Record<string, SessionGroup> = {};

            if (performance?.sessionsList) {
              performance.sessionsList.forEach((sessionPerformance) => {
                if (!sessionGroups[sessionPerformance.sessionId]) {
                  sessionGroups[sessionPerformance.sessionId] = {
                    sessionId: sessionPerformance.sessionId,
                    photos: [],
                    performance: sessionPerformance,
                  };
                }
              });
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

        setPhotoGroups(sortedGroups);
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

          if (sessionsResponse.success && sessionsResponse.data) {
            const sessions = Array.isArray(sessionsResponse.data)
              ? sessionsResponse.data
              : (sessionsResponse.data as any)?.data;
            if (sessions && Array.isArray(sessions)) {
              sessions.forEach((session: any) => {
                const sessionDate = getLocalDateString(
                  session.createdAt || session.date
                );
                if (sessionDate) {
                  allDatesWithPerformance.add(sessionDate);
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

          // Créer les photos depuis POI
          const allPhotos: PhotoItem[] = pois.map((poi) => ({
            id: poi.id,
            uri:
              poi.photoUri ||
              "https://via.placeholder.com/150x150/e5e7eb/6b7280?text=Pas+de+photo",
            title: poi.title,
            note: poi.note,
            sessionId: poi.sessionId,
            createdAt: poi.createdAt,
            source: poi.source === "mongodb" ? "backend" : "poi",
          }));

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

              if (performance?.sessionsList) {
                performance.sessionsList.forEach((sessionPerformance) => {
                  if (!sessionGroups[sessionPerformance.sessionId]) {
                    sessionGroups[sessionPerformance.sessionId] = {
                      sessionId: sessionPerformance.sessionId,
                      photos: [],
                      performance: sessionPerformance,
                    };
                  }
                });
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

          // Trier par date
          const sortedGroups = remoteGroups.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          setPhotoGroups(sortedGroups);
        } catch (error) {
          console.error("❌ Erreur chargement MongoDB:", error);
        } finally {
          setIsLoadingMongoDB(false);
        }
      };

      // Délai de 100ms pour laisser l'affichage local se faire
      const timer = setTimeout(() => {
        if (photoGroups.length > 0) {
          loadRemoteData();
        }
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

        <View
          className="max-h-80"
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
        </View>

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

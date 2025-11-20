import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { View, Text, Alert } from "react-native";
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

    useEffect(() => {
      dayStatsCache.current.clear();
      inflightDayStats.current.clear();
    }, [refreshTrigger]);

    // Hooks personnalisÃ©s
    const { activateSelectionMode, deactivateSelectionMode } =
      usePhotoSelection();

    const handleRefresh = () => {
      setRefreshTrigger((prev) => prev + 1);
      reloadPois(); // Recharger aussi les POIs
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
    }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps // Maintenant stable grÃ¢ce Ã  useCallback

    // Effet pour dÃ©sactiver la sÃ©lection quand toutes les sections sont fermÃ©es
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
        // Si aucune section n'est ouverte, montrer directement le message
        if (expandedSections.size === 0) {
          Alert.alert(
            "Aucune sÃ©lection",
            "Vous devez ouvrir au moins une section et sÃ©lectionner des Ã©lÃ©ments Ã  supprimer."
          );
          deactivateSelectionMode();
        }
        return;
      }

      const totalCount = getSelectedCount();
      if (totalCount === 0) {
        Alert.alert(
          "Aucune sÃ©lection",
          "Vous devez sÃ©lectionner au moins un Ã©lÃ©ment Ã  supprimer."
        );
        return;
      }

      await deleteSelectedItems();
    };

    // Fonctions pour gÃ©rer les photos
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
        // Si la section est dÃ©jÃ  ouverte, on la ferme (set vide)
        // Sinon on ouvre seulement cette section
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

    // Charger les performances d'une journÃ©e spÃ©cifique
    const loadDayPerformance = async (
      dateString: string
    ): Promise<DayPerformance | undefined> => {
      if (!dateString) return undefined;

      if (dayStatsCache.current.has(dateString)) {
        return dayStatsCache.current.get(dateString);
      }

      if (inflightDayStats.current.has(dateString)) {
        return inflightDayStats.current.get(dateString);
      }

      const fetchPromise = (async () => {
        try {
        console.log("ðŸ” Tentative chargement MongoDB pour:", dateString);
        const response = await apiService.getDailyStats(dateString);

        if (response.success && response.data) {
          console.log("âœ… Stats jour chargÃ©es depuis MongoDB:", dateString);
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
          return adaptedStats;
        }

        // Fallback vers AsyncStorage
        const statsKey = `daily_stats_${dateString}`;
        const savedStats = await AsyncStorage.getItem(statsKey);
        if (savedStats) {
          return JSON.parse(savedStats);
        }

        return undefined;
        } catch (error) {
        console.error("âŒ Erreur chargement stats jour:", error);
        return undefined;
        }
      })();

      inflightDayStats.current.set(dateString, fetchPromise);
      const result = await fetchPromise;
      inflightDayStats.current.delete(dateString);
      dayStatsCache.current.set(dateString, result);
      return result;
    };

    // Grouper les photos par jour et charger les performances
    useEffect(() => {
      const loadGroupsWithPerformance = async () => {
        // CrÃ©er les photos Ã  partir des POI
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

        // Convertir en array et charger les performances
        const groupsArray = Object.values(groupedByDate);

        // RÃ©cupÃ©rer toutes les sessions des 30 derniers jours
        const allDatesWithPerformance = new Set<string>();
        groupsArray.forEach((group) => allDatesWithPerformance.add(group.date));

        try {
          const today = new Date();
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);

          const sessionsResponse = await apiService.getUserSessions({
            limit: 100,
            dateFrom: thirtyDaysAgo.toISOString(),
            dateTo: today.toISOString(),
          });

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
        } catch (error) {
          console.error("âŒ Erreur rÃ©cupÃ©ration sessions MongoDB:", error);
        }

        // CrÃ©er les groupes finaux avec performances
        const validDates = Array.from(allDatesWithPerformance).filter(
          (date) =>
            date &&
            date !== "null" &&
            date !== "undefined" &&
            !date.includes("NaN")
        );

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

        const groupsWithPerformance = await Promise.all(
          allGroups.map(async (group) => {
            const performance = await loadDayPerformance(group.date);

            // CrÃ©er des groupes par session
            const sessionGroups: Record<string, SessionGroup> = {};

            if (performance?.sessionsList) {
              performance.sessionsList.forEach((sessionPerformance) => {
                if (!sessionGroups[sessionPerformance.sessionId]) {
                  sessionGroups[sessionPerformance.sessionId] = {
                    sessionId: sessionPerformance.sessionId,
                    photos: [], // Nouvel array pour chaque session
                    performance: sessionPerformance,
                  };
                }
              });
            }

            // Associer les photos aux sessions
            const orphanPhotos: PhotoItem[] = [];
            group.photos.forEach((photo) => {
              if (photo.sessionId && sessionGroups[photo.sessionId]) {
                sessionGroups[photo.sessionId].photos.push(photo);
              } else {
                orphanPhotos.push(photo);
              }
            });

            return {
              ...group,
              performance,
              sessionGroups: Object.values(sessionGroups),
              orphanPhotos,
            };
          })
        );

        // Trier par date (plus rÃ©cent en premier)
        const sortedGroups = groupsWithPerformance.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setPhotoGroups(sortedGroups);
        setExpandedSections(new Set());
      };

      loadGroupsWithPerformance();
    }, [pois, refreshTrigger]);

    // VÃ©rifier s'il y a des sessions mÃªme sans photos
    const hasAnySessions = photoGroups.some(
      (group) => group.sessionGroups && group.sessionGroups.length > 0
    );

    if (!isVisible || (photoGroups.length === 0 && !hasAnySessions)) {
      return (
        <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <Text className="text-center text-blue-600 font-bold text-lg mb-2">
            ðŸ—‚ï¸ Mon Historique
          </Text>
          <Text className="text-center text-gray-500 text-sm">
            {photoGroups.length === 0 && !hasAnySessions
              ? "Aucune activitÃ© pour le moment.\nCommencez un entraÃ®nement pour crÃ©er votre historique !"
              : "Historique masquÃ©"}
          </Text>
        </View>
      );
    }

    return (
      <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
        <Text className="text-blue-800 font-bold text-lg mb-3 text-center">
          ðŸ—‚ï¸ Mon Historique
        </Text>

        {/* ContrÃ´les de sÃ©lection */}
        <SelectionControls
          visiblePhotoIds={photoGroups
            .filter((group) => expandedSections.has(group.date))
            .flatMap((group) =>
              [
                // Photos dans les sessions
                ...(group.sessionGroups?.flatMap((session) => session.photos) ||
                  []),
                // Photos orphelines
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
                {/* Header de jour */}
                <PhotoDayHeader
                  group={group}
                  isExpanded={isExpanded}
                  onToggle={toggleSection}
                  onDeleteDay={confirmDeleteDay}
                  onInteraction={onInteraction}
                />

                {/* Contenu du jour */}
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

        {/* Modal photo plein Ã©cran */}
        <PhotoModal
          visible={selectedPhoto !== null}
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />

        {/* Modal d'ajout de photo oubliÃ©e */}
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

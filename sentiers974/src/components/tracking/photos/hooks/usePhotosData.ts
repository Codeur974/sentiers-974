import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePointsOfInterest } from '../../../../hooks/usePointsOfInterest';
import { useActivity } from '../../../../hooks/useActivity';
import { logger } from '../../../../utils/logger';
import { PhotoGroup, PhotoItem, DayPerformance, SessionGroup } from '../types';

/**
 * Hook pour gérer la logique de récupération et organisation des données photos
 * Extrait de PhotosSection pour séparation des responsabilités
 */
export function usePhotosData() {
  const { pois } = usePointsOfInterest();
  const { activities } = useActivity();
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Uniformiser le format de date (timezone locale)
  const getLocalDateString = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Charger les performances d'une journée spécifique
  const loadDayPerformance = async (dateString: string): Promise<DayPerformance | undefined> => {
    try {
      // Essayer d'abord de récupérer depuis MongoDB
      try {
        const response = await fetch(`http://192.168.1.12:3001/api/sessions/stats/daily?date=${dateString}&userId=default-user`);
        if (response.ok) {
          const mongoStats = await response.json();
          if (mongoStats && mongoStats.success && mongoStats.data.totalSessions > 0) {
            const data = mongoStats.data;
            // Convertir les données MongoDB vers le format DayPerformance
            const dayPerformance: DayPerformance = {
              totalDistance: data.totalDistance / 1000, // Convertir mètres vers km
              totalTime: data.totalDuration,
              totalCalories: data.totalCalories,
              avgSpeed: data.avgSpeed,
              sessions: data.totalSessions,
              maxSpeed: data.maxSpeed,
              totalSteps: data.totalSteps || 0,
              sessionsList: data.sessions?.map((session: any) => ({
                distance: session.distance / 1000, // Convertir mètres vers km
                duration: session.duration,
                calories: 0, // Non disponible dans la réponse aggregée
                avgSpeed: data.avgSpeed,
                maxSpeed: data.maxSpeed,
                steps: 0, // Non disponible dans la réponse aggregée
                sport: session.sport,
                sessionId: session.id,
                timestamp: new Date(session.createdAt).getTime()
              })) || []
            };
            logger.debug('Stats jour chargées depuis MongoDB:', dateString, 'PHOTOS');
            return dayPerformance;
          }
        }
      } catch (mongoError) {
        logger.debug('MongoDB indisponible, fallback AsyncStorage:', mongoError, 'PHOTOS');
      }

      // Fallback: charger depuis AsyncStorage
      const statsKey = `daily_stats_${dateString}`;
      const savedStats = await AsyncStorage.getItem(statsKey);
      if (savedStats) {
        logger.debug('Stats jour chargées depuis AsyncStorage:', dateString, 'PHOTOS');
        return JSON.parse(savedStats);
      }
      
      return undefined;
    } catch (error) {
      logger.error('Erreur chargement stats jour:', error, 'PHOTOS');
      return undefined;
    }
  };

  // Grouper les photos par jour et charger les performances
  const loadGroupsWithPerformance = async () => {
    logger.debug('Début chargement groupes photos', undefined, 'PHOTOS');
    
    // Combiner les photos des POI locaux et des activités backend
    const allPhotos: PhotoItem[] = [
      // Photos des POI locaux
      ...pois.filter(poi => poi.photoUri).map(poi => ({
        id: poi.id,
        uri: poi.photoUri!,
        title: poi.title,
        note: poi.note,
        sessionId: poi.sessionId,
        createdAt: poi.createdAt,
        source: 'poi' as const
      })),
      // Photos des activités backend
      ...activities.flatMap(activity => 
        activity.photos.map((photo, index) => ({
          id: `${activity._id}_${index}`,
          uri: photo.url,
          title: photo.caption || activity.title,
          note: activity.notes,
          sessionId: activity._id,
          createdAt: new Date(activity.date).getTime(),
          source: 'backend' as const
        }))
      )
    ];

    // Grouper par date
    const groupedByDate = allPhotos.reduce((groups, photo) => {
      const date = getLocalDateString(photo.createdAt);
      const displayDate = new Date(photo.createdAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = {
          date,
          displayDate,
          photos: []
        };
      }
      
      groups[date].photos.push(photo);
      return groups;
    }, {} as Record<string, PhotoGroup>);
    
    // Convertir en array et charger les performances pour chaque jour
    const groupsArray = Object.values(groupedByDate);
    const groupsWithPerformance = await Promise.all(
      groupsArray.map(async (group) => {
        const performance = await loadDayPerformance(group.date);
        
        // Créer des groupes par session pour ce jour
        const sessionGroups: Record<string, SessionGroup> = {};
        
        group.photos.forEach(photo => {
          if (photo.sessionId) {
            if (!sessionGroups[photo.sessionId]) {
              const sessionPerformance = performance?.sessionsList?.find(
                session => session.sessionId === photo.sessionId
              );
              sessionGroups[photo.sessionId] = {
                sessionId: photo.sessionId,
                photos: [],
                performance: sessionPerformance
              };
            }
            sessionGroups[photo.sessionId].photos.push(photo);
          }
        });
        
        return { 
          ...group, 
          performance,
          sessionGroups: Object.values(sessionGroups)
        };
      })
    );
    
    // Trier par date (plus récent en premier)
    const sortedGroups = groupsWithPerformance.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    setPhotoGroups(sortedGroups);
    logger.debug(`Groupes photos chargés: ${sortedGroups.length} jours`, undefined, 'PHOTOS');
  };

  // Recharger les données
  const refreshData = () => {
    logger.debug('Refresh données photos demandé', undefined, 'PHOTOS');
    setRefreshTrigger(prev => prev + 1);
  };

  // Effect pour recharger quand les données changent
  useEffect(() => {
    loadGroupsWithPerformance();
  }, [pois, activities, refreshTrigger]);

  return {
    photoGroups,
    refreshData,
    getLocalDateString,
    loadDayPerformance
  };
}
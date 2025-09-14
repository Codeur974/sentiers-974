import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePointsOfInterest } from '../../../../hooks/usePointsOfInterest';
// useActivity supprimé car collection activities supprimée
import { PhotoManager } from '../../../../utils/photoUtils';
import { logger } from '../../../../utils/logger';
import apiService from '../../../../services/api';
import { PhotoItem, PhotoGroup, SessionGroup, DayPerformance } from '../types';

/**
 * Hook pour gérer les actions sur les photos (CRUD operations)
 * Extrait de PhotosSection pour séparation des responsabilités
 */
export function usePhotoActions(
  getLocalDateString: (timestamp: number) => string,
  loadDayPerformance: (dateString: string) => Promise<DayPerformance | undefined>,
  refreshData: () => void
) {
  const { pois, deletePOI, createPOI } = usePointsOfInterest();
  // activities et loadActivities supprimés car collection activities supprimée

  // Prendre une photo
  const takePhoto = async (): Promise<string | null> => {
    try {
      logger.debug('Prise de photo demandée', undefined, 'PHOTOS');
      const photoUri = await PhotoManager.takePhoto();
      if (photoUri) {
        logger.photos('Photo prise avec succès', { uri: photoUri });
        return photoUri;
      }
      return null;
    } catch (error) {
      logger.error('Erreur prise de photo:', error, 'PHOTOS');
      Alert.alert('Erreur', 'Impossible de prendre la photo');
      return null;
    }
  };

  // Choisir une photo de la galerie
  const pickPhoto = async (): Promise<string | null> => {
    try {
      logger.debug('Sélection photo galerie demandée', undefined, 'PHOTOS');
      const photoUri = await PhotoManager.pickPhoto();
      if (photoUri) {
        logger.photos('Photo sélectionnée depuis galerie', { uri: photoUri });
        return photoUri;
      }
      return null;
    } catch (error) {
      logger.error('Erreur sélection photo:', error, 'PHOTOS');
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
      return null;
    }
  };

  // Créer un POI avec photo oubliée
  const createForgottenPhoto = async (
    sessionId: string,
    title: string,
    note: string,
    photoUri: string
  ): Promise<boolean> => {
    try {
      logger.photos('Création photo oubliée', { sessionId, title });
      
      // Utiliser une position par défaut car c'est une photo oubliée
      const defaultCoords = { latitude: -21.1151, longitude: 55.5364, altitude: 0 };
      
      const poi = await createPOI(
        defaultCoords,
        0, // Distance à 0 car photo ajoutée après coup
        0, // Temps à 0 car photo ajoutée après coup
        {
          title: title.trim(),
          note: note.trim() || undefined,
          photo: photoUri
        },
        sessionId
      );

      if (poi) {
        logger.photos('Photo oubliée créée avec succès', { poiId: poi.id });
        refreshData();
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Erreur création photo oubliée:', error, 'PHOTOS');
      return false;
    }
  };

  // Confirmer et supprimer une photo individuelle
  const confirmDeletePhoto = (photo: PhotoItem) => {
    logger.debug('Confirmation suppression photo', { title: photo.title, source: photo.source }, 'PHOTOS');
    
    Alert.alert(
      '🗑️ Supprimer la photo',
      `Êtes-vous sûr de vouloir supprimer la photo "${photo.title}" ?\n\nCette action est irréversible.`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => logger.debug('Suppression photo annulée', undefined, 'PHOTOS')
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deletePhoto(photo),
        },
      ]
    );
  };

  // Supprimer une photo individuelle
  const deletePhoto = async (photo: PhotoItem) => {
    try {
      logger.photos('Début suppression photo', { title: photo.title, source: photo.source });
      
      if (photo.source === 'poi') {
        await deletePOI(photo.id);
        logger.photos('POI local supprimé');
      } else if (photo.source === 'backend') {
        Alert.alert(
          '⚠️ Photo serveur', 
          'Les photos du serveur ne peuvent pas être supprimées individuellement.\n\nUtilisez "Supprimer Session" pour supprimer toute l\'activité.'
        );
        return;
      }
      
      refreshData();
    } catch (error) {
      logger.error('Erreur suppression photo:', error, 'PHOTOS');
      Alert.alert('❌ Erreur', `Impossible de supprimer la photo "${photo.title}".`);
    }
  };

  // Confirmer et supprimer une session
  const confirmDeleteSession = (sessionId: string, sessionGroup: SessionGroup) => {
    const sportName = sessionGroup.performance?.sport || 'Session';
    const photoCount = sessionGroup.photos.length;
    
    logger.debug('Confirmation suppression session', { sessionId, sportName, photoCount }, 'PHOTOS');
    
    Alert.alert(
      '🗑️ Supprimer la session',
      `Êtes-vous sûr de vouloir supprimer la session "${sportName}" ?\n\n• ${photoCount} photo(s)\n• Toutes les performances\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteSession(sessionId),
        },
      ]
    );
  };

  // Supprimer toutes les photos d'une session
  const deleteSession = async (sessionId: string) => {
    try {
      logger.photos('Début suppression session', { sessionId });
      
      // Supprimer les POI locaux liés à cette session
      const sessionPois = pois.filter(poi => poi.sessionId === sessionId);

      if (sessionPois.length > 0) {
        // Suppression des POI locaux
        for (const poi of sessionPois) {
          await deletePOI(poi.id);
        }

        // Supprimer les performances locales de la session
        const sessionPhotos = pois.find(poi => poi.sessionId === sessionId);
        if (sessionPhotos) {
          const date = getLocalDateString(sessionPhotos.createdAt);
          await removeDaySessionPerformance(date, sessionId);
        }
      }

      // Supprimer la session MongoDB
      try {
        logger.photos('Suppression session MongoDB', { sessionId });
        const deleteResult = await apiService.deleteSession(sessionId);
        if (deleteResult.success) {
          logger.photos('Session MongoDB supprimée', { sessionId });
        } else {
          logger.error('Échec suppression session MongoDB', deleteResult.message, 'PHOTOS');
        }
      } catch (mongoError) {
        logger.error('Erreur suppression session MongoDB', mongoError, 'PHOTOS');
      }
      
      refreshData();
    } catch (error) {
      logger.error('Erreur suppression session:', error, 'PHOTOS');
      Alert.alert('❌ Erreur', 'Impossible de supprimer la session.');
    }
  };

  // Confirmer et supprimer un jour complet
  const confirmDeleteDay = (date: string, group: PhotoGroup) => {
    const photoCount = group.photos.length;
    const sessionCount = group.sessionGroups?.length || 0;
    const dayName = group.displayDate;
    
    logger.debug('Confirmation suppression jour', { date, photoCount, sessionCount }, 'PHOTOS');
    
    Alert.alert(
      '🗑️ Supprimer le jour',
      `Êtes-vous sûr de vouloir supprimer TOUT le jour "${dayName}" ?\n\n• ${sessionCount} session(s)\n• ${photoCount} photo(s)\n• Toutes les performances\n\nCette action est DÉFINITIVE et irréversible !`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'SUPPRIMER TOUT',
          style: 'destructive',
          onPress: () => deleteDay(date),
        },
      ]
    );
  };

  // Supprimer tous les POI et performances d'un jour
  const deleteDay = async (date: string) => {
    try {
      logger.photos('=== DÉBUT SUPPRESSION JOUR ===', { date });
      
      // Supprimer les POI locaux du jour
      const dayPhotos = pois.filter(poi => {
        const poiDate = getLocalDateString(poi.createdAt);
        return poiDate === date;
      });
      
      if (dayPhotos.length > 0) {
        logger.photos('Suppression POI locaux', { count: dayPhotos.length });
        for (const poi of dayPhotos) {
          await deletePOI(poi.id);
        }
      }
      
      // Supprimer les activités backend du jour
      const dayActivities = activities.filter(activity => {
        const activityDate = getLocalDateString(new Date(activity.date).getTime());
        return activityDate === date;
      });
      
      if (dayActivities.length > 0) {
        logger.photos('Suppression activités backend', { count: dayActivities.length });
        for (const activity of dayActivities) {
          await apiService.deleteActivity(activity._id);
        }
        await loadActivities();
      }
      
      // Supprimer les performances locales du jour
      await removeDayPerformance(date);
      
      logger.photos('=== JOUR SUPPRIMÉ AVEC SUCCÈS ===', { date });
      refreshData();
      
    } catch (error) {
      logger.error('Erreur suppression jour:', error, 'PHOTOS');
      Alert.alert('❌ Erreur Suppression', `Impossible de supprimer le jour "${date}".`);
    }
  };

  // Supprimer les performances d'un jour complet
  const removeDayPerformance = async (dateString: string) => {
    try {
      const statsKey = `daily_stats_${dateString}`;
      const existingStats = await AsyncStorage.getItem(statsKey);
      if (existingStats) {
        await AsyncStorage.removeItem(statsKey);
        logger.debug('Performances jour supprimées', { date: dateString }, 'PHOTOS');
      }
    } catch (error) {
      logger.error('Erreur suppression performances jour:', error, 'PHOTOS');
      throw error;
    }
  };

  // Supprimer une session spécifique des performances du jour
  const removeDaySessionPerformance = async (dateString: string, sessionId: string) => {
    try {
      const statsKey = `daily_stats_${dateString}`;
      const savedStats = await AsyncStorage.getItem(statsKey);
      
      if (savedStats) {
        const dayPerformance: DayPerformance = JSON.parse(savedStats);
        
        // Trouver et supprimer la session
        const sessionToRemove = dayPerformance.sessionsList?.find(s => s.sessionId === sessionId);
        if (sessionToRemove) {
          // Mettre à jour les totaux
          dayPerformance.totalDistance -= sessionToRemove.distance;
          dayPerformance.totalTime -= sessionToRemove.duration;
          dayPerformance.totalCalories -= sessionToRemove.calories;
          dayPerformance.totalSteps -= sessionToRemove.steps;
          dayPerformance.sessions -= 1;
          
          // Supprimer la session de la liste
          dayPerformance.sessionsList = dayPerformance.sessionsList?.filter(s => s.sessionId !== sessionId) || [];
          
          // Recalculer ou supprimer complètement
          if (dayPerformance.sessions > 0) {
            dayPerformance.avgSpeed = (dayPerformance.totalTime > 0) ? 
              ((dayPerformance.totalDistance / (dayPerformance.totalTime / 3600000)) || 0) : 0;
            dayPerformance.maxSpeed = Math.max(...(dayPerformance.sessionsList?.map(s => s.maxSpeed) || [0]));
            await AsyncStorage.setItem(statsKey, JSON.stringify(dayPerformance));
          } else {
            await AsyncStorage.removeItem(statsKey);
          }
          
          logger.debug('Session supprimée des performances', { sessionId }, 'PHOTOS');
        }
      }
    } catch (error) {
      logger.error('Erreur suppression session des performances:', error, 'PHOTOS');
    }
  };

  return {
    takePhoto,
    pickPhoto,
    createForgottenPhoto,
    confirmDeletePhoto,
    deletePhoto,
    confirmDeleteSession,
    deleteSession,
    confirmDeleteDay,
    deleteDay
  };
}
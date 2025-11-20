import { Alert } from 'react-native';
import { usePOIs } from '../../../store/useDataStore';
import apiService from '../../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../../utils/logger';

interface PhotoGroup {
  date: string;
  displayDate: string;
  photos: any[];
  performance?: any;
  sessionGroups?: any[];
  orphanPhotos?: any[];
}

export const useDayDeleter = (onRefresh: () => void) => {
  const { pois, deletePOIsBatch } = usePOIs();

  const getLocalDateString = (timestamp: any) => {
    let ts = timestamp;
    if (typeof timestamp === 'string') {
      ts = new Date(timestamp).getTime();
    }
    if (!ts || isNaN(ts) || ts === 0) {
      const todayDate = new Date();
      const year = todayDate.getFullYear();
      const month = String(todayDate.getMonth() + 1).padStart(2, '0');
      const day = String(todayDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const date = new Date(ts);
    if (isNaN(date.getTime())) {
      const todayDate = new Date();
      const year = todayDate.getFullYear();
      const month = String(todayDate.getMonth() + 1).padStart(2, '0');
      const day = String(todayDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const now = Date.now();
    const maxFuture = now + (24 * 60 * 60 * 1000);
    if (ts > maxFuture) {
      const todayDate = new Date();
      const year = todayDate.getFullYear();
      const month = String(todayDate.getMonth() + 1).padStart(2, '0');
      const day = String(todayDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const confirmDeleteDay = (date: string, group: PhotoGroup) => {
    const photoCount = group.photos.length;
    const sessionCount = group.sessionGroups?.length || 0;
    const dayName = group.displayDate;

    Alert.alert(
      '🗑️ Supprimer le jour',
      `Êtes-vous sûr de vouloir supprimer TOUT le jour "${dayName}" ?\n\n• ${sessionCount} session(s)\n• ${photoCount} photo(s)\n• Toutes les performances\n\nCette action est DÉFINITIVE et irréversible !`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'SUPPRIMER TOUT',
          style: 'destructive',
          onPress: () => deleteDay(date),
        },
      ]
    );
  };

  const deleteDay = async (date: string) => {
    try {
      logger.debug('=== DÉBUT SUPPRESSION JOUR ===', { date }, 'DayDeleter');

      // Supprimer les POI locaux du jour
      const dayPhotos = pois.filter(poi => {
        const poiDate = getLocalDateString(poi.createdAt);
        if (!poiDate) {
          logger.debug(`POI "${poi.title}" ignoré (date invalide): ${poi.createdAt}`, undefined, 'DayDeleter');
          return false;
        }
        const match = poiDate === date;
        logger.debug(`POI "${poi.title}": ${poiDate} ${match ? '✅' : '❌'} ${date}`, undefined, 'DayDeleter');
        return match;
      });

      logger.debug(`POI locaux trouvés à supprimer: ${dayPhotos.length}`, undefined, 'DayDeleter');

      if (dayPhotos.length > 0) {
        logger.debug('Suppression des POI locaux en batch...', undefined, 'DayDeleter');
        try {
          const poiIds = dayPhotos.map(poi => poi.id);
          await deletePOIsBatch(poiIds);
          logger.debug(`${poiIds.length} POI supprimés en batch`, undefined, 'DayDeleter');
        } catch (batchError) {
          logger.error('Erreur suppression batch POI', batchError, 'DayDeleter');
        }
      } else {
        logger.debug('Aucun POI local à supprimer pour ce jour', undefined, 'DayDeleter');
      }

      // Supprimer les sessions MongoDB du jour
      logger.debug('Suppression sessions MongoDB du jour...', undefined, 'DayDeleter');
      try {
        const sessionsResponse = await apiService.getUserSessions({
          limit: 100,
          dateFrom: new Date(date + 'T00:00:00.000Z').toISOString(),
          dateTo: new Date(date + 'T23:59:59.999Z').toISOString()
        });

        if (sessionsResponse.success && sessionsResponse.data) {
          const sessions = Array.isArray(sessionsResponse.data) ? sessionsResponse.data : (sessionsResponse.data as any)?.data;

          if (sessions && Array.isArray(sessions)) {
            logger.debug(`${sessions.length} session(s) MongoDB trouvée(s) à supprimer pour ${date}`, undefined, 'DayDeleter');

            let deletedCount = 0;
            for (const session of sessions) {
              try {
                const sessionId = session._id || session.sessionId || session.id;
                logger.debug(`Suppression session MongoDB: ${sessionId} - ${session.sport} - ${session.distance}km`, undefined, 'DayDeleter');
                const deleteResult = await apiService.deleteSession(sessionId);
                if (deleteResult.success) {
                  deletedCount++;
                  logger.debug(`Session MongoDB supprimée: ${sessionId}`, undefined, 'DayDeleter');
                } else {
                  logger.error(`Échec suppression session: ${sessionId}`, deleteResult.message, 'DayDeleter');
                }
              } catch (sessionError) {
                logger.error(`Erreur suppression session ${session.sessionId}`, sessionError, 'DayDeleter');
              }
            }
            logger.debug(`${deletedCount}/${sessions.length} session(s) MongoDB supprimée(s)`, undefined, 'DayDeleter');
          } else {
            logger.debug('Aucune session MongoDB trouvée pour ce jour', undefined, 'DayDeleter');
          }
        } else {
          logger.debug('Échec récupération sessions MongoDB', sessionsResponse.message, 'DayDeleter');
        }
      } catch (mongoError) {
        logger.error('Erreur suppression sessions MongoDB', mongoError, 'DayDeleter');
      }

      // Supprimer les performances locales du jour
      logger.debug('Suppression performances locales...', undefined, 'DayDeleter');
      try {
        await removeDayPerformance(date);
        logger.debug('Performances supprimées', undefined, 'DayDeleter');
      } catch (perfError) {
        logger.error('Erreur suppression performances', perfError, 'DayDeleter');
        throw perfError;
      }

      logger.debug('=== JOUR SUPPRIMÉ AVEC SUCCÈS ===', { date }, 'DayDeleter');

      // Forcer le rechargement de l'interface avec un délai
      setTimeout(() => {
        onRefresh();
      }, 200);

    } catch (error) {
      logger.error('=== ERREUR SUPPRESSION JOUR ===', error, 'DayDeleter');
      Alert.alert(
        '❌ Erreur Suppression',
        `Impossible de supprimer le jour "${date}".\n\nErreur: ${error instanceof Error ? error.message : String(error)}\n\nVérifiez la console pour plus de détails.`
      );
    }
  };

  const removeDayPerformance = async (dateString: string) => {
    try {
      const statsKey = `daily_stats_${dateString}`;
      logger.debug('Suppression clé performances', { statsKey }, 'DayDeleter');

      // Vérifier si la clé existe avant suppression
      const existingStats = await AsyncStorage.getItem(statsKey);
      if (existingStats) {
        logger.debug('Performances trouvées, suppression...', undefined, 'DayDeleter');
        await AsyncStorage.removeItem(statsKey);
        logger.debug(`Performances du jour supprimées: ${dateString}`, undefined, 'DayDeleter');
      } else {
        logger.debug(`Aucune performance trouvée pour: ${dateString}`, undefined, 'DayDeleter');
      }
    } catch (error) {
      logger.error('Erreur suppression performances jour', error, 'DayDeleter');
      throw error; // Re-lancer l'erreur pour que deleteDay la capture
    }
  };

  return {
    confirmDeleteDay,
    deleteDay
  };
};
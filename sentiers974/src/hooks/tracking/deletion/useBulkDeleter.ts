import { Alert } from 'react-native';
import { usePointsOfInterest } from '../../usePointsOfInterest';
import { usePhotoSelection } from '../selection/usePhotoSelection';
import { useSessionDeleter } from './useSessionDeleter';
import { logger } from '../../../utils/logger';

interface PhotoGroup {
  date: string;
  displayDate: string;
  photos: any[];
  sessionGroups?: any[];
}

export const useBulkDeleter = (
  photoGroups: PhotoGroup[],
  expandedSections: Set<string>,
  onRefresh: () => void
) => {
  const { pois, deletePOI } = usePointsOfInterest();
  const {
    selectedPhotos,
    selectedSessions,
    deactivateSelectionMode,
    getSelectedCount
  } = usePhotoSelection();
  const { deleteSession } = useSessionDeleter(onRefresh);

  const deleteSelectedItems = async () => {
    const photoCount = selectedPhotos.size;
    const sessionCount = selectedSessions.size;

    Alert.alert(
      '🗑️ Suppression multiple',
      `Êtes-vous sûr de vouloir supprimer :\n\n• ${photoCount} photo(s)\n• ${sessionCount} session(s)\n\nCette action est irréversible !`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'SUPPRIMER',
          style: 'destructive',
          onPress: async () => {
            try {
              logger.debug('=== DÉBUT SUPPRESSION MULTIPLE ===', {
                photos: Array.from(selectedPhotos),
                sessions: Array.from(selectedSessions)
              }, 'BulkDeleter');

              // Supprimer les photos individuelles (seulement celles des sections ouvertes)
              const visiblePhotos = photoGroups
                .filter(group => expandedSections.has(group.date))
                .flatMap(g => g.photos);

              // Collecter toutes les photos valides à supprimer d'abord
              const photosToDelete = [];
              for (const photoId of selectedPhotos) {
                const photo = visiblePhotos.find(p => p.id === photoId);
                if (photo) {
                  logger.debug(`Photo à supprimer: ${photo.title}, source: ${photo.source}`, undefined, 'BulkDeleter');
                  if (photo.source === 'poi') {
                    photosToDelete.push(photo.id);
                  } else if (photo.source === 'backend') {
                    logger.debug(`Photo backend ignorée: ${photo.id} - Supprimer la session complète à la place`, undefined, 'BulkDeleter');
                  } else {
                    logger.debug(`Type de photo non reconnu: ${photo.source}`, undefined, 'BulkDeleter');
                  }
                } else {
                  logger.debug(`Photo ${photoId} ignorée (section fermée)`, undefined, 'BulkDeleter');
                }
              }

              // Supprimer toutes les photos POI en une seule opération
              if (photosToDelete.length > 0) {
                logger.debug(`Suppression de ${photosToDelete.length} POI en lot`, undefined, 'BulkDeleter');

                // Supprimer toutes les photos en parallèle pour éviter les conflits de state
                const deletePromises = photosToDelete.map(async (photoId) => {
                  try {
                    await deletePOI(photoId);
                    logger.debug(`POI supprimé: ${photoId}`, undefined, 'BulkDeleter');
                    return photoId;
                  } catch (error) {
                    logger.error(`Erreur suppression ${photoId}`, error, 'BulkDeleter');
                    return null;
                  }
                });

                const results = await Promise.all(deletePromises);
                const successCount = results.filter(id => id !== null).length;
                logger.debug(`${successCount}/${photosToDelete.length} POI supprimés avec succès`, undefined, 'BulkDeleter');
              }

              // Supprimer les sessions complètes (seulement celles des sections ouvertes)
              const visibleSessionIds = photoGroups
                .filter(group => expandedSections.has(group.date))
                .flatMap(group => group.sessionGroups || [])
                .map(sessionGroup => sessionGroup.sessionId);

              for (const sessionId of selectedSessions) {
                if (visibleSessionIds.includes(sessionId)) {
                  logger.debug(`Suppression session (section ouverte): ${sessionId}`, undefined, 'BulkDeleter');
                  await deleteSession(sessionId);
                } else {
                  logger.debug(`Session ${sessionId} ignorée (section fermée)`, undefined, 'BulkDeleter');
                }
              }

              logger.debug('=== SUPPRESSION MULTIPLE TERMINÉE ===', undefined, 'BulkDeleter');

              // Sortir du mode sélection et recharger
              deactivateSelectionMode();

              // Forcer plusieurs recharges pour s'assurer de la synchronisation
              onRefresh();
              setTimeout(() => {
                onRefresh();
              }, 100);
              setTimeout(() => {
                onRefresh();
              }, 500);

            } catch (error) {
              logger.error('Erreur suppression multiple', error, 'BulkDeleter');
              Alert.alert('❌ Erreur', `Erreur lors de la suppression multiple.\n\n${error instanceof Error ? error.message : error}`);
            }
          },
        },
      ]
    );
  };

  return {
    deleteSelectedItems,
    getSelectedCount
  };
};
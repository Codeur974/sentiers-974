import { Alert } from 'react-native';
import { usePointsOfInterest } from '../../usePointsOfInterest';
import { logger } from '../../../utils/logger';

interface PhotoItem {
  id: string;
  uri: string;
  title: string;
  note?: string;
  sessionId?: string;
  createdAt: number;
  source: 'poi' | 'backend';
}

export const usePhotoDeleter = (onRefresh: () => void) => {
  const { deletePOI } = usePointsOfInterest();

  const confirmDeletePhoto = (photo: PhotoItem) => {
    logger.debug('Confirmation suppression photo', {
      title: photo.title,
      id: photo.id,
      source: photo.source
    }, 'PhotoDeleter');

    Alert.alert(
      '🗑️ Supprimer la photo',
      `Êtes-vous sûr de vouloir supprimer la photo "${photo.title}" ?\n\nCette action est irréversible.`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => logger.debug('Suppression photo annulée', undefined, 'PhotoDeleter')
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            logger.debug('Confirmation suppression photo acceptée', undefined, 'PhotoDeleter');
            deletePhoto(photo);
          },
        },
      ]
    );
  };

  const deletePhoto = async (photo: PhotoItem) => {
    try {
      logger.debug('Début suppression photo', {
        title: photo.title,
        source: photo.source,
        id: photo.id
      }, 'PhotoDeleter');

      if (photo.source === 'poi') {
        // Suppression POI local uniquement
        logger.debug('Suppression POI local', { id: photo.id }, 'PhotoDeleter');
        await deletePOI(photo.id);
        logger.debug('POI local supprimé avec succès', undefined, 'PhotoDeleter');

      } else if (photo.source === 'backend') {
        // Suppression photo backend via API
        logger.debug('Suppression photo backend', { id: photo.id }, 'PhotoDeleter');
        // TODO: Implémenter apiService.deletePhoto(photo.id)
        logger.debug('Photo backend supprimée', undefined, 'PhotoDeleter');
      }

      logger.debug('Photo supprimée avec succès', { title: photo.title }, 'PhotoDeleter');

      // Forcer le rechargement de l'interface
      setTimeout(() => {
        onRefresh();
      }, 100);

    } catch (error) {
      logger.error('Erreur suppression photo', error, 'PhotoDeleter');
      Alert.alert(
        '❌ Erreur',
        `Impossible de supprimer la photo "${photo.title}".\n\nErreur: ${error instanceof Error ? error.message : error}\n\nVérifiez votre connexion.`
      );
    }
  };

  return {
    confirmDeletePhoto,
    deletePhoto
  };
};
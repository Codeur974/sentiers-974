import { Alert } from 'react-native';
import { usePOIs } from '../../../store/useDataStore';
import { logger } from '../../../utils/logger';
import * as FileSystem from 'expo-file-system';

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
  const { deletePOI } = usePOIs();

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
      logger.debug('D?but suppression photo', {
        title: photo.title,
        source: photo.source,
        id: photo.id
      }, 'PhotoDeleter');

      // Supprimer le POI associ? (m?me pour backend, l'id correspond au POI)
      logger.debug('Suppression POI', { id: photo.id, source: photo.source }, 'PhotoDeleter');
      await deletePOI(photo.id);
      logger.debug('POI supprim? (local + tentative backend si applicable)', undefined, 'PhotoDeleter');

      // Nettoyage local uniquement si fichier local (compat statAsync/getInfoAsync)
      if (photo.uri && photo.uri.startsWith('file://')) {
        const statFn = (FileSystem as any).statAsync || (FileSystem as any).getInfoAsync || null;
        const info = statFn ? await statFn(photo.uri).catch(() => null) : null;
        if (info?.exists) {
          await FileSystem.deleteAsync(photo.uri, { idempotent: true });
          logger.debug('Fichier local supprim?', { uri: photo.uri }, 'PhotoDeleter');
        } else {
          logger.debug('Fichier d?j? absent', { uri: photo.uri }, 'PhotoDeleter');
        }
      } else {
        logger.debug('URI distante, pas de delete local', { uri: photo.uri }, 'PhotoDeleter');
      }

      logger.debug('Photo supprim?e avec succ?s', { title: photo.title }, 'PhotoDeleter');

      // Forcer le rechargement de l'interface
      setTimeout(() => {
        onRefresh();
      }, 100);

    } catch (error) {
      logger.error('Erreur suppression photo', error, 'PhotoDeleter');
      Alert.alert(
        '?? Erreur',
        `Impossible de supprimer la photo "${photo.title}".

Erreur: ${error instanceof Error ? error.message : error}

V?rifiez votre connexion.`
      );
    }
  };

  return {
    confirmDeletePhoto,
    deletePhoto
  };
};


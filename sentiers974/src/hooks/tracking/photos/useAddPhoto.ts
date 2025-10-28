import { useState } from 'react';
import { Alert } from 'react-native';
import { usePointsOfInterest } from '../../usePointsOfInterest';
import { PhotoManager } from '../../../utils/photoUtils';
import { logger } from '../../../utils/logger';

export const useAddPhoto = (onRefresh: () => void) => {
  const { pois, createPOI } = usePointsOfInterest();
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoNote, setPhotoNote] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [creatingPhoto, setCreatingPhoto] = useState(false);

  const handleAddForgottenPhoto = (sessionId: string) => {
    logger.debug('Ouverture modal ajout photo oubliée', { sessionId }, 'AddPhoto');
    setSelectedSessionId(sessionId);
    setShowAddPhotoModal(true);
    setPhotoTitle('');
    setPhotoNote('');
    setSelectedPhotoUri(null);
  };

  const handleCloseModal = () => {
    logger.debug('Fermeture modal ajout photo', undefined, 'AddPhoto');
    setShowAddPhotoModal(false);
    setSelectedSessionId(null);
    setPhotoTitle('');
    setPhotoNote('');
    setSelectedPhotoUri(null);
  };

  const handleTakePhoto = async () => {
    try {
      logger.debug('Prise de photo', undefined, 'AddPhoto');
      const photoUri = await PhotoManager.takePhoto();
      if (photoUri) {
        setSelectedPhotoUri(photoUri);
        Alert.alert('Succès', 'Photo prise !');
        logger.debug('Photo prise avec succès', undefined, 'AddPhoto');
      }
    } catch (error) {
      logger.error('Erreur prise de photo', error, 'AddPhoto');
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handlePickPhoto = async () => {
    try {
      logger.debug('Sélection photo galerie', undefined, 'AddPhoto');
      const photoUri = await PhotoManager.pickPhoto();
      if (photoUri) {
        setSelectedPhotoUri(photoUri);
        Alert.alert('Succès', 'Photo sélectionnée !');
        logger.debug('Photo sélectionnée avec succès', undefined, 'AddPhoto');
      }
    } catch (error) {
      logger.error('Erreur sélection photo', error, 'AddPhoto');
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  };

  const handleRemovePhoto = () => {
    logger.debug('Suppression photo sélectionnée', undefined, 'AddPhoto');
    setSelectedPhotoUri(null);
  };

  const handleCreateForgottenPhoto = async () => {
    if (!photoTitle.trim()) {
      Alert.alert('Erreur', 'Titre obligatoire');
      return;
    }

    if (!selectedPhotoUri) {
      Alert.alert('Erreur', 'Photo obligatoire pour ajouter un souvenir');
      return;
    }

    if (!selectedSessionId) {
      Alert.alert('Erreur', 'Session non sélectionnée');
      return;
    }

    setCreatingPhoto(true);

    try {
      logger.debug('Début création photo oubliée', {
        sessionId: selectedSessionId,
        title: photoTitle.trim()
      }, 'AddPhoto');

      // Récupérer le timestamp de la session originale
      let sessionTimestamp = Date.now();

      const existingPOI = pois.find(poi => poi.sessionId === selectedSessionId);
      if (existingPOI) {
        sessionTimestamp = existingPOI.createdAt;
        logger.debug('Timestamp trouvé depuis POI', {
          timestamp: sessionTimestamp,
          date: new Date(sessionTimestamp).toLocaleString()
        }, 'AddPhoto');
      } else {
        logger.debug('Session non trouvée, utilisation timestamp actuel', undefined, 'AddPhoto');
      }

      // Position par défaut pour photo oubliée
      const defaultCoords = { latitude: -21.1151, longitude: 55.5364, altitude: 0 };

      const poi = await createPOI(
        defaultCoords,
        0, // Distance à 0 car photo ajoutée après coup
        0, // Temps à 0 car photo ajoutée après coup
        {
          title: photoTitle.trim(),
          note: photoNote.trim() || undefined,
          photo: selectedPhotoUri || undefined
        },
        selectedSessionId,
        sessionTimestamp
      );

      if (poi) {
        logger.debug('Photo oubliée créée avec succès', {
          poiId: poi.id,
          title: poi.title
        }, 'AddPhoto');

        handleCloseModal();
        Alert.alert('Succès', `Photo "${poi.title}" ajoutée à la session !`);

        // Forcer le rechargement
        setTimeout(() => {
          onRefresh();
        }, 100);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ajouter la photo');
      }
    } catch (error) {
      logger.error('Erreur création photo oubliée', error, 'AddPhoto');
      Alert.alert('Erreur', 'Erreur lors de l\'ajout de la photo');
    } finally {
      setCreatingPhoto(false);
    }
  };

  return {
    // État
    showAddPhotoModal,
    photoTitle,
    photoNote,
    selectedPhotoUri,
    creatingPhoto,

    // Actions
    handleAddForgottenPhoto,
    handleCloseModal,
    handleTakePhoto,
    handlePickPhoto,
    handleRemovePhoto,
    handleCreateForgottenPhoto,

    // Setters pour les inputs
    setPhotoTitle,
    setPhotoNote
  };
};
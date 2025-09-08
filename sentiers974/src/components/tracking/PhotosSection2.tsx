import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { usePhotosData } from './photos/hooks/usePhotosData';
import { usePhotoActions } from './photos/hooks/usePhotoActions';
import { PhotoDayGroup } from './photos/PhotoDayGroup';
import { AddPhotoModal } from './photos/AddPhotoModal';
import { PhotoModal } from './photos/PhotoModal';
import { PhotoItem as PhotoItemType, AddPhotoModalData } from './photos/types';
import { useModals, useSections } from '../../store/useUIStore';
import { logger } from '../../utils/logger';

interface PhotosSectionProps {
  isVisible: boolean;
  onInteraction?: () => void;
}

export interface PhotosSectionRef {
  closeAllSections: () => void;
}

/**
 * Version modulaire et optimisée de PhotosSection
 * Décomposée en hooks spécialisés et composants réutilisables
 * Compatible avec l'API existante - peut remplacer PhotosSection.tsx
 */
const PhotosSection2 = forwardRef<PhotosSectionRef, PhotosSectionProps>(function PhotosSection2(
  { isVisible, onInteraction },
  ref
) {
  const {
    photoGroups,
    refreshData,
    getLocalDateString,
    loadDayPerformance
  } = usePhotosData();

  const {
    takePhoto,
    pickPhoto,
    createForgottenPhoto,
    confirmDeletePhoto,
    confirmDeleteSession,
    confirmDeleteDay
  } = usePhotoActions(getLocalDateString, loadDayPerformance, refreshData);

  const {
    photoModal,
    addPhotoModal,
    openPhotoModal,
    closePhotoModal,
    openAddPhotoModal,
    closeAddPhotoModal
  } = useModals();

  const { closeAllSections } = useSections();

  // Expose les méthodes via ref pour compatibilité
  useImperativeHandle(ref, () => ({
    closeAllSections
  }));

  // Gestionnaires d'événements
  const handlePhotoPress = (photo: PhotoItemType) => {
    logger.debug('Ouverture modal photo', { title: photo.title }, 'PHOTOS');
    onInteraction?.(); // Notifie le parent de l'interaction
    openPhotoModal(photo);
  };

  const handlePhotoLongPress = (photo: PhotoItemType) => {
    logger.debug('Long press sur photo', { title: photo.title }, 'PHOTOS');
    onInteraction?.(); // Notifie le parent de l'interaction
    confirmDeletePhoto(photo);
  };

  const handleAddForgottenPhoto = (sessionId: string) => {
    logger.debug('Ajout photo oubliée', { sessionId }, 'PHOTOS');
    onInteraction?.(); // Notifie le parent de l'interaction
    const modalData: AddPhotoModalData = {
      sessionId,
      title: '',
      note: '',
      photoUri: null,
      isCreating: false
    };
    openAddPhotoModal(modalData);
  };

  const handleCreateForgottenPhoto = async (
    sessionId: string,
    title: string,
    note: string,
    photoUri: string
  ): Promise<boolean> => {
    return await createForgottenPhoto(sessionId, title, note, photoUri);
  };

  // Ne pas afficher si pas visible
  if (!isVisible) {
    return null;
  }

  if (photoGroups.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>📊 Mes Performances & Photos</Text>
          <Text style={styles.sectionSubtitle}>Vos activités et souvenirs</Text>
        </View>
        
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>🏃 Pas encore d'activités</Text>
          <Text style={styles.emptyDescription}>
            Commencez un tracking pour voir vos performances et photos ici
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>📊 Mes Performances & Photos</Text>
        <Text style={styles.sectionSubtitle}>
          {photoGroups.length} jour{photoGroups.length > 1 ? 's' : ''} • {
            photoGroups.reduce((total, group) => total + group.photos.length, 0)
          } photo{photoGroups.reduce((total, group) => total + group.photos.length, 0) > 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {photoGroups.map((group) => (
          <PhotoDayGroup
            key={group.date}
            group={group}
            onPhotoPress={handlePhotoPress}
            onPhotoLongPress={handlePhotoLongPress}
            onDeleteSession={confirmDeleteSession}
            onAddForgottenPhoto={handleAddForgottenPhoto}
            onDeleteDay={confirmDeleteDay}
          />
        ))}
      </ScrollView>

      {/* Modal d'ajout de photo oubliée */}
      <AddPhotoModal
        isVisible={addPhotoModal.isOpen}
        data={addPhotoModal.data || {
          sessionId: '',
          title: '',
          note: '',
          photoUri: null,
          isCreating: false
        }}
        onClose={closeAddPhotoModal}
        onTakePhoto={takePhoto}
        onPickPhoto={pickPhoto}
        onCreatePhoto={handleCreateForgottenPhoto}
      />

      {/* Modal d'affichage photo plein écran */}
      <PhotoModal
        isVisible={photoModal.isOpen}
        photo={photoModal.data || null}
        onClose={closePhotoModal}
      />
    </View>
  );
});

export default PhotosSection2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
});
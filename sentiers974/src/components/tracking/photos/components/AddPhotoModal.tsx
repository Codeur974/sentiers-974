import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { AddPhotoModalData } from '../types';
import { logger } from '../../../../utils/logger';

interface AddPhotoModalProps {
  isVisible: boolean;
  data: AddPhotoModalData;
  onClose: () => void;
  onTakePhoto: () => Promise<string | null>;
  onPickPhoto: () => Promise<string | null>;
  onCreatePhoto: (sessionId: string, title: string, note: string, photoUri: string) => Promise<boolean>;
}

export const AddPhotoModal = React.memo(function AddPhotoModal({
  isVisible,
  data,
  onClose,
  onTakePhoto,
  onPickPhoto,
  onCreatePhoto
}: AddPhotoModalProps) {
  const [localData, setLocalData] = useState<AddPhotoModalData>(data);

  useEffect(() => {
    if (isVisible) {
      setLocalData(data);
    }
  }, [isVisible, data]);

  const handleTakePhoto = async () => {
    logger.debug('Prise de photo depuis modal', undefined, 'PHOTOS');
    const photoUri = await onTakePhoto();
    if (photoUri) {
      setLocalData(prev => ({ ...prev, photoUri }));
    }
  };

  const handlePickPhoto = async () => {
    logger.debug('Sélection photo depuis modal', undefined, 'PHOTOS');
    const photoUri = await onPickPhoto();
    if (photoUri) {
      setLocalData(prev => ({ ...prev, photoUri }));
    }
  };

  const handleCreate = async () => {
    const { sessionId, title, note, photoUri } = localData;
    
    if (!photoUri || !title.trim()) {
      logger.warn('Données manquantes pour création photo', { hasPhoto: !!photoUri, hasTitle: !!title.trim() }, 'PHOTOS');
      return;
    }

    setLocalData(prev => ({ ...prev, isCreating: true }));
    
    const success = await onCreatePhoto(sessionId, title.trim(), note.trim(), photoUri);
    
    if (success) {
      logger.debug('Photo oubliée créée avec succès', undefined, 'PHOTOS');
      onClose();
    } else {
      setLocalData(prev => ({ ...prev, isCreating: false }));
    }
  };

  const isFormValid = localData.photoUri && localData.title.trim();

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📸 Ajouter une photo</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Photo Selection */}
              <View style={styles.photoSection}>
                <Text style={styles.sectionTitle}>Photo *</Text>
                
                {localData.photoUri ? (
                  <View style={styles.selectedPhotoContainer}>
                    <Image source={{ uri: localData.photoUri }} style={styles.selectedPhoto} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => setLocalData(prev => ({ ...prev, photoUri: null }))}
                    >
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoButtons}>
                    <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                      <Text style={styles.photoButtonIcon}>📷</Text>
                      <Text style={styles.photoButtonText}>Prendre</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto}>
                      <Text style={styles.photoButtonIcon}>📱</Text>
                      <Text style={styles.photoButtonText}>Galerie</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Title Input */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>Titre *</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Décrivez votre photo..."
                  value={localData.title}
                  onChangeText={(text) => setLocalData(prev => ({ ...prev, title: text }))}
                  maxLength={100}
                  multiline={false}
                />
              </View>

              {/* Note Input */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>Note (optionnelle)</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Ajoutez des détails..."
                  value={localData.note}
                  onChangeText={(text) => setLocalData(prev => ({ ...prev, note: text }))}
                  maxLength={500}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={localData.isCreating}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.createButton,
                  (!isFormValid || localData.isCreating) && styles.disabledButton
                ]}
                onPress={handleCreate}
                disabled={!isFormValid || localData.isCreating}
              >
                <Text style={[
                  styles.createButtonText,
                  (!isFormValid || localData.isCreating) && styles.disabledButtonText
                ]}>
                  {localData.isCreating ? 'Création...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: '#666',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  photoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  selectedPhotoContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  selectedPhoto: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff6b6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  photoButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  inputSection: {
    marginBottom: 20,
  },
  titleInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  noteInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  createButton: {
    backgroundColor: '#007bff',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#e9ecef',
    borderColor: '#e9ecef',
  },
  disabledButtonText: {
    color: '#adb5bd',
  },
});
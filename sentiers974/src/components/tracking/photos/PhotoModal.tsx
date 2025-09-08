import React from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions
} from 'react-native';
import { PhotoItem as PhotoItemType } from '../types';

interface PhotoModalProps {
  isVisible: boolean;
  photo: PhotoItemType | null;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const PhotoModal = React.memo(function PhotoModal({
  isVisible,
  photo,
  onClose
}: PhotoModalProps) {
  if (!photo) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.closeArea}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <Image
                source={{ uri: photo.uri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </ScrollView>

            <View style={styles.infoContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.photoTitle} numberOfLines={2}>
                  {photo.title}
                </Text>
                <View style={styles.sourceIndicator}>
                  <Text style={styles.sourceText}>
                    {photo.source === 'backend' ? '☁️ Serveur' : '📱 Local'}
                  </Text>
                </View>
              </View>
              
              {photo.note && (
                <Text style={styles.photoNote} numberOfLines={4}>
                  {photo.note}
                </Text>
              )}
              
              <View style={styles.metaInfo}>
                <Text style={styles.metaText}>
                  📅 {new Date(photo.createdAt).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.95,
    height: screenHeight * 0.85,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  fullImage: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.6,
  },
  infoContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  photoTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 12,
  },
  sourceIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sourceText: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: '500',
  },
  photoNote: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaInfo: {
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingTop: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
});
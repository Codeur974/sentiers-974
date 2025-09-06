import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PhotoItem as PhotoItemType } from '../types';

interface PhotoItemProps {
  photo: PhotoItemType;
  onPress: (photo: PhotoItemType) => void;
  onLongPress: (photo: PhotoItemType) => void;
}

export const PhotoItem = React.memo(function PhotoItem({ 
  photo, 
  onPress, 
  onLongPress 
}: PhotoItemProps) {
  return (
    <TouchableOpacity 
      style={styles.photoContainer}
      onPress={() => onPress(photo)}
      onLongPress={() => onLongPress(photo)}
    >
      <Image source={{ uri: photo.uri }} style={styles.photoImage} />
      <View style={styles.photoOverlay}>
        <Text style={styles.photoTitle} numberOfLines={1}>
          👁️ {photo.title}
        </Text>
        {photo.note && (
          <Text style={styles.photoNote} numberOfLines={2}>
            {photo.note}
          </Text>
        )}
        <View style={styles.sourceIndicator}>
          <Text style={styles.sourceText}>
            {photo.source === 'backend' ? '☁️' : '📱'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  photoContainer: {
    width: 120,
    height: 120,
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 6,
  },
  photoTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  photoNote: {
    color: '#ccc',
    fontSize: 10,
    lineHeight: 12,
  },
  sourceIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  sourceText: {
    fontSize: 12,
  },
});
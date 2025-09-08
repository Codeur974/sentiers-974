import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SessionGroup } from '../types';
import { PhotoItem } from './PhotoItem';
import { PhotoItem as PhotoItemType } from '../types';

interface PhotoSessionGroupProps {
  sessionGroup: SessionGroup;
  onPhotoPress: (photo: PhotoItemType) => void;
  onPhotoLongPress: (photo: PhotoItemType) => void;
  onDeleteSession: (sessionId: string, sessionGroup: SessionGroup) => void;
  onAddForgottenPhoto: (sessionId: string) => void;
}

export const PhotoSessionGroup = React.memo(function PhotoSessionGroup({
  sessionGroup,
  onPhotoPress,
  onPhotoLongPress,
  onDeleteSession,
  onAddForgottenPhoto
}: PhotoSessionGroupProps) {
  const { performance } = sessionGroup;
  
  return (
    <View style={styles.sessionContainer}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>
            🏃 {performance?.sport || 'Session'}
          </Text>
          {performance && (
            <View style={styles.performanceRow}>
              <Text style={styles.performanceText}>
                📏 {(performance.distance / 1000).toFixed(2)}km
              </Text>
              <Text style={styles.performanceText}>
                ⏱️ {Math.round(performance.duration / 60000)}min
              </Text>
              <Text style={styles.performanceText}>
                🔥 {Math.round(performance.calories)}cal
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.sessionActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAddForgottenPhoto(sessionGroup.sessionId)}
          >
            <Text style={styles.actionIcon}>📸</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDeleteSession(sessionGroup.sessionId, sessionGroup)}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photosScroll}
        contentContainerStyle={styles.photosContainer}
      >
        {sessionGroup.photos.map((photo) => (
          <PhotoItem
            key={photo.id}
            photo={photo}
            onPress={onPhotoPress}
            onLongPress={onPhotoLongPress}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  sessionContainer: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  performanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#ffe0e0',
  },
  actionIcon: {
    fontSize: 16,
  },
  photosScroll: {
    marginLeft: -12,
    marginRight: -12,
  },
  photosContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
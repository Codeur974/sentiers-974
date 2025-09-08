import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PhotoGroup } from '../types';
import { PhotoSessionGroup } from './PhotoSessionGroup';
import { PhotoItem as PhotoItemType } from '../types';
import { useSections } from '../../../../store/useUIStore';

interface PhotoDayGroupProps {
  group: PhotoGroup;
  onPhotoPress: (photo: PhotoItemType) => void;
  onPhotoLongPress: (photo: PhotoItemType) => void;
  onDeleteSession: (sessionId: string, sessionGroup: any) => void;
  onAddForgottenPhoto: (sessionId: string) => void;
  onDeleteDay: (date: string, group: PhotoGroup) => void;
}

export const PhotoDayGroup = React.memo(function PhotoDayGroup({
  group,
  onPhotoPress,
  onPhotoLongPress,
  onDeleteSession,
  onAddForgottenPhoto,
  onDeleteDay
}: PhotoDayGroupProps) {
  const { isSectionExpanded, toggleSection } = useSections();
  const sectionId = `day-${group.date}`;
  const isExpanded = isSectionExpanded(sectionId);

  const { performance } = group;

  return (
    <View style={styles.dayContainer}>
      <TouchableOpacity
        style={styles.dayHeader}
        onPress={() => toggleSection(sectionId)}
      >
        <View style={styles.dayHeaderLeft}>
          <Text style={styles.dayTitle}>{group.displayDate}</Text>
          {performance && (
            <View style={styles.dayPerformanceRow}>
              <Text style={styles.dayPerformanceText}>
                📏 {(performance.totalDistance / 1000).toFixed(2)}km
              </Text>
              <Text style={styles.dayPerformanceText}>
                ⏱️ {Math.round(performance.totalTime / 60000)}min
              </Text>
              <Text style={styles.dayPerformanceText}>
                🏃 {performance.sessions} session{performance.sessions > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.dayHeaderRight}>
          <TouchableOpacity
            style={[styles.deleteButton, styles.dayDeleteButton]}
            onPress={() => onDeleteDay(group.date, group)}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
          <Text style={styles.expandIcon}>
            {isExpanded ? '▲' : '▼'}
          </Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.dayContent}>
          {group.sessionGroups?.map((sessionGroup) => (
            <PhotoSessionGroup
              key={sessionGroup.sessionId}
              sessionGroup={sessionGroup}
              onPhotoPress={onPhotoPress}
              onPhotoLongPress={onPhotoLongPress}
              onDeleteSession={onDeleteSession}
              onAddForgottenPhoto={onAddForgottenPhoto}
            />
          )) || (
            <View style={styles.noSessionsContainer}>
              <Text style={styles.noSessionsText}>Aucune session trouvée</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  dayContainer: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  dayPerformanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  dayPerformanceText: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffe0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDeleteButton: {
    backgroundColor: '#fff0f0',
  },
  deleteIcon: {
    fontSize: 18,
  },
  expandIcon: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  dayContent: {
    padding: 16,
  },
  noSessionsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noSessionsText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
});
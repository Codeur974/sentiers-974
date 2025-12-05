import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SessionGroupComponent } from '../sessions/SessionGroup';
import { PhotoItemComponent } from '../photos/PhotoItem';

interface SessionPerformance {
  distance: number;
  duration: number;
  calories: number;
  avgSpeed: number;
  maxSpeed: number;
  steps: number;
  sport: string;
  sessionId: string;
  timestamp: number;
}

interface PhotoItem {
  id: string;
  uri: string;
  title: string;
  note?: string;
  sessionId?: string;
  createdAt: number;
  source: 'poi' | 'backend';
}

interface SessionGroup {
  sessionId: string;
  photos: PhotoItem[];
  performance?: SessionPerformance;
}

interface PhotoGroup {
  date: string;
  displayDate: string;
  photos: PhotoItem[];
  sessionGroups?: SessionGroup[];
  orphanPhotos?: PhotoItem[];
}

interface PhotoDayContentProps {
  group: PhotoGroup;
  onAddPhoto: (sessionId: string) => void;
  onDeleteSession: (sessionId: string, sessionGroup: SessionGroup) => void;
  onPhotoPress: (photo: PhotoItem) => void;
  onPhotoDelete: (photo: PhotoItem) => void;
}

export const PhotoDayContent: React.FC<PhotoDayContentProps> = ({
  group,
  onAddPhoto,
  onDeleteSession,
  onPhotoPress,
  onPhotoDelete
}) => {
  console.log('📋 PhotoDayContent rendu pour date:', group.date, {
    sessionGroups: group.sessionGroups?.length || 0,
    orphanPhotos: group.orphanPhotos?.length || 0
  });

  if (group.sessionGroups && group.sessionGroups.length > 0) {
    group.sessionGroups.forEach((sg, index) => {
      console.log(`  📦 SessionGroup ${index + 1}:`, {
        sessionId: sg.sessionId,
        hasPerformance: !!sg.performance,
        photos: sg.photos.length
      });
    });
  }

  return (
    <View className="mt-2 bg-white rounded-lg border border-blue-200" pointerEvents="auto">
      <ScrollView
        className="max-h-80 p-2"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sessions avec performances et photos */}
        {group.sessionGroups && group.sessionGroups.length > 0 ? (
          group.sessionGroups.map((sessionGroup) => (
            <SessionGroupComponent
              key={sessionGroup.sessionId}
              sessionGroup={sessionGroup}
              onAddPhoto={onAddPhoto}
              onDeleteSession={onDeleteSession}
              onPhotoPress={onPhotoPress}
              onPhotoDelete={onPhotoDelete}
            />
          ))
        ) : null}

        {/* Photos orphelines (non associées à une session) */}
        {group.orphanPhotos && group.orphanPhotos.length > 0 && (
          <View className="mb-4">
            <Text className="text-gray-600 font-medium mb-2">
              📷 Photos non associées ({group.orphanPhotos.length})
            </Text>
            {group.orphanPhotos.map((photo) => (
              <PhotoItemComponent
                key={photo.id}
                photo={photo}
                onPress={() => onPhotoPress(photo)}
                onDelete={onPhotoDelete}
                isOrphan={true}
              />
            ))}
          </View>
        )}

        {/* Section "Photos du jour" supprimée - photos affichées dans leurs sessions */}
      </ScrollView>
    </View>
  );
};
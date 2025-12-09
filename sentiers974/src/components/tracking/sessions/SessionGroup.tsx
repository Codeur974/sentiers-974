import React from 'react';
import { View } from 'react-native';
import { SessionHeader } from './SessionHeader';
import { SessionStats } from './SessionStats';
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

interface SessionGroupProps {
  sessionGroup: SessionGroup;
  onAddPhoto: (sessionId: string) => void;
  onDeleteSession: (sessionId: string, sessionGroup: SessionGroup) => void;
  onPhotoPress: (photo: PhotoItem) => void;
  onPhotoDelete: (photo: PhotoItem) => void;
}

export const SessionGroupComponent: React.FC<SessionGroupProps> = ({
  sessionGroup,
  onAddPhoto,
  onDeleteSession,
  onPhotoPress,
  onPhotoDelete
}) => {
  console.log('🎨 SessionGroup rendu:', {
    sessionId: sessionGroup.sessionId,
    hasPerformance: !!sessionGroup.performance,
    photos: sessionGroup.photos.length
  });

  if (!sessionGroup.performance) {
    console.log('⚠️ SessionGroup: Pas de performance pour', sessionGroup.sessionId);
    return null;
  }

  return (
    <View className="mb-4">
      {/* Performance de la session */}
      <View className="mb-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <SessionHeader
            sessionId={sessionGroup.sessionId}
            sport={sessionGroup.performance.sport}
            sessionTimestamp={sessionGroup.performance.timestamp}
            onAddPhoto={onAddPhoto}
            onDeleteSession={(sessionId) => onDeleteSession(sessionId, sessionGroup)}
          />

        <SessionStats performance={sessionGroup.performance} />
      </View>

      {/* Photos de cette session */}
      {sessionGroup.photos.map((photo) => (
        <PhotoItemComponent
          key={photo.id}
          photo={photo}
          onPress={() => onPhotoPress(photo)}
          onDelete={onPhotoDelete}
        />
      ))}
    </View>
  );
};

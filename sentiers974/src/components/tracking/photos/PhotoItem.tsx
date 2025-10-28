import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { usePhotoSelection } from '../../../hooks/tracking/selection/usePhotoSelection';
import { PhotoThumbnail } from './PhotoThumbnail';
import { PhotoActions } from './PhotoActions';

interface PhotoItem {
  id: string;
  uri: string;
  title: string;
  note?: string;
  sessionId?: string;
  createdAt: number;
  source: 'poi' | 'backend';
}

interface PhotoItemProps {
  photo: PhotoItem;
  onPress: () => void;
  onDelete: (photo: PhotoItem) => void;
  isOrphan?: boolean;
}

export const PhotoItemComponent: React.FC<PhotoItemProps> = ({
  photo,
  onPress,
  onDelete,
  isOrphan = false
}) => {
  const {
    checkboxesVisible,
    togglePhotoSelection,
    isPhotoSelected
  } = usePhotoSelection();

  const isSelected = isPhotoSelected(photo.id);

  const handlePress = () => {
    if (checkboxesVisible) {
      togglePhotoSelection(photo.id);
    } else {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={`flex-row items-center p-2 mb-2 rounded-lg border ${
        isSelected ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 border-gray-200'
      }`}
      activeOpacity={1}
    >
      {/* Checkbox de sélection */}
      {checkboxesVisible && (
        <View className="mr-2">
          <View className={`w-6 h-6 rounded border-2 items-center justify-center ${
            isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-400'
          }`}>
            {isSelected && (
              <Text className="text-white text-xs font-bold">✓</Text>
            )}
          </View>
        </View>
      )}

      {/* Thumbnail et infos */}
      <PhotoThumbnail
        uri={photo.uri}
        title={photo.title}
        note={photo.note}
        isOrphan={isOrphan}
        sessionId={photo.sessionId}
      />

      {/* Actions */}
      <PhotoActions
        source={photo.source}
        isOrphan={isOrphan}
        onDelete={() => onDelete(photo)}
      />
    </TouchableOpacity>
  );
};
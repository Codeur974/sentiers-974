import React from 'react';
import { View, Text, Image } from 'react-native';

interface PhotoThumbnailProps {
  uri: string;
  title: string;
  note?: string;
  isOrphan?: boolean;
  sessionId?: string;
}

export const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({
  uri,
  title,
  note,
  isOrphan = false,
  sessionId
}) => {
  return (
    <>
      {/* Miniature */}
      <Image
        source={{ uri }}
        className="w-16 h-16 rounded-lg border border-gray-300"
        resizeMode="cover"
      />

      {/* Infos */}
      <View className="flex-1 ml-3">
        <Text className="font-bold text-gray-800 text-base" numberOfLines={1}>
          📸 {title}
        </Text>
        {note && (
          <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
            💭 {note}
          </Text>
        )}
        {isOrphan && (
          <Text className="text-xs text-orange-500 mt-1">
            ⚠️ Session introuvable: {sessionId?.substring(0, 20)}...
          </Text>
        )}
      </View>
    </>
  );
};
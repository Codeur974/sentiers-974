import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { usePhotoSelection } from '../../../hooks/tracking/selection/usePhotoSelection';

interface SessionHeaderProps {
  sessionId: string;
  sport: string;
  sessionTimestamp?: number;
  onAddPhoto: (sessionId: string, sessionTimestamp?: number) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  sessionId,
  sport,
  sessionTimestamp,
  onAddPhoto,
  onDeleteSession
}) => {
  const {
    checkboxesVisible,
    toggleSessionSelection,
    isSessionSelected
  } = usePhotoSelection();

  const isSelected = isSessionSelected(sessionId);

  return (
    <View className={`flex-row justify-between items-center mb-2 p-2 rounded-lg border ${
      isSelected ? 'bg-green-100 border-green-300' : 'bg-white border-gray-200'
    }`}>
      <View className="flex-row items-center flex-1">
        {/* Checkbox de sélection de session */}
        {checkboxesVisible && (
          <TouchableOpacity
            onPress={() => toggleSessionSelection(sessionId)}
            className="mr-3"
            activeOpacity={1}
          >
            <View className={`w-6 h-6 rounded border-2 items-center justify-center ${
              isSelected ? 'bg-green-500 border-green-500' : 'bg-white border-gray-400'
            }`}>
              {isSelected && (
                <Text className="text-white text-xs font-bold">✓</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        <Text className="font-bold text-gray-800 flex-1" numberOfLines={1}>
          📊 Session {sport}
        </Text>
      </View>

      {!checkboxesVisible && (
        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={() => onAddPhoto(sessionId, sessionTimestamp)}
            className="bg-blue-100 px-2 py-1 rounded-full"
            activeOpacity={1}
          >
            <Text className="text-blue-600 text-xs">📷 + Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onDeleteSession(sessionId)}
            className="bg-red-100 px-2 py-1 rounded-full"
            activeOpacity={1}
          >
            <Text className="text-red-600 text-xs">🗑️ Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

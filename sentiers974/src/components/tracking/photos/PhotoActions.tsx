import React from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';

interface PhotoActionsProps {
  source: 'poi' | 'backend';
  isOrphan?: boolean;
  onDelete: () => void;
}

export const PhotoActions: React.FC<PhotoActionsProps> = ({
  source,
  isOrphan = false,
  onDelete
}) => {
  const handleDelete = (e: any) => {
    e.stopPropagation();

    if (source === 'backend') {
      Alert.alert(
        'ℹ️ Photo serveur',
        'Cette photo provient du serveur.\n\nUtilisez "Supprimer Session" pour supprimer toute l\'activité.',
        [{ text: 'OK' }]
      );
      return;
    }

    onDelete();
  };

  return (
    <View className="flex-row items-center space-x-3 ml-2">
      {/* Badge source */}
      <View className={`px-3 py-2 rounded-lg ${
        isOrphan ? 'bg-orange-100' :
        source === 'poi' ? 'bg-blue-100' : 'bg-green-100'
      }`}>
        <Text className={`text-sm font-medium ${
          isOrphan ? 'text-orange-600' :
          source === 'poi' ? 'text-blue-600' : 'text-green-600'
        }`}>
          {isOrphan ? '⚠️' : source === 'poi' ? '👁️' : '☁️'}
        </Text>
      </View>

      {/* Bouton supprimer */}
      <TouchableOpacity
        onPress={handleDelete}
        className={`px-3 py-2 rounded-lg border ${
          source === 'backend'
            ? 'bg-gray-100 border-gray-200 opacity-50'
            : 'bg-red-100 border-red-200'
        }`}
      >
        <Text className={`text-sm font-medium ${
          source === 'backend' ? 'text-gray-500' : 'text-red-600'
        }`}>
          {source === 'backend' ? '🔒' : '🗑️'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
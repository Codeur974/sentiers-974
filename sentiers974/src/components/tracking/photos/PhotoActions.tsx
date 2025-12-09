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
        className="px-3 py-2 rounded-lg border bg-red-100 border-red-200"
      >
        <Text className="text-sm font-medium text-red-600">
          🗑️
        </Text>
      </TouchableOpacity>
    </View>
  );
};
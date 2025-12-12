import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

interface DayPerformance {
  totalDistance: number;
  totalTime: number;
  totalCalories: number;
  avgSpeed: number;
  sessions: number;
  maxSpeed: number;
  totalSteps: number;
}

interface SessionGroup {
  sessionId: string;
  photos: any[];
  performance?: any;
}

interface PhotoGroup {
  date: string;
  displayDate: string;
  photos: any[];
  performance?: DayPerformance;
  sessionGroups?: SessionGroup[];
  orphanPhotos?: any[];
}

interface PhotoDayHeaderProps {
  group: PhotoGroup;
  isExpanded: boolean;
  onToggle: (date: string) => void;
  onDeleteDay: (date: string, group: PhotoGroup) => void;
  onInteraction?: () => void;
}

export const PhotoDayHeader: React.FC<PhotoDayHeaderProps> = ({
  group,
  isExpanded,
  onToggle,
  onDeleteDay,
  onInteraction
}) => {
  const handleToggle = () => {
    onToggle(group.date);
    onInteraction?.();
  };

  const handleDeleteDay = (e: any) => {
    e.stopPropagation();
    console.log('🗑️ Date à supprimer:', group.date);
    onDeleteDay(group.date, group);
  };

  return (
    <TouchableOpacity
      onPress={handleToggle}
      activeOpacity={1}
      className="bg-blue-100 p-3 rounded-lg border border-blue-300 flex-row justify-between items-center"
    >
      <View className="flex-1">
        <Text className="font-bold text-blue-800">
          📅 {group.displayDate}
        </Text>
        <View className="flex-row items-center gap-3">
          <Text className="text-sm text-blue-600">
            📷 {group.photos.length} photo{group.photos.length > 1 ? 's' : ''}
          </Text>
          {group.sessionGroups && group.sessionGroups.length > 0 && (
            <Text className="text-sm text-purple-600 font-medium ml-2">
              📊 {group.sessionGroups.length} session{group.sessionGroups.length > 1 ? 's' : ''}
            </Text>
          )}
          {group.performance && group.performance.totalDistance > 0 && (
            <Text className="text-sm text-green-600 font-bold ml-2">
              🏃 {group.performance.totalDistance.toFixed(1)}km
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center space-x-6">
        {/* Bouton supprimer jour */}
        <TouchableOpacity
          onPress={handleDeleteDay}
          className="bg-red-100 px-2 py-1 rounded-full"
        >
          <Text className="text-red-600 text-xs">🗑️</Text>
        </TouchableOpacity>

        {/* Indicateur expand/collapse */}
        <Text className="text-blue-600 text-xl">
          {isExpanded ? '▼' : '▶️'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Activity } from "../types/api";

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
  compact?: boolean;
}

const ActivityCard = React.memo(function ActivityCard({ activity, onPress, compact = false }: ActivityCardProps) {
  const getActivityIcon = (type: Activity['activityType']) => {
    switch (type) {
      case 'course': return '🏃‍♂️';
      case 'randonnee': return '🥾';
      case 'velo': return '🚴‍♂️';
      case 'vtt': return '🚵‍♂️';
      case 'trail': return '🏃‍♀️';
      case 'natation': return '🏊‍♂️';
      case 'surf': return '🏄‍♂️';
      case 'kitesurf': return '🪁';
      default: return '⚡';
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'facile': return 'bg-green-100 text-green-700 border-green-200';
      case 'moyen': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'difficile': return 'bg-red-100 text-red-700 border-red-200';
      case 'expert': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h${minutes.toString().padStart(2, '0')}`;
    }
    return `${minutes}min`;
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-2"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-3">{getActivityIcon(activity.activityType)}</Text>
            <View className="flex-1">
              <Text className="font-semibold text-gray-800 text-sm" numberOfLines={1}>
                {activity.title}
              </Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-xs text-gray-500 mr-2">
                  📏 {formatDistance(activity.distance)}
                </Text>
                <Text className="text-xs text-gray-500">
                  ⏱️ {formatDuration(activity.duration)}
                </Text>
              </View>
            </View>
          </View>
          <Text className="text-xs text-gray-500">
            {formatDate(activity.date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3"
    >
      {/* Header avec icon, titre et date */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <Text className="text-3xl mr-3">{getActivityIcon(activity.activityType)}</Text>
          <View className="flex-1">
            <Text className="font-bold text-lg text-gray-800" numberOfLines={2}>
              {activity.title}
            </Text>
            <Text className="text-sm text-blue-600 font-medium capitalize">
              {activity.activityType}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-sm font-semibold text-gray-700">
            {formatDate(activity.date)}
          </Text>
        </View>
      </View>

      {/* Description */}
      {activity.notes && (
        <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
          {activity.notes}
        </Text>
      )}

      {/* Statistiques principales */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Text className="text-sm text-gray-700 font-medium mr-4">
            📏 {formatDistance(activity.distance)}
          </Text>
          <Text className="text-sm text-gray-700 font-medium mr-4">
            ⏱️ {formatDuration(activity.duration)}
          </Text>
          {activity.elevation.gain > 0 && (
            <Text className="text-sm text-gray-700 font-medium">
              ⛰️ +{Math.round(activity.elevation.gain)}m
            </Text>
          )}
        </View>
      </View>

      {/* Footer avec lieu et difficulté */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {activity.location?.region && (
            <Text className="text-xs text-gray-500 mr-3">
              📍 {activity.location.region}
              {activity.location.trail && ` - ${activity.location.trail}`}
            </Text>
          )}
        </View>
        
        <View className="flex-row items-center">
          {activity.location?.difficulty && (
            <View className={`px-2 py-1 rounded-full border ${getDifficultyColor(activity.location.difficulty)}`}>
              <Text className="text-xs font-medium capitalize">
                {activity.location.difficulty}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Photos */}
      {activity.photos && activity.photos.length > 0 && (
        <View className="mt-2 pt-2 border-t border-gray-100">
          <Text className="text-xs text-center text-gray-500">
            📸 {activity.photos.length} photo{activity.photos.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export default ActivityCard;
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { SportEvent } from "../types/events";

interface EventCardProps {
  event: SportEvent;
  onPress?: () => void;
  compact?: boolean; // Version compacte pour la page d'accueil
}

export default function EventCard({ event, onPress, compact = false }: EventCardProps) {
  const handleWebsitePress = () => {
    if (event.website) {
      Linking.openURL(event.website);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'facile': return 'bg-green-100 text-green-700 border-green-200';
      case 'moyen': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'difficile': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'facile': return '🟢';
      case 'moyen': return '🟡';
      case 'difficile': return '🔴';
      default: return '⚪';
    }
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // HH:MM
  };

  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date === today.toISOString().split('T')[0]) {
      return "Aujourd'hui";
    } else if (date === tomorrow.toISOString().split('T')[0]) {
      return "Demain";
    } else {
      return dateObj.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
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
            <Text className="text-2xl mr-3">{event.emoji}</Text>
            <View className="flex-1">
              <Text className="font-semibold text-gray-800 text-sm" numberOfLines={1}>
                {event.title}
              </Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-xs text-gray-500 mr-2">
                  🕐 {formatTime(event.time)}
                </Text>
                <Text className="text-xs text-gray-500" numberOfLines={1}>
                  📍 {event.location}
                </Text>
              </View>
            </View>
          </View>
          <View className={`px-2 py-1 rounded-full border ${getDifficultyColor(event.difficulty)}`}>
            <Text className="text-xs font-medium">
              {getDifficultyIcon(event.difficulty)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3"
    >
      {/* Header avec emoji, titre et date */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <Text className="text-3xl mr-3">{event.emoji}</Text>
          <View className="flex-1">
            <Text className="font-bold text-lg text-gray-800" numberOfLines={2}>
              {event.title}
            </Text>
            <Text className="text-sm text-blue-600 font-medium">
              {event.sport}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-sm font-semibold text-gray-700">
            {formatDate(event.date)}
          </Text>
          <Text className="text-sm text-gray-500">
            🕐 {formatTime(event.time)}
          </Text>
        </View>
      </View>

      {/* Description */}
      {event.description && (
        <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
          {event.description}
        </Text>
      )}

      {/* Informations détaillées */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Text className="text-sm text-gray-500 mr-4">
            📍 {event.location}
          </Text>
          {event.distance && (
            <Text className="text-sm text-gray-500 mr-4">
              📏 {event.distance}
            </Text>
          )}
          {event.elevation && event.elevation !== '0m' && event.elevation !== 'Plat' && (
            <Text className="text-sm text-gray-500">
              ⛰️ {event.elevation}
            </Text>
          )}
        </View>
      </View>

      {/* Footer avec difficulté, organisateur et prix */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className={`px-3 py-1 rounded-full border mr-3 ${getDifficultyColor(event.difficulty)}`}>
            <Text className="text-xs font-medium">
              {getDifficultyIcon(event.difficulty)} {event.difficulty}
            </Text>
          </View>
          <Text className="text-xs text-gray-500">
            par {event.organizer}
          </Text>
        </View>
        
        <View className="flex-row items-center">
          {event.price && (
            <Text className="text-sm font-semibold text-green-600 mr-3">
              {event.price}
            </Text>
          )}
          {event.website && (
            <TouchableOpacity
              onPress={handleWebsitePress}
              className="bg-blue-600 px-3 py-1 rounded-lg"
            >
              <Text className="text-white text-xs font-medium">
                🌐 Info
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Badge d'inscription */}
      {event.registration && (
        <View className="mt-2 pt-2 border-t border-gray-100">
          <Text className="text-xs text-center text-gray-500">
            📝 Inscription: {event.registration}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
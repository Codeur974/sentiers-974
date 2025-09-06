import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { logger } from '../../utils/logger';

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  category: string;
}

interface TodayEventsProps {
  events: Event[];
  loading: boolean;
  onEventPress: (event: Event) => void;
  onRefresh: () => void;
}

/**
 * Version optimisée de TodayEvents avec React.memo
 * Évite les re-renders lors des changements d'autres sections
 */
const OptimizedTodayEvents = React.memo(function TodayEvents({
  events,
  loading,
  onEventPress,
  onRefresh
}: TodayEventsProps) {
  logger.debug('Render TodayEvents', { eventsCount: events.length, loading }, 'PERF');

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'sport': return '🏃';
      case 'culture': return '🎭';
      case 'nature': return '🌿';
      case 'famille': return '👨‍👩‍👧‍👦';
      case 'festival': return '🎉';
      default: return '📅';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'sport': return 'bg-blue-100 text-blue-700';
      case 'culture': return 'bg-purple-100 text-purple-700';
      case 'nature': return 'bg-green-100 text-green-700';
      case 'famille': return 'bg-orange-100 text-orange-700';
      case 'festival': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <View className="mb-8">
        <Text className="text-xl font-bold text-gray-900 mb-4">
          📅 Événements du jour
        </Text>
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <Text className="text-center text-gray-500">
            Chargement des événements...
          </Text>
        </View>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View className="mb-8">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-gray-900">
            📅 Événements du jour
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            className="bg-blue-100 px-3 py-1 rounded-full"
          >
            <Text className="text-blue-600 text-sm font-medium">
              🔄 Actualiser
            </Text>
          </TouchableOpacity>
        </View>
        
        <View className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <Text className="text-center text-gray-600 font-medium mb-2">
            🌅 Aucun événement aujourd'hui
          </Text>
          <Text className="text-center text-gray-500 text-sm">
            Profitez de cette journée libre pour explorer La Réunion !
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-8">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-900">
          📅 Événements du jour
        </Text>
        <View className="flex-row items-center">
          <View className="bg-blue-100 px-3 py-1 rounded-full mr-2">
            <Text className="text-blue-600 text-sm font-medium">
              {events.length} événement{events.length > 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            className="bg-gray-100 px-3 py-1 rounded-full"
          >
            <Text className="text-gray-600 text-sm font-medium">
              🔄
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
      >
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 mr-4 w-80"
            onPress={() => onEventPress(event)}
          >
            <View className="p-6">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1 mr-3">
                  <Text className="font-bold text-lg text-gray-900 mb-1" numberOfLines={2}>
                    {event.title}
                  </Text>
                  {event.description && (
                    <Text className="text-gray-600 text-sm" numberOfLines={2}>
                      {event.description}
                    </Text>
                  )}
                </View>
                <View className={`px-3 py-1 rounded-full ${getCategoryColor(event.category)}`}>
                  <Text className="text-xs font-medium">
                    {getCategoryIcon(event.category)} {event.category}
                  </Text>
                </View>
              </View>
              
              {event.location && (
                <View className="flex-row items-center mb-2">
                  <Text className="text-gray-500 text-sm">
                    📍 {event.location}
                  </Text>
                </View>
              )}
              
              <View className="flex-row items-center">
                <Text className="text-gray-500 text-sm">
                  🕐 {new Date(event.date).toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

export default OptimizedTodayEvents;
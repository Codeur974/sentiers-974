import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import EventCard from "./EventCard";
import { SportEvent } from "../types/events";
import { getTodayReunionEvents } from "../data/reunionEvents";

export default function TodayEvents() {
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const loadTodayEvents = async () => {
    try {
      setLoading(true);
      const todayEvents = getTodayReunionEvents();
      setEvents(todayEvents);
    } catch (error) {
      console.error('Erreur lors du chargement des événements du jour:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTodayEvents();
    setRefreshing(false);
  };

  const handleSeeAllEvents = () => {
    navigation.navigate("Events" as never);
  };

  const handleEventPress = (event: SportEvent) => {
    // Navigation vers les détails de l'événement ou ouverture du site web
    console.log('Événement sélectionné:', event.title);
  };

  useEffect(() => {
    loadTodayEvents();
  }, []);

  if (loading && events.length === 0) {
    return (
      <View className="bg-white p-4 rounded-xl shadow-sm my-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-800">
            📅 Activités d'aujourd'hui
          </Text>
        </View>
        <View className="items-center py-8">
          <Text className="text-gray-500">Chargement des événements...</Text>
        </View>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View className="bg-white p-4 rounded-xl shadow-sm my-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-800">
            📅 Activités d'aujourd'hui
          </Text>
          <TouchableOpacity onPress={handleSeeAllEvents}>
            <Text className="text-blue-600 text-sm font-medium">
              Voir toutes →
            </Text>
          </TouchableOpacity>
        </View>
        
        <View className="items-center py-6">
          <Text className="text-6xl mb-2">🌴</Text>
          <Text className="text-gray-500 text-center">
            Aucune activité prévue aujourd'hui
          </Text>
          <Text className="text-gray-400 text-sm text-center mt-1">
            Consultez les prochains événements
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-white p-4 rounded-xl shadow-sm my-4">
      {/* Header avec titre et bouton "Voir tout" */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-gray-800">
          📅 Activités d'aujourd'hui
        </Text>
        <TouchableOpacity onPress={handleSeeAllEvents}>
          <Text className="text-blue-600 text-sm font-medium">
            Voir toutes →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Compteur d'événements */}
      <View className="bg-blue-50 p-2 rounded-lg mb-3">
        <Text className="text-blue-700 text-sm text-center">
          🎯 {events.length} activité{events.length > 1 ? 's' : ''} disponible{events.length > 1 ? 's' : ''} aujourd'hui
        </Text>
      </View>

      {/* Liste des événements */}
      <ScrollView 
        className="max-h-80"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            compact={true}
            onPress={() => handleEventPress(event)}
          />
        ))}
      </ScrollView>

      {/* Bouton pour voir plus d'événements */}
      {events.length > 0 && (
        <TouchableOpacity
          onPress={handleSeeAllEvents}
          className="bg-blue-600 p-3 rounded-xl mt-3"
        >
          <Text className="text-white font-semibold text-center">
            📱 Voir tous les événements à venir
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
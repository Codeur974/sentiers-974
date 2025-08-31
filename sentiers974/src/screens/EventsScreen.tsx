import { useEffect, useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, TextInput } from "react-native";
import Layout from "../components/Layout";
import EventCard from "../components/EventCard";
import { SportEvent } from "../services/eventsApi";
import { getUpcomingReunionEvents } from "../data/reunionEvents";

export default function EventsScreen() {
  const [allEvents, setAllEvents] = useState<SportEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState('');

  const loadEvents = async () => {
    try {
      setLoading(true);
      const upcomingEvents = getUpcomingReunionEvents(30); // 30 prochains jours
      setAllEvents(upcomingEvents);
      setFilteredEvents(upcomingEvents);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleEventPress = (event: SportEvent) => {
    console.log('Événement sélectionné:', event.title);
    // Ici on pourrait naviguer vers une page de détails ou ouvrir le site web
  };

  // Filtres par sport
  const sportFilters = [
    { key: 'tous', label: 'Tous', emoji: '🏃‍♀️' },
    { key: 'Course', label: 'Course', emoji: '🏃‍♀️' },
    { key: 'Trail', label: 'Trail', emoji: '🏃‍♂️' },
    { key: 'Randonnée', label: 'Rando', emoji: '🥾' },
    { key: 'Marche', label: 'Marche', emoji: '🚶‍♀️' },
    { key: 'VTT', label: 'VTT', emoji: '🚵‍♀️' },
    { key: 'Vélo', label: 'Vélo', emoji: '🚴‍♀️' },
    { key: 'Natation', label: 'Natation', emoji: '🏊‍♀️' },
    { key: 'Surf', label: 'Surf', emoji: '🏄‍♀️' },
    { key: 'SUP', label: 'SUP', emoji: '🏄‍♂️' },
    { key: 'Kayak', label: 'Kayak', emoji: '🛶' },
    { key: 'Escalade', label: 'Escalade', emoji: '🧗‍♀️' },
  ];

  // Appliquer les filtres
  useEffect(() => {
    let filtered = allEvents;

    // Filtre par sport
    if (selectedFilter !== 'tous') {
      filtered = filtered.filter(event => event.sport === selectedFilter);
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  }, [allEvents, selectedFilter, searchQuery]);

  useEffect(() => {
    loadEvents();
  }, []);

  // Grouper les événements par date
  const groupEventsByDate = (events: SportEvent[]) => {
    const grouped = events.reduce((groups, event) => {
      const date = event.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {} as Record<string, SportEvent[]>);

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  };

  const formatDateHeader = (date: string) => {
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
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
  };

  const headerButtons = (
    <TouchableOpacity 
      className="bg-blue-800 px-3 py-1 rounded-lg"
      onPress={handleRefresh}
    >
      <Text className="text-white text-sm">🔄</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <Layout
        headerTitle="Événements sportifs"
        showBackButton={true}
        headerButtons={headerButtons}
      >
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 text-lg">
            Chargement des événements...
          </Text>
        </View>
      </Layout>
    );
  }

  const groupedEvents = groupEventsByDate(filteredEvents);

  return (
    <Layout
      headerTitle="Événements sportifs"
      showBackButton={true}
      headerButtons={headerButtons}
    >
      <ScrollView 
        className="flex-1 bg-gray-50"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Statistiques */}
        <View className="bg-white p-4 mb-2">
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">
                {allEvents.length}
              </Text>
              <Text className="text-xs text-gray-500">Événements</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">
                {new Set(allEvents.map(e => e.sport)).size}
              </Text>
              <Text className="text-xs text-gray-500">Sports</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-orange-600">
                {filteredEvents.length}
              </Text>
              <Text className="text-xs text-gray-500">Filtrés</Text>
            </View>
          </View>
        </View>

        {/* Barre de recherche */}
        <View className="bg-white p-4 mb-2">
          <TextInput
            className="bg-gray-100 p-3 rounded-xl text-gray-800"
            placeholder="Rechercher un événement..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filtres par sport */}
        <View className="bg-white p-4 mb-2">
          <Text className="font-semibold text-gray-800 mb-3">
            Filtrer par sport :
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {sportFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  onPress={() => setSelectedFilter(filter.key)}
                  className={`px-4 py-2 rounded-full mr-2 border ${
                    selectedFilter === filter.key
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedFilter === filter.key ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {filter.emoji} {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Liste des événements groupés par date */}
        {groupedEvents.length === 0 ? (
          <View className="bg-white p-8 m-4 rounded-xl items-center">
            <Text className="text-6xl mb-4">🔍</Text>
            <Text className="text-gray-600 text-center text-lg">
              Aucun événement trouvé
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              Essayez de modifier vos filtres
            </Text>
          </View>
        ) : (
          <View className="px-4">
            {groupedEvents.map(([date, events]) => (
              <View key={date} className="mb-6">
                {/* Header de date */}
                <View className="bg-blue-600 p-3 rounded-t-xl">
                  <Text className="text-white font-bold text-lg">
                    {formatDateHeader(date)}
                  </Text>
                  <Text className="text-blue-100 text-sm">
                    {events.length} événement{events.length > 1 ? 's' : ''}
                  </Text>
                </View>
                
                {/* Événements de cette date */}
                <View className="bg-white rounded-b-xl overflow-hidden">
                  {events.map((event, index) => (
                    <View key={event.id}>
                      <EventCard
                        event={event}
                        onPress={() => handleEventPress(event)}
                      />
                      {index < events.length - 1 && (
                        <View className="mx-4 h-px bg-gray-200" />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Espacement en bas */}
        <View className="h-8" />
      </ScrollView>
    </Layout>
  );
}
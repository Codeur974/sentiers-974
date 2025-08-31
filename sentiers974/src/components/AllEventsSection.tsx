import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, FlatList } from "react-native";
import EventCard from "./EventCard";
import EventModal from "./EventModal";
import { SportEvent } from "../services/eventsApi";
import { getAllReunionEvents, getTodayReunionEvents, getUpcomingReunionEvents } from "../data/reunionEvents";
import { eventsDatabaseService } from "../services/eventsDatabase";
import { getSportEmoji } from "../utils/sportCategories";

type FilterType = 'all' | 'today';
type SportType = 'Trail' | 'Course' | 'Randonnée' | 'Vélo' | 'VTT' | 'Natation' | 'Surf' | 'SUP' | 'Kayak' | 'Escalade' | 'Marche';

export default function AllEventsSection() {
  const [allEvents, setAllEvents] = useState<SportEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all');
  const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sportPickerVisible, setSportPickerVisible] = useState(false);

  const loadAllEvents = async () => {
    try {
      setLoading(true);
      
      // Charger depuis la base de données automatisée
      const events = await eventsDatabaseService.getAllEvents();
      setAllEvents(events);
      
      // Appliquer le filtre par défaut
      applyFilter(events, activeFilter, selectedSport);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      // Fallback vers les données statiques
      const fallbackEvents = getAllReunionEvents();
      setAllEvents(fallbackEvents);
      applyFilter(fallbackEvents, activeFilter, selectedSport);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (events: SportEvent[], filter: FilterType, sport: SportType | 'all') => {
    let filtered: SportEvent[] = [];
    
    // D'abord appliquer le filtre temporel
    switch (filter) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        filtered = events.filter(event => event.date === today);
        break;
      case 'all':
        filtered = events;
        break;
    }
    
    // Puis appliquer le filtre par sport
    if (sport !== 'all') {
      filtered = filtered.filter(event => event.sport === sport);
    }
    
    setFilteredEvents(filtered);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    applyFilter(allEvents, filter, selectedSport);
  };

  const handleSportChange = (sport: SportType | 'all') => {
    setSelectedSport(sport);
    setSportPickerVisible(false);
    // Toujours désactiver "Aujourd'hui" quand on utilise le sélecteur de sport
    setActiveFilter('all');
    applyFilter(allEvents, 'all', sport);
  };

  const getSportLabel = (sport: SportType | 'all') => {
    if (sport === 'all') return '🏃 Tous les sports';
    return `${getSportEmoji(sport)} ${sport}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllEvents();
    setRefreshing(false);
  };

  const handleEventPress = (event: SportEvent) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedEvent(null);
  };

  useEffect(() => {
    loadAllEvents();
  }, []);

  const getFilterTitle = () => {
    let baseTitle = '';
    switch (activeFilter) {
      case 'today':
        baseTitle = "📅 Événements d'aujourd'hui";
        break;
      case 'all':
        baseTitle = "📊 Tous les événements sportifs";
        break;
    }
    
    if (selectedSport !== 'all') {
      return `${getSportEmoji(selectedSport)} ${baseTitle} - ${selectedSport}`;
    }
    
    return baseTitle;
  };


  const getEmptyStateMessage = () => {
    switch (activeFilter) {
      case 'today':
        return {
          emoji: "🌴",
          title: "Aucun événement aujourd'hui",
          subtitle: "Regardez les prochains événements"
        };
      case 'upcoming':
        return {
          emoji: "📅",
          title: "Pas d'événements à venir",
          subtitle: "Vérifiez tous les événements"
        };
      default:
        return {
          emoji: "🏃‍♀️",
          title: "Aucun événement trouvé",
          subtitle: "Essayez un autre filtre"
        };
    }
  };

  if (loading) {
    return (
      <View className="bg-white p-4 rounded-xl shadow-sm my-4">
        <Text className="text-lg font-bold text-gray-800 mb-3">
          📅 Événements sportifs
        </Text>
        <View className="items-center py-8">
          <Text className="text-gray-500">Chargement des événements...</Text>
        </View>
      </View>
    );
  }

  const emptyState = getEmptyStateMessage();

  return (
    <View className="bg-white p-4 rounded-xl shadow-sm my-4">
      {/* Header avec titre */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-gray-800">
          {getFilterTitle()}
        </Text>
        <View className="bg-blue-100 px-3 py-1 rounded-full">
          <Text className="text-blue-700 text-xs font-bold">
            🏝️ 974
          </Text>
        </View>
      </View>

      {/* Filtres */}
      <View className="mb-4">
        {/* Filtres en ligne */}
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity
            onPress={() => handleFilterChange('today')}
            className={`px-3 py-2 rounded-lg border ${
              activeFilter === 'today' 
                ? 'bg-blue-600 border-blue-600' 
                : 'bg-gray-100 border-gray-300'
            }`}
          >
            <Text className={`text-sm font-medium ${
              activeFilter === 'today' ? 'text-white' : 'text-gray-700'
            }`}>
              📅 Aujourd'hui
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setSportPickerVisible(true)}
            className="flex-1 bg-white px-3 py-2 rounded-lg border border-gray-300 flex-row justify-between items-center"
          >
            <Text className="text-gray-800 text-sm">
              {getSportLabel(selectedSport)}
            </Text>
            <Text className="text-gray-500 text-xs">▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistiques */}
      <View className="bg-gray-50 p-3 rounded-lg mb-3">
        <View className="flex-row flex-wrap justify-center items-center">
          <Text className="text-gray-700 text-xs mx-2 mb-1">
            💪 <Text className="font-semibold">{allEvents.length}</Text> événements
          </Text>
          <Text className="text-gray-700 text-xs mx-2 mb-1">
            🎯 <Text className="font-semibold">{filteredEvents.length}</Text> affiché{filteredEvents.length > 1 ? 's' : ''}
          </Text>
          <Text className="text-gray-700 text-xs mx-2 mb-1">
            🏃 <Text className="font-semibold">{new Set(allEvents.map(e => e.sport)).size}</Text> sports
          </Text>
        </View>
      </View>

      {/* Liste des événements */}
      {filteredEvents.length === 0 ? (
        <View className="items-center py-6">
          <Text className="text-6xl mb-2">{emptyState.emoji}</Text>
          <Text className="text-gray-500 text-center font-medium">
            {emptyState.title}
          </Text>
          <Text className="text-gray-400 text-sm text-center mt-1">
            {emptyState.subtitle}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView 
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {filteredEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                compact={true}
                onPress={() => handleEventPress(event)}
              />
            ))}
          </ScrollView>

          {/* Message informatif */}
          {filteredEvents.length > 0 && (
            <View className="bg-green-50 p-3 rounded-lg mt-3 border border-green-200">
              <Text className="text-green-700 text-sm text-center font-medium">
                ✨ Cliquez sur un événement pour voir tous les détails
              </Text>
            </View>
          )}
        </>
      )}

      {/* Modal détaillé des événements */}
      <EventModal
        visible={modalVisible}
        event={selectedEvent}
        onClose={handleCloseModal}
      />

      {/* Modal sélecteur de sport */}
      <Modal
        visible={sportPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSportPickerVisible(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setSportPickerVisible(false)}
        >
          <View className="bg-white rounded-t-3xl p-6 max-h-96">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                🏃 Choisir un sport
              </Text>
              <TouchableOpacity
                onPress={() => setSportPickerVisible(false)}
                className="bg-gray-100 p-2 rounded-full"
              >
                <Text className="text-gray-600 text-lg font-bold">✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={[
                { value: 'all', label: '🏃 Tous les sports' },
                ...[...new Set(allEvents.map(e => e.sport))].sort().map(sport => ({
                  value: sport,
                  label: `${getSportEmoji(sport)} ${sport}`
                }))
              ]}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSportChange(item.value as SportType | 'all')}
                  className={`p-4 rounded-xl mb-2 border-2 ${
                    selectedSport === item.value
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className={`font-medium text-base ${
                    selectedSport === item.value ? 'text-white' : 'text-gray-800'
                  }`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
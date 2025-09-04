import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';
import { usePointsOfInterest } from '../../hooks/usePointsOfInterest';
import { useActivity } from '../../hooks/useActivity';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PhotosSectionProps {
  isVisible: boolean;
  onInteraction?: () => void;
}

export interface PhotosSectionRef {
  closeAllSections: () => void;
}

interface DayPerformance {
  totalDistance: number;
  totalTime: number;
  totalCalories: number;
  avgSpeed: number;
  sessions: number;
  maxSpeed: number;
}

interface PhotoItem {
  id: string;
  uri: string;
  title: string;
  note?: string;
  sessionId?: string;
  createdAt: number;
  source: 'poi' | 'backend';
}

interface PhotoGroup {
  date: string;
  displayDate: string;
  photos: PhotoItem[];
  performance?: DayPerformance;
}

const PhotosSection = forwardRef<PhotosSectionRef, PhotosSectionProps>(({ isVisible, onInteraction }, ref) => {
  const { pois } = usePointsOfInterest();
  const { activities } = useActivity();
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<{uri: string, title: string, note?: string} | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Exposer la fonction pour fermer toutes les sections
  useImperativeHandle(ref, () => ({
    closeAllSections: () => setExpandedSections(new Set())
  }));

  // Charger les performances d'une journée spécifique
  const loadDayPerformance = async (dateString: string): Promise<DayPerformance | undefined> => {
    try {
      const statsKey = `daily_stats_${dateString}`;
      const savedStats = await AsyncStorage.getItem(statsKey);
      return savedStats ? JSON.parse(savedStats) : undefined;
    } catch (error) {
      console.error('❌ Erreur chargement stats jour:', error);
      return undefined;
    }
  };

  // Formater la durée en format lisible
  const formatDuration = (milliseconds: number) => {
    if (milliseconds === 0) return '0min';
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  };

  // Grouper les photos par jour et charger les performances
  useEffect(() => {
    const loadGroupsWithPerformance = async () => {
      // Combiner les photos des POI locaux et des activités backend
      const allPhotos: PhotoItem[] = [
        // Photos des POI locaux
        ...pois.filter(poi => poi.photoUri).map(poi => ({
          id: poi.id,
          uri: poi.photoUri!,
          title: poi.title,
          note: poi.note,
          sessionId: poi.sessionId,
          createdAt: poi.createdAt,
          source: 'poi' as const
        })),
        // Photos des activités backend
        ...activities.flatMap(activity => 
          activity.photos.map((photo, index) => ({
            id: `${activity._id}_${index}`,
            uri: photo.url,
            title: photo.caption || activity.title,
            note: activity.notes,
            sessionId: activity._id,
            createdAt: new Date(activity.date).getTime(),
            source: 'backend' as const
          }))
        )
      ];
      
      const groupedByDate = allPhotos.reduce((groups, photo) => {
        const date = new Date(photo.createdAt).toDateString();
        const displayDate = new Date(photo.createdAt).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric', 
          month: 'long',
          day: 'numeric'
        });
        
        if (!groups[date]) {
          groups[date] = {
            date,
            displayDate,
            photos: []
          };
        }
        
        groups[date].photos.push(photo);
        
        return groups;
      }, {} as Record<string, PhotoGroup>);
      
      // Convertir en array et charger les performances pour chaque jour
      const groupsArray = Object.values(groupedByDate);
      const groupsWithPerformance = await Promise.all(
        groupsArray.map(async (group) => {
          const performance = await loadDayPerformance(group.date);
          return { ...group, performance };
        })
      );
      
      // Trier par date (plus récent en premier)
      const sortedGroups = groupsWithPerformance.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setPhotoGroups(sortedGroups);
      
      // Étendre automatiquement la section du jour actuel
      const today = new Date().toDateString();
      setExpandedSections(new Set([today]));
    };

    loadGroupsWithPerformance();
  }, [pois, activities]);

  const toggleSection = (date: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  if (!isVisible || photoGroups.length === 0) {
    return (
      <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
        <Text className="text-center text-blue-600 font-bold text-lg mb-2">📷 Mes Photos</Text>
        <Text className="text-center text-gray-500 text-sm">
          {photoGroups.length === 0 ? 
            'Aucune photo pour le moment.\nCréez des POI avec photos ou ajoutez des activités !' :
            'Section photos masquée'
          }
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
      <Text className="text-blue-800 font-bold text-lg mb-3 text-center">
        📷 Mes Photos ({photoGroups.reduce((total, group) => total + group.photos.length, 0)})
      </Text>
      
      <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
        {photoGroups.map((group) => {
          const isExpanded = expandedSections.has(group.date);
          
          return (
            <View key={group.date} className="mb-3">
              {/* Header de section cliquable */}
              <TouchableOpacity
                onPress={() => {
                  toggleSection(group.date);
                  onInteraction?.();
                }}
                className="bg-blue-100 p-3 rounded-lg border border-blue-300 flex-row justify-between items-center"
              >
                <View className="flex-1">
                  <Text className="font-bold text-blue-800">
                    📅 {group.displayDate}
                  </Text>
                  <View className="flex-row items-center space-x-3">
                    <Text className="text-sm text-blue-600">
                      📷 {group.photos.length} photo{group.photos.length > 1 ? 's' : ''}
                    </Text>
                    {group.performance && group.performance.totalDistance > 0 && (
                      <Text className="text-sm text-green-600 font-bold">
                        🏃 {group.performance.totalDistance.toFixed(1)}km
                      </Text>
                    )}
                  </View>
                </View>
                <Text className="text-blue-600 text-xl">
                  {isExpanded ? '▼' : '▶️'}
                </Text>
              </TouchableOpacity>
              
              {/* Photos de la section */}
              {isExpanded && (
                <View className="mt-2 bg-white p-2 rounded-lg border border-blue-200">
                  {/* Performances du jour */}
                  {group.performance && group.performance.totalDistance > 0 && (
                    <View className="mb-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <Text className="font-bold text-gray-800 mb-2">🏃‍♀️ Performances du jour</Text>
                      
                      {/* Résumé principal */}
                      <View className="flex-row justify-between mb-2">
                        <View className="items-center flex-1">
                          <Text className="text-lg font-bold text-blue-700">
                            {group.performance.totalDistance.toFixed(1)}
                          </Text>
                          <Text className="text-xs text-gray-600">km</Text>
                        </View>
                        <View className="items-center flex-1">
                          <Text className="text-lg font-bold text-green-600">
                            {formatDuration(group.performance.totalTime)}
                          </Text>
                          <Text className="text-xs text-gray-600">temps</Text>
                        </View>
                        <View className="items-center flex-1">
                          <Text className="text-lg font-bold text-orange-600">
                            {group.performance.totalCalories}
                          </Text>
                          <Text className="text-xs text-gray-600">cal</Text>
                        </View>
                      </View>
                      
                      {/* Détails supplémentaires */}
                      <View className="flex-row justify-between pt-2 border-t border-green-200">
                        <Text className="text-xs text-gray-600">
                          ⚡ {group.performance.avgSpeed.toFixed(1)} km/h moy
                        </Text>
                        <Text className="text-xs text-gray-600">
                          🚀 {group.performance.maxSpeed.toFixed(1)} km/h max
                        </Text>
                        <Text className="text-xs text-gray-600">
                          🎯 {group.performance.sessions} session{group.performance.sessions > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {group.photos.map((photo) => (
                    <TouchableOpacity
                      key={photo.id}
                      onPress={() => {
                        setSelectedPhoto({
                          uri: photo.uri,
                          title: photo.title,
                          note: photo.note
                        });
                        onInteraction?.();
                      }}
                      className="flex-row items-center p-2 mb-2 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      {/* Miniature de la photo */}
                      <Image
                        source={{ uri: photo.uri }}
                        className="w-16 h-16 rounded-lg border border-gray-300"
                        resizeMode="cover"
                      />
                      
                      {/* Infos de la photo */}
                      <View className="flex-1 ml-3">
                        <Text className="font-bold text-gray-800 text-base" numberOfLines={1}>
                          📍 {photo.title}
                        </Text>
                        {photo.note && (
                          <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
                            💭 {photo.note}
                          </Text>
                        )}
                        <Text className="text-xs text-gray-500 mt-1">
                          🕒 {new Date(photo.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                        {/* Indicateur de source */}
                        <Text className="text-xs text-blue-500">
                          {photo.source === 'backend' ? '☁️ Serveur' : '📱 Local'}
                        </Text>
                      </View>
                      
                      {/* Indicateur de clic */}
                      <Text className="text-blue-500 text-xl mr-2">👁️</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      
      {/* Modal photo plein écran avec infos */}
      <Modal
        visible={selectedPhoto !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center">
          <TouchableOpacity
            onPress={() => setSelectedPhoto(null)}
            className="absolute top-12 right-4 z-10 bg-black/50 p-3 rounded-full"
          >
            <Text className="text-white text-xl">✕</Text>
          </TouchableOpacity>
          
          {selectedPhoto && (
            <View className="flex-1 justify-center items-center w-full px-4">
              <Image
                source={{ uri: selectedPhoto.uri }}
                className="w-full h-2/3"
                resizeMode="contain"
                onLoad={() => console.log('✅ Photo plein écran chargée')}
                onError={(e) => console.log('❌ Erreur photo:', e.nativeEvent.error)}
              />
              
              {/* Infos en bas de la photo */}
              <View className="mt-4 bg-black/70 p-4 rounded-lg max-w-full">
                <Text className="text-white font-bold text-lg text-center mb-2">
                  📍 {selectedPhoto.title}
                </Text>
                {selectedPhoto.note && (
                  <Text className="text-white text-base text-center">
                    💭 {selectedPhoto.note}
                  </Text>
                )}
              </View>
              
              <Text className="text-white text-center mt-2 text-sm opacity-70">
                Appuyez n'importe où pour fermer
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
});

PhotosSection.displayName = 'PhotosSection';

export default PhotosSection;
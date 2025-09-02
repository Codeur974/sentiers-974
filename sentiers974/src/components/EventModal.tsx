import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Linking,
  Dimensions 
} from 'react-native';
import { SportEvent } from '../types/events';

interface EventModalProps {
  visible: boolean;
  event: SportEvent | null;
  onClose: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

export default function EventModal({ visible, event, onClose }: EventModalProps) {
  if (!event) return null;

  const handleWebsitePress = () => {
    if (event.website) {
      Linking.openURL(event.website);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'facile': return 'bg-green-200 text-green-800 border border-green-300';
      case 'moyen': return 'bg-yellow-200 text-yellow-800 border border-yellow-300';
      case 'difficile': return 'bg-red-200 text-red-800 border border-red-300';
      default: return 'bg-gray-200 text-gray-800 border border-gray-300';
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

  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const getDaysUntilEvent = () => {
    const today = new Date();
    const eventDate = new Date(event.date);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Événement passé";
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Demain";
    return `Dans ${diffDays} jours`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header avec bouton fermer */}
        <View className="bg-white p-4 border-b border-gray-200 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800" numberOfLines={1}>
              {event.title}
            </Text>
            <Text className="text-sm text-blue-600 font-medium">
              {event.sport} • {getDaysUntilEvent()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="bg-gray-100 w-10 h-10 rounded-full items-center justify-center ml-3"
          >
            <Text className="text-gray-600 text-lg font-bold">×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Card principale de l'événement */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            {/* Header avec emoji et infos principales */}
            <View className="bg-blue-600 p-6">
              <View className="items-center">
                <Text className="text-6xl mb-3">{event.emoji}</Text>
                <Text className="text-white text-2xl font-bold text-center mb-2">
                  {event.title}
                </Text>
                <View className={`px-4 py-2 rounded-full ${getDifficultyColor(event.difficulty)}`}>
                  <Text className="font-bold text-sm">
                    {getDifficultyIcon(event.difficulty)} {event.difficulty.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Informations essentielles */}
            <View className="p-6">
              {/* Date et heure */}
              <View className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-200">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-blue-900 font-bold text-lg">
                      📅 {formatDate(event.date)}
                    </Text>
                    <Text className="text-blue-700 text-sm mt-1">
                      🕐 Début à {formatTime(event.time)}
                    </Text>
                  </View>
                  <View className="bg-blue-600 px-3 py-2 rounded-lg">
                    <Text className="text-white text-sm font-bold">
                      {getDaysUntilEvent()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Lieu */}
              <View className="bg-green-50 p-4 rounded-xl mb-4 border border-green-200">
                <Text className="text-green-900 font-bold text-base mb-1">
                  📍 Lieu
                </Text>
                <Text className="text-green-800">
                  {event.location}
                </Text>
              </View>

              {/* Description */}
              {event.description && (
                <View className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200">
                  <Text className="text-gray-900 font-bold text-base mb-2">
                    📋 Description
                  </Text>
                  <Text className="text-gray-800 leading-5">
                    {event.description}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Détails techniques */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              🏃‍♂️ Détails techniques
            </Text>
            
            <View className="space-y-3">
              {event.distance && (
                <View className="flex-row items-center">
                  <View className="bg-orange-200 w-10 h-10 rounded-full items-center justify-center mr-3 border border-orange-300">
                    <Text className="text-orange-800">📏</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-700 text-sm">Distance</Text>
                    <Text className="text-gray-900 font-semibold">{event.distance}</Text>
                  </View>
                </View>
              )}

              {event.elevation && event.elevation !== '0m' && event.elevation !== 'Plat' && (
                <View className="flex-row items-center">
                  <View className="bg-purple-200 w-10 h-10 rounded-full items-center justify-center mr-3 border border-purple-300">
                    <Text className="text-purple-800">⛰️</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-700 text-sm">Dénivelé</Text>
                    <Text className="text-gray-900 font-semibold">{event.elevation}</Text>
                  </View>
                </View>
              )}

              <View className="flex-row items-center">
                <View className="bg-blue-200 w-10 h-10 rounded-full items-center justify-center mr-3 border border-blue-300">
                  <Text className="text-blue-800">🏃‍♀️</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 text-sm">Sport</Text>
                  <Text className="text-gray-900 font-semibold">{event.sport}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Informations pratiques */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              📋 Informations pratiques
            </Text>

            <View className="space-y-4">
              {/* Organisateur */}
              <View className="flex-row items-start">
                <View className="bg-indigo-200 w-10 h-10 rounded-full items-center justify-center mr-3 mt-1 border border-indigo-300">
                  <Text className="text-indigo-800">👥</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 text-sm">Organisateur</Text>
                  <Text className="text-gray-900 font-semibold">{event.organizer}</Text>
                </View>
              </View>

              {/* Inscription */}
              <View className="flex-row items-start">
                <View className="bg-green-200 w-10 h-10 rounded-full items-center justify-center mr-3 mt-1 border border-green-300">
                  <Text className="text-green-800">📝</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 text-sm">Inscription</Text>
                  <Text className="text-gray-900 font-semibold">{event.registration}</Text>
                </View>
              </View>

              {/* Prix */}
              <View className="flex-row items-start">
                <View className="bg-yellow-200 w-10 h-10 rounded-full items-center justify-center mr-3 mt-1 border border-yellow-300">
                  <Text className="text-yellow-800">💰</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 text-sm">Tarif</Text>
                  <Text className="text-gray-900 font-semibold text-lg">{event.price}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              🔗 Actions
            </Text>

            {event.website && (
              <TouchableOpacity
                onPress={handleWebsitePress}
                className="bg-blue-600 p-4 rounded-xl mb-3 flex-row items-center justify-center"
              >
                <Text className="text-white font-bold text-lg mr-2">🌐</Text>
                <Text className="text-white font-bold text-base">
                  Site web officiel
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-200 p-4 rounded-xl flex-row items-center justify-center"
            >
              <Text className="text-gray-700 font-bold text-base">
                ← Retour aux événements
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
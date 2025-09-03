import React from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import ActivityCard from './ActivityCard';
import { useActivity } from '../hooks/useActivity';
import { Activity } from '../types/api';

interface BackendActivitiesSectionProps {
  compact?: boolean;
  maxItems?: number;
}

export default function BackendActivitiesSection({ compact = false, maxItems }: BackendActivitiesSectionProps) {
  const { activities, loading, error, loadActivities } = useActivity();

  const displayedActivities = maxItems ? activities.slice(0, maxItems) : activities;

  const handleActivityPress = (activity: Activity) => {
    console.log('Activité sélectionnée:', activity.title);
    // TODO: Navigation vers les détails de l'activité
  };

  const renderContent = () => {
    if (loading && activities.length === 0) {
      return (
        <View className="items-center justify-center py-8">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-500 mt-2">Chargement des activités...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View className="items-center justify-center py-8">
          <Text className="text-red-500 text-center">
            ❌ {error}
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Vérifiez que votre backend est démarré
          </Text>
        </View>
      );
    }

    if (activities.length === 0) {
      return (
        <View className="items-center justify-center py-8">
          <Text className="text-gray-500 text-center">
            🏃‍♂️ Aucune activité trouvée
          </Text>
          <Text className="text-gray-400 text-center mt-1">
            Vos activités sauvegardées apparaîtront ici
          </Text>
        </View>
      );
    }

    return (
      <View>
        {displayedActivities.map((activity) => (
          <ActivityCard
            key={activity._id}
            activity={activity}
            compact={compact}
            onPress={() => handleActivityPress(activity)}
          />
        ))}
        
        {maxItems && activities.length > maxItems && (
          <View className="items-center mt-2">
            <Text className="text-blue-600 text-sm">
              +{activities.length - maxItems} autres activités
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (compact) {
    return (
      <View>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-800">
            📊 Mes activités ({activities.length})
          </Text>
        </View>
        {renderContent()}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-800">
          📊 Activités Backend ({activities.length})
        </Text>
      </View>
      
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadActivities}
            colors={['#3B82F6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
        
        {/* Espace en bas */}
        <View className="h-6" />
      </ScrollView>
    </View>
  );
}
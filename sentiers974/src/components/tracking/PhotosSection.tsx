import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, Alert, TextInput } from 'react-native';
import { usePointsOfInterest } from '../../hooks/usePointsOfInterest';
import { useActivity } from '../../hooks/useActivity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/api';
import { PhotoManager } from '../../utils/photoUtils';

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
  totalSteps: number;
  sessionsList: SessionPerformance[];
}

interface SessionPerformance {
  distance: number;
  duration: number;
  calories: number;
  avgSpeed: number;
  maxSpeed: number;
  steps: number;
  sport: string;
  sessionId: string;
  timestamp: number;
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
  sessionGroups?: SessionGroup[];
}

interface SessionGroup {
  sessionId: string;
  photos: PhotoItem[];
  performance?: SessionPerformance;
}

const PhotosSection = forwardRef<PhotosSectionRef, PhotosSectionProps>(({ isVisible, onInteraction }, ref) => {
  const { pois, deletePOI, createPOI } = usePointsOfInterest();
  const { activities, refreshActivities } = useActivity();
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<{uri: string, title: string, note?: string} | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoNote, setPhotoNote] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [creatingPhoto, setCreatingPhoto] = useState(false);

  // Exposer la fonction pour fermer toutes les sections
  useImperativeHandle(ref, () => ({
    closeAllSections: () => setExpandedSections(new Set())
  }));

  // Gérer l'ajout d'une photo oubliée
  const handleAddForgottenPhoto = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowAddPhotoModal(true);
    setPhotoTitle('');
    setPhotoNote('');
    setSelectedPhotoUri(null);
  };

  // Prendre une photo pour la photo oubliée
  const handleTakePhoto = async () => {
    try {
      const photoUri = await PhotoManager.takePhoto();
      if (photoUri) {
        setSelectedPhotoUri(photoUri);
        Alert.alert('Succès', 'Photo prise !');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de prendre la photo');
      console.error('Erreur photo:', error);
    }
  };

  // Choisir une photo de la galerie
  const handlePickPhoto = async () => {
    try {
      const photoUri = await PhotoManager.pickPhoto();
      if (photoUri) {
        setSelectedPhotoUri(photoUri);
        Alert.alert('Succès', 'Photo sélectionnée !');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
      console.error('Erreur photo:', error);
    }
  };

  // Créer le POI avec photo oubliée
  const handleCreateForgottenPhoto = async () => {
    if (!photoTitle.trim()) {
      Alert.alert('Erreur', 'Titre obligatoire');
      return;
    }

    if (!selectedPhotoUri) {
      Alert.alert('Erreur', 'Photo obligatoire pour ajouter un souvenir');
      return;
    }

    if (!selectedSessionId) {
      Alert.alert('Erreur', 'Session non sélectionnée');
      return;
    }

    setCreatingPhoto(true);
    
    try {
      // Utiliser une position par défaut car c'est une photo oubliée
      const defaultCoords = { latitude: -21.1151, longitude: 55.5364, altitude: 0 };
      
      const poi = await createPOI(
        defaultCoords,
        0, // Distance à 0 car photo ajoutée après coup
        0, // Temps à 0 car photo ajoutée après coup
        {
          title: photoTitle.trim(),
          note: photoNote.trim() || undefined,
          photo: selectedPhotoUri || undefined
        },
        selectedSessionId
      );

      if (poi) {
        setShowAddPhotoModal(false);
        setPhotoTitle('');
        setPhotoNote('');
        setSelectedPhotoUri(null);
        setSelectedSessionId(null);
        Alert.alert('Succès', `Photo "${poi.title}" ajoutée à la session !`);
        
        // Forcer le rechargement
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 100);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ajouter la photo');
      }
    } catch (error) {
      console.error('❌ Erreur ajout photo oubliée:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'ajout de la photo');
    } finally {
      setCreatingPhoto(false);
    }
  };

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

  // Uniformiser le format de date (timezone locale)
  const getLocalDateString = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Confirmer et supprimer une photo individuelle
  const confirmDeletePhoto = (photo: PhotoItem) => {
    console.log('🔍 Confirmation suppression photo:', {
      title: photo.title,
      id: photo.id,
      source: photo.source,
      sessionId: photo.sessionId,
      createdAt: photo.createdAt
    });
    
    Alert.alert(
      '🗑️ Supprimer la photo',
      `Êtes-vous sûr de vouloir supprimer la photo "${photo.title}" ?\n\nCette action est irréversible.`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => console.log('❌ Suppression photo annulée')
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            console.log('✅ Confirmation suppression photo acceptée');
            deletePhoto(photo);
          },
        },
      ]
    );
  };

  // Supprimer une photo individuelle
  const deletePhoto = async (photo: PhotoItem) => {
    try {
      console.log('🗑️ Début suppression photo:', photo.title, 'Source:', photo.source, 'ID:', photo.id);
      
      if (photo.source === 'poi') {
        // Suppression POI local uniquement
        console.log('🗑️ Suppression POI local:', photo.id);
        await deletePOI(photo.id);
        console.log('✅ POI local supprimé');
        
      } else if (photo.source === 'backend') {
        // Pour les photos backend, on ne peut pas supprimer une photo individuelle
        // car elles sont liées à l'activité. On pourrait supprimer toute l'activité
        // mais c'est trop destructif pour une seule photo.
        console.log('ℹ️ Photo backend - suppression non supportée');
        Alert.alert(
          '⚠️ Photo serveur', 
          'Les photos du serveur ne peuvent pas être supprimées individuellement.\n\nUtilisez "Supprimer Session" pour supprimer toute l\'activité.'
        );
        return;
      }
      
      console.log('✅ Photo supprimée avec succès:', photo.title);
      
      // Forcer le rechargement de l'interface
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 100);
      
    } catch (error) {
      console.error('❌ Erreur suppression photo:', error);
      Alert.alert('❌ Erreur', `Impossible de supprimer la photo "${photo.title}".\n\nErreur: ${error.message || error}\n\nVérifiez votre connexion.`);
    }
  };

  // Confirmer et supprimer une session
  const confirmDeleteSession = (sessionId: string, sessionGroup: SessionGroup) => {
    const sportName = sessionGroup.performance?.sport || 'Session';
    const photoCount = sessionGroup.photos.length;
    
    Alert.alert(
      '🗑️ Supprimer la session',
      `Êtes-vous sûr de vouloir supprimer la session "${sportName}" ?\n\n• ${photoCount} photo(s)\n• Toutes les performances\n\nCette action est irréversible.`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteSession(sessionId),
        },
      ]
    );
  };

  // Supprimer toutes les photos d'une session
  const deleteSession = async (sessionId: string) => {
    try {
      // Vérifier si c'est une session locale ou backend
      const sessionPois = pois.filter(poi => poi.sessionId === sessionId);
      const backendActivity = activities.find(activity => activity._id === sessionId);
      
      if (sessionPois.length > 0) {
        // Suppression des POI locaux
        for (const poi of sessionPois) {
          await deletePOI(poi.id);
        }
        
        // Supprimer les performances locales de la session
        const sessionPhotos = pois.find(poi => poi.sessionId === sessionId);
        if (sessionPhotos) {
          const date = getLocalDateString(sessionPhotos.createdAt);
          await removeDaySessionPerformance(date, sessionId);
        }
      }
      
      if (backendActivity) {
        // Suppression de l'activité backend
        await apiService.deleteActivity(sessionId);
        console.log('🗑️ Activité backend supprimée:', sessionId);
        // Actualiser les activités
        await refreshActivities();
      }
      
      console.log('🗑️ Session supprimée:', sessionId);
    } catch (error) {
      console.error('❌ Erreur suppression session:', error);
      Alert.alert('❌ Erreur', 'Impossible de supprimer la session. Vérifiez votre connexion.');
    }
  };

  // Confirmer et supprimer un jour complet
  const confirmDeleteDay = (date: string, group: PhotoGroup) => {
    const photoCount = group.photos.length;
    const sessionCount = group.sessionGroups?.length || 0;
    const dayName = group.displayDate;
    
    Alert.alert(
      '🗑️ Supprimer le jour',
      `Êtes-vous sûr de vouloir supprimer TOUT le jour "${dayName}" ?\n\n• ${sessionCount} session(s)\n• ${photoCount} photo(s)\n• Toutes les performances\n\nCette action est DÉFINITIVE et irréversible !`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'SUPPRIMER TOUT',
          style: 'destructive',
          onPress: () => deleteDay(date),
        },
      ]
    );
  };

  // Supprimer tous les POI et performances d'un jour
  const deleteDay = async (date: string) => {
    try {
      console.log('🗑️ === DÉBUT SUPPRESSION JOUR ===');
      console.log('📅 Date à supprimer:', date);
      console.log('📊 Total POI disponibles:', pois.length);
      console.log('☁️ Total activités disponibles:', activities.length);
      
      // Supprimer les POI locaux du jour
      const dayPhotos = pois.filter(poi => {
        const poiDate = getLocalDateString(poi.createdAt);
        const match = poiDate === date;
        console.log(`🔍 POI "${poi.title}": ${poiDate} ${match ? '✅' : '❌'} ${date}`);
        return match;
      });
      
      console.log('📷 POI locaux trouvés à supprimer:', dayPhotos.length);
      
      if (dayPhotos.length > 0) {
        console.log('🗑️ Suppression des POI locaux...');
        for (let i = 0; i < dayPhotos.length; i++) {
          const poi = dayPhotos[i];
          console.log(`🗑️ [${i+1}/${dayPhotos.length}] Suppression POI: ${poi.id} - "${poi.title}"`);
          try {
            await deletePOI(poi.id);
            console.log(`✅ POI supprimé: ${poi.id}`);
          } catch (poiError) {
            console.error(`❌ Erreur suppression POI ${poi.id}:`, poiError);
            throw poiError;
          }
        }
      } else {
        console.log('ℹ️ Aucun POI local à supprimer pour ce jour');
      }
      
      // Supprimer les activités backend du jour
      const dayActivities = activities.filter(activity => {
        const activityDate = getLocalDateString(new Date(activity.date).getTime());
        const match = activityDate === date;
        console.log(`🔍 Activité "${activity.title}": ${activityDate} ${match ? '✅' : '❌'} ${date}`);
        return match;
      });
      
      console.log('☁️ Activités backend trouvées à supprimer:', dayActivities.length);
      
      if (dayActivities.length > 0) {
        console.log('🗑️ Suppression des activités backend...');
        for (let i = 0; i < dayActivities.length; i++) {
          const activity = dayActivities[i];
          console.log(`🗑️ [${i+1}/${dayActivities.length}] Suppression activité: ${activity._id} - "${activity.title}"`);
          try {
            const result = await apiService.deleteActivity(activity._id);
            console.log(`✅ Activité supprimée: ${activity._id}`, result);
          } catch (activityError) {
            console.error(`❌ Erreur suppression activité ${activity._id}:`, activityError);
            throw activityError;
          }
        }
        
        console.log('🔄 Actualisation des activités après suppression backend...');
        try {
          await refreshActivities();
          console.log('✅ Activités actualisées');
        } catch (refreshError) {
          console.error('❌ Erreur actualisation activités:', refreshError);
          throw refreshError;
        }
      } else {
        console.log('ℹ️ Aucune activité backend à supprimer pour ce jour');
      }
      
      // Supprimer les performances locales du jour
      console.log('📊 Suppression performances locales...');
      try {
        await removeDayPerformance(date);
        console.log('✅ Performances supprimées');
      } catch (perfError) {
        console.error('❌ Erreur suppression performances:', perfError);
        throw perfError;
      }
      
      console.log('✅ === JOUR SUPPRIMÉ AVEC SUCCÈS ===');
      console.log('📅 Date:', date);
      console.log('📷 POI supprimés:', dayPhotos.length);
      console.log('☁️ Activités supprimées:', dayActivities.length);
      
      // Forcer le rechargement de l'interface avec un délai
      console.log('🔄 Rechargement de l\'interface...');
      setTimeout(() => {
        setRefreshTrigger(prev => {
          console.log('🔄 Trigger refresh:', prev + 1);
          return prev + 1;
        });
      }, 200);
      
    } catch (error) {
      console.error('❌ === ERREUR SUPPRESSION JOUR ===');
      console.error('📅 Date:', date);
      console.error('🔥 Erreur:', error);
      console.error('📋 Stack:', error.stack);
      Alert.alert('❌ Erreur Suppression', `Impossible de supprimer le jour "${date}".\n\nErreur: ${error.message || error.toString()}\n\nVérifiez la console pour plus de détails.`);
    }
  };

  // Supprimer les performances d'un jour complet
  const removeDayPerformance = async (dateString: string) => {
    try {
      const statsKey = `daily_stats_${dateString}`;
      console.log('🗑️ Suppression clé performances:', statsKey);
      
      // Vérifier si la clé existe avant suppression
      const existingStats = await AsyncStorage.getItem(statsKey);
      if (existingStats) {
        console.log('📊 Performances trouvées, suppression...');
        await AsyncStorage.removeItem(statsKey);
        console.log('✅ Performances du jour supprimées:', dateString);
      } else {
        console.log('ℹ️ Aucune performance trouvée pour:', dateString);
      }
    } catch (error) {
      console.error('❌ Erreur suppression performances jour:', error);
      throw error; // Re-lancer l'erreur pour que deleteDay la capture
    }
  };

  // Supprimer une session spécifique des performances du jour
  const removeDaySessionPerformance = async (dateString: string, sessionId: string) => {
    try {
      const statsKey = `daily_stats_${dateString}`;
      const savedStats = await AsyncStorage.getItem(statsKey);
      
      if (savedStats) {
        const dayPerformance: DayPerformance = JSON.parse(savedStats);
        
        // Trouver et supprimer la session
        const sessionToRemove = dayPerformance.sessionsList?.find(s => s.sessionId === sessionId);
        if (sessionToRemove) {
          // Mettre à jour les totaux
          dayPerformance.totalDistance -= sessionToRemove.distance;
          dayPerformance.totalTime -= sessionToRemove.duration;
          dayPerformance.totalCalories -= sessionToRemove.calories;
          dayPerformance.totalSteps -= sessionToRemove.steps;
          dayPerformance.sessions -= 1;
          
          // Supprimer la session de la liste
          dayPerformance.sessionsList = dayPerformance.sessionsList?.filter(s => s.sessionId !== sessionId) || [];
          
          // Recalculer vitesse moyenne si il reste des sessions
          if (dayPerformance.sessions > 0) {
            dayPerformance.avgSpeed = (dayPerformance.totalTime > 0) ? 
              ((dayPerformance.totalDistance / (dayPerformance.totalTime / 3600000)) || 0) : 0;
            // Recalculer vitesse max
            dayPerformance.maxSpeed = Math.max(...(dayPerformance.sessionsList?.map(s => s.maxSpeed) || [0]));
          } else {
            // Plus de sessions, supprimer complètement
            await AsyncStorage.removeItem(statsKey);
            return;
          }
          
          await AsyncStorage.setItem(statsKey, JSON.stringify(dayPerformance));
          console.log('📊 Session supprimée des performances du jour:', sessionId);
        }
      }
    } catch (error) {
      console.error('❌ Erreur suppression session des performances:', error);
    }
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
        const date = getLocalDateString(photo.createdAt); // Utilise le même format que la suppression
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
          
          // Créer des groupes par session pour ce jour
          const sessionGroups: Record<string, SessionGroup> = {};
          
          group.photos.forEach(photo => {
            if (photo.sessionId) {
              if (!sessionGroups[photo.sessionId]) {
                const sessionPerformance = performance?.sessionsList?.find(
                  session => session.sessionId === photo.sessionId
                );
                sessionGroups[photo.sessionId] = {
                  sessionId: photo.sessionId,
                  photos: [],
                  performance: sessionPerformance
                };
              }
              sessionGroups[photo.sessionId].photos.push(photo);
            }
          });
          
          return { 
            ...group, 
            performance,
            sessionGroups: Object.values(sessionGroups)
          };
        })
      );
      
      // Trier par date (plus récent en premier)
      const sortedGroups = groupsWithPerformance.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setPhotoGroups(sortedGroups);
      
      // Toutes les sections fermées par défaut
      setExpandedSections(new Set());
    };

    loadGroupsWithPerformance();
  }, [pois, activities, refreshTrigger]);

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
        <Text className="text-center text-blue-600 font-bold text-lg mb-2">🗂️ Mon Historique</Text>
        <Text className="text-center text-gray-500 text-sm">
          {photoGroups.length === 0 ? 
            'Aucune activité pour le moment.\nCommencez un entraînement pour créer votre historique !' :
            'Historique masqué'
          }
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
      <Text className="text-blue-800 font-bold text-lg mb-3 text-center">
        🗂️ Mon Historique
      </Text>
      
      <View className="max-h-80">
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
                
                <View className="flex-row items-center space-x-6">
                  {/* Bouton supprimer jour */}
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      // group.date est maintenant déjà au bon format YYYY-MM-DD
                      console.log('🗑️ Date à supprimer:', group.date);
                      confirmDeleteDay(group.date, group);
                    }}
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
              
              {/* Photos de la section avec scroll fixe */}
              {isExpanded && (
                <View className="mt-2 bg-white rounded-lg border border-blue-200">
                  <ScrollView 
                    className="max-h-80 p-2" 
                    showsVerticalScrollIndicator={true} 
                    nestedScrollEnabled={true}
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* Sessions avec performances et photos */}
                    {group.sessionGroups && group.sessionGroups.length > 0 ? (
                      group.sessionGroups.map((sessionGroup) => (
                      <View key={sessionGroup.sessionId} className="mb-4">
                        {/* Performance de la session */}
                        {sessionGroup.performance && (
                          <View className="mb-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                            <View className="flex-row justify-between items-center mb-2">
                              <Text className="font-bold text-gray-800">
                                📊 Session {sessionGroup.performance.sport}
                              </Text>
                              <View className="flex-row space-x-2">
                                <TouchableOpacity
                                  onPress={() => handleAddForgottenPhoto(sessionGroup.sessionId)}
                                  className="bg-blue-100 px-2 py-1 rounded-full"
                                >
                                  <Text className="text-blue-600 text-xs">📷 + Photo</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => confirmDeleteSession(sessionGroup.sessionId, sessionGroup)}
                                  className="bg-red-100 px-2 py-1 rounded-full"
                                >
                                  <Text className="text-red-600 text-xs">🗑️ Session</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                            
                            {/* Stats principales */}
                            <View className="flex-row justify-between mb-2">
                              <View className="items-center flex-1">
                                <Text className="text-lg font-bold text-blue-700">
                                  {sessionGroup.performance.distance.toFixed(1)}
                                </Text>
                                <Text className="text-xs text-gray-600">km</Text>
                              </View>
                              <View className="items-center flex-1">
                                <Text className="text-lg font-bold text-green-600">
                                  {formatDuration(sessionGroup.performance.duration)}
                                </Text>
                                <Text className="text-xs text-gray-600">temps</Text>
                              </View>
                              <View className="items-center flex-1">
                                <Text className="text-lg font-bold text-orange-600">
                                  {sessionGroup.performance.calories}
                                </Text>
                                <Text className="text-xs text-gray-600">cal</Text>
                              </View>
                            </View>
                            
                            {/* Détails session */}
                            <View className="flex-row justify-between pt-2 border-t border-green-200">
                              <Text className="text-xs text-gray-600">
                                ⚡ {sessionGroup.performance.avgSpeed.toFixed(1)} km/h moy
                              </Text>
                              <Text className="text-xs text-gray-600">
                                🚀 {sessionGroup.performance.maxSpeed.toFixed(1)} km/h max
                              </Text>
                              <Text className="text-xs text-gray-600">
                                🚶 {sessionGroup.performance.steps.toLocaleString()} pas
                              </Text>
                            </View>
                          </View>
                        )}
                        
                        {/* Photos de cette session */}
                        {sessionGroup.photos.map((photo) => (
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
                                📸 {photo.title}
                              </Text>
                              {photo.note && (
                                <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
                                  💭 {photo.note}
                                </Text>
                              )}
                              <Text className="text-xs text-gray-500 mt-1">
                                {new Date(photo.createdAt).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </Text>
                            </View>
                            
                            {/* Actions */}
                            <View className="flex-col items-center space-y-1">
                              {/* Badge source */}
                              <View className={`px-2 py-1 rounded-full ${photo.source === 'poi' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                <Text className={`text-xs font-medium ${photo.source === 'poi' ? 'text-blue-600' : 'text-green-600'}`}>
                                  {photo.source === 'poi' ? '👁️' : '☁️'}
                                </Text>
                              </View>
                              {/* Bouton supprimer photo - différent selon la source */}
                              {photo.source === 'poi' ? (
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    confirmDeletePhoto(photo);
                                  }}
                                  className="bg-red-100 p-1 rounded-full"
                                >
                                  <Text className="text-red-600 text-xs">🗑️</Text>
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    Alert.alert(
                                      'ℹ️ Photo serveur',
                                      'Cette photo provient du serveur.\n\nUtilisez "Supprimer Session" pour supprimer toute l\'activité.',
                                      [{ text: 'OK' }]
                                    );
                                  }}
                                  className="bg-gray-100 p-1 rounded-full opacity-50"
                                >
                                  <Text className="text-gray-500 text-xs">🔒</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))
                  ) : (
                    // Affichage classique si pas de sessions groupées
                    group.photos.map((photo) => (
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
                          📸 {photo.title}
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
                    ))
                  )}
                  </ScrollView>
                </View>
              )}
            </View>
          );
        })}
      </View>
      
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
                  📸 {selectedPhoto.title}
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

      {/* Modal d'ajout de photo oubliée */}
      <Modal
        visible={showAddPhotoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddPhotoModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-center mb-4">
              📷 Ajouter photo oubliée
            </Text>
            
            <Text className="text-sm text-gray-600 mb-2">Titre *</Text>
            <TextInput
              value={photoTitle}
              onChangeText={setPhotoTitle}
              placeholder="Ex: Panorama du sommet, Pause repas..."
              className="border border-gray-300 rounded-lg p-3 mb-4"
              maxLength={50}
            />
            
            <Text className="text-sm text-gray-600 mb-2">Note (optionnel)</Text>
            <TextInput
              value={photoNote}
              onChangeText={setPhotoNote}
              placeholder="Souvenir, détail, ressenti..."
              className="border border-gray-300 rounded-lg p-3 mb-4 h-20"
              multiline
              textAlignVertical="top"
              maxLength={200}
            />

            {/* Photo sélectionnée */}
            {selectedPhotoUri && (
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-2">Photo sélectionnée</Text>
                <View className="relative">
                  <Image 
                    source={{ uri: selectedPhotoUri }} 
                    className="w-full h-40 rounded-lg" 
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setSelectedPhotoUri(null)}
                    className="absolute top-2 right-2 bg-red-500 p-2 rounded-full"
                  >
                    <Text className="text-white text-xs">✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Actions photos */}
            {!selectedPhotoUri && (
              <View className="flex-row space-x-3 mb-4">
                <TouchableOpacity
                  onPress={handleTakePhoto}
                  className="flex-1 bg-blue-100 border border-blue-300 p-3 rounded-lg"
                >
                  <Text className="text-blue-700 font-bold text-center">📷 Prendre</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handlePickPhoto}
                  className="flex-1 bg-green-100 border border-green-300 p-3 rounded-lg"
                >
                  <Text className="text-green-700 font-bold text-center">🖼️ Choisir</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowAddPhotoModal(false)}
                className="flex-1 bg-gray-500 p-3 rounded-lg"
              >
                <Text className="text-white font-bold text-center">Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleCreateForgottenPhoto}
                disabled={creatingPhoto || !photoTitle.trim() || !selectedPhotoUri}
                className={`flex-1 p-3 rounded-lg ${
                  creatingPhoto || !photoTitle.trim() || !selectedPhotoUri ? 'bg-gray-400' : 'bg-blue-600'
                }`}
              >
                <Text className="text-white font-bold text-center">
                  {creatingPhoto ? '⏳ Ajout...' : '📷 Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

PhotosSection.displayName = 'PhotosSection';

export default PhotosSection;
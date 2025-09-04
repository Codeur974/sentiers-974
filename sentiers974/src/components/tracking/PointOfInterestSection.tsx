import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Image, ScrollView, Dimensions } from 'react-native';
import { usePointsOfInterest } from '../../hooks/usePointsOfInterest';
import { PointOfInterest } from '../../types/poi';

interface PointOfInterestSectionProps {
  coords: { latitude: number; longitude: number; altitude?: number } | null;
  distance: number;
  time: number;
  sessionId?: string;
  isTracking: boolean;
}

export default function PointOfInterestSection({
  coords,
  distance,
  time,
  sessionId,
  isTracking
}: PointOfInterestSectionProps) {
  const { pois, createPOI, deletePOI, getPOIsForSession } = usePointsOfInterest();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [withPhoto, setWithPhoto] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const sessionPOIs = sessionId ? getPOIsForSession(sessionId) : [];

  const handleCreatePOI = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Titre obligatoire');
      return;
    }

    // Si pas de coordonnées GPS actuelles, utiliser la position de la session ou demander une position approximative
    let useCoords = coords;
    if (!coords) {
      // Pour les photos oubliées, on peut utiliser des coordonnées approximatives ou la dernière position connue
      Alert.alert(
        'Position GPS',
        'Aucune position GPS actuelle. La photo sera créée avec une position approximative.',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Continuer', 
            onPress: () => {
              // Position par défaut (centre de La Réunion) si aucune coordonnée
              useCoords = { latitude: -21.1151, longitude: 55.5364, altitude: 0 };
              proceedWithCreation(useCoords);
            }
          }
        ]
      );
      return;
    }

    proceedWithCreation(useCoords);
  };

  const proceedWithCreation = async (useCoords: { latitude: number; longitude: number; altitude?: number }) => {

    setCreating(true);
    
    try {
      const poi = await createPOI(
        useCoords,
        distance,
        time,
        {
          title: title.trim(),
          note: note.trim() || undefined,
          photo: withPhoto
        },
        sessionId
      );

      if (poi) {
        setShowModal(false);
        setTitle('');
        setNote('');
        setWithPhoto(false);
        Alert.alert('Succès', `Point d'intérêt "${poi.title}" créé !`);
      } else {
        Alert.alert('Erreur', 'Impossible de créer le point d\'intérêt');
      }
    } catch (error) {
      console.error('Erreur création POI:', error);
      Alert.alert('Erreur', 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePOI = (poi: PointOfInterest) => {
    Alert.alert(
      'Supprimer',
      `Supprimer le point "${poi.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => deletePOI(poi.id)
        }
      ]
    );
  };

  const formatTime = (timeMs: number) => {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toujours afficher la section, même sans session active
  if (!isTracking && sessionPOIs.length === 0 && !sessionId) {
    return (
      <View className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <Text className="text-center text-gray-500 text-sm">
          📍 Points d'intérêt disponibles pendant l'entraînement
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-purple-50 p-3 rounded-lg border border-purple-200">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-gray-700 font-bold">📍 Points d'intérêt</Text>
        
        {sessionId && (
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            className="bg-purple-600 px-3 py-1 rounded-full"
          >
            <Text className="text-white text-sm font-bold">
              {isTracking ? '+ Ajouter' : '+ Photo oubliée'}
            </Text>
          </TouchableOpacity>
        )}
      </View>


      {/* Liste des POI de cette session */}
      {sessionPOIs.length > 0 ? (
        <ScrollView className="max-h-40" showsVerticalScrollIndicator={false}>
          {sessionPOIs.map((poi) => (
            <View key={poi.id} className="bg-white p-3 rounded-lg mb-2 border border-purple-100">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-bold text-purple-800">{poi.title}</Text>
                  {poi.note && (
                    <Text className="text-sm text-gray-600 mt-1">{poi.note}</Text>
                  )}
                  <Text className="text-xs text-purple-600 mt-1">
                    📏 {poi.distance.toFixed(2)}km • ⏱️ {formatTime(poi.time)} • 📅 {new Date(poi.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                
                {poi.photoUri && (
                  <TouchableOpacity 
                    className="ml-2"
                    onPress={() => setSelectedPhoto(poi.photoUri!)}
                  >
                    <Image 
                      source={{ uri: poi.photoUri }} 
                      className="w-12 h-12 rounded border border-purple-300"
                      resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-black/10 rounded items-center justify-center">
                      <Text className="text-white text-xs">👁️</Text>
                    </View>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  onPress={() => handleDeletePOI(poi)}
                  className="ml-2 p-1"
                >
                  <Text className="text-red-500 text-lg">🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text className="text-center text-purple-600 text-sm">
          Aucun point d'intérêt pour cette session
        </Text>
      )}

      {/* Modal de création */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-center mb-4">
              📍 Nouveau point d'intérêt
            </Text>
            
            <Text className="text-sm text-gray-600 mb-2">Titre *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Sommet du Maïdo, Cascade..."
              className="border border-gray-300 rounded-lg p-3 mb-4"
              maxLength={50}
            />
            
            <Text className="text-sm text-gray-600 mb-2">Note (optionnel)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Vos observations, ressenti..."
              className="border border-gray-300 rounded-lg p-3 mb-4 h-20"
              multiline
              textAlignVertical="top"
              maxLength={200}
            />
            
            <TouchableOpacity
              onPress={() => setWithPhoto(!withPhoto)}
              className={`p-3 rounded-lg mb-4 ${withPhoto ? 'bg-blue-100 border border-blue-300' : 'bg-gray-100 border border-gray-300'}`}
            >
              <Text className={`text-center font-bold ${withPhoto ? 'text-blue-700' : 'text-gray-700'}`}>
                📷 {withPhoto ? 'Photo incluse' : 'Prendre une photo'}
              </Text>
            </TouchableOpacity>
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                className="flex-1 bg-gray-500 p-3 rounded-lg"
              >
                <Text className="text-white font-bold text-center">Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleCreatePOI}
                disabled={creating || !title.trim()}
                className={`flex-1 p-3 rounded-lg ${
                  creating || !title.trim() ? 'bg-gray-400' : 'bg-purple-600'
                }`}
              >
                <Text className="text-white font-bold text-center">
                  {creating ? '⏳ Création...' : '📍 Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal d'affichage plein écran de la photo */}
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
            <Image
              source={{ uri: selectedPhoto }}
              className="w-full h-full"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
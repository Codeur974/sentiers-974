import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Image, ScrollView } from 'react-native';
import { PhotoManager } from '../../utils/photoUtils';
import { usePointsOfInterest } from '../../hooks/usePointsOfInterest';

interface TrackingFooterProps {
  trackingLogic: any;
  isVisible: boolean;
  onToggle: () => void;
}

export default function TrackingFooter({
  trackingLogic,
  isVisible,
  onToggle
}: TrackingFooterProps) {
  const { pois, createPOI, deletePOI, getPOIsForSession } = usePointsOfInterest();
  const [showPOIModal, setShowPOIModal] = useState(false);
  const [poiTitle, setPoiTitle] = useState('');
  const [poiNote, setPoiNote] = useState('');
  const [poiPhoto, setPoiPhoto] = useState<string | null>(null);
  const [creatingPOI, setCreatingPOI] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Obtenir les POI de cette session
  const sessionPOIs = trackingLogic.sessionId ? getPOIsForSession(trackingLogic.sessionId) : [];

  // Plus besoin de useEffect - les POI sont automatiquement synchronisés via getPOIsForSession

  // Prendre une photo pour le POI
  const handleTakePhoto = async () => {
    try {
      const photoUri = await PhotoManager.takePhoto();
      if (photoUri) {
        setPoiPhoto(photoUri);
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
        setPoiPhoto(photoUri);
        Alert.alert('Succès', 'Photo sélectionnée !');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
      console.error('Erreur photo:', error);
    }
  };

  // Créer un POI
  const handleCreatePOI = async () => {
    console.log('🚀 Début création POI');
    console.log('📍 Coords:', trackingLogic.coords);
    console.log('📝 Titre:', poiTitle.trim());
    console.log('📷 Photo:', poiPhoto);
    console.log('🆔 SessionId:', trackingLogic.sessionId);
    
    if (!poiTitle.trim()) {
      Alert.alert('Erreur', 'Titre obligatoire');
      return;
    }

    // Si pas de sessionId, impossible de créer un POI
    if (!trackingLogic.sessionId) {
      Alert.alert('Erreur', 'Aucune session active ou récente pour associer ce POI');
      return;
    }

    // Si pas de coordonnées GPS, utiliser position par défaut
    let useCoords = trackingLogic.coords;
    if (!useCoords) {
      // Position par défaut (centre de La Réunion)
      useCoords = { latitude: -21.1151, longitude: 55.5364, altitude: 0 };
      Alert.alert(
        'Position GPS', 
        'Aucune position GPS disponible. Une position approximative sera utilisée.',
        [{ text: 'OK' }]
      );
    }

    setCreatingPOI(true);
    
    try {
      const poi = await createPOI(
        useCoords,
        trackingLogic.distance || 0, // Si distance non disponible, utiliser 0
        trackingLogic.duration || 0, // Si durée non disponible, utiliser 0
        {
          title: poiTitle.trim(),
          note: poiNote.trim() || undefined,
          photo: poiPhoto || undefined // URI de la photo si sélectionnée
        },
        trackingLogic.sessionId
      );

      if (poi) {
        setShowPOIModal(false);
        setPoiTitle('');
        setPoiNote('');
        setPoiPhoto(null);
        Alert.alert('Succès', `Point d'intérêt "${poi.title}" créé !`);
      } else {
        Alert.alert('Erreur', 'Impossible de créer le point d\'intérêt');
      }
    } catch (error) {
      console.error('❌ Erreur création POI:', error);
      Alert.alert('Erreur', 'Erreur lors de la création');
    } finally {
      setCreatingPOI(false);
    }
  };

  // Supprimer une photo
  const handleRemovePhoto = () => {
    setPoiPhoto(null);
  };

  const formatTime = (timeMs: number) => {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible) {
    // Version minimisée - juste le bouton pour ouvrir
    return (
      <View className="absolute bottom-4 left-4 right-4 z-50">
        <TouchableOpacity
          onPress={onToggle}
          className="bg-purple-600 p-3 rounded-full shadow-lg self-center"
        >
          <Text className="text-white font-bold">📍 Actions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="absolute bottom-80 left-4 right-4 z-40 max-h-96">
      <View className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
          <Text className="text-lg font-bold">📸 Capture tes moments !</Text>
          <TouchableOpacity onPress={onToggle} className="bg-gray-200 px-3 py-1 rounded-lg">
            <Text className="text-gray-600 font-bold">⬇️</Text>
          </TouchableOpacity>
        </View>

        {/* Actions rapides */}
        <ScrollView className="max-h-48 flex-1">
          <View className="p-4 space-y-4">
            {/* Créer un POI */}
            <TouchableOpacity
              onPress={() => setShowPOIModal(true)}
              className="p-4 rounded-lg flex-row items-center justify-center bg-purple-600"
            >
              <Text className="text-white font-bold mr-2">📍</Text>
              <Text className="text-white font-bold">
                {trackingLogic.coords ? 'Créer Point d\'Intérêt' : 'Ajouter Photo Oubliée'}
              </Text>
            </TouchableOpacity>

            {/* Prendre une photo */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={handleTakePhoto}
                className="flex-1 bg-blue-600 p-3 rounded-lg flex-row items-center justify-center"
              >
                <Text className="text-white font-bold">📷 Caméra</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handlePickPhoto}
                className="flex-1 bg-green-600 p-3 rounded-lg flex-row items-center justify-center"
              >
                <Text className="text-white font-bold">🖼️ Galerie</Text>
              </TouchableOpacity>
            </View>

            {/* POI de la session courante */}
            {sessionPOIs.length > 0 && (
              <View className="bg-purple-50 p-3 rounded-lg">
                <Text className="text-purple-800 font-bold mb-2">
                  📍 Points d'intérêt ({sessionPOIs.length})
                </Text>
                {sessionPOIs.map((poi, index) => (
                    <View key={poi.id || index} className="bg-white p-2 rounded mb-2 flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className="font-bold">{poi.title}</Text>
                        <Text className="text-xs text-gray-600">
                          📏 {(poi.distance || 0).toFixed(2)}km • ⏱️ {formatTime(poi.time || 0)}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          Photo: {poi.photoUri ? '✅ Disponible' : '❌ Aucune'}
                        </Text>
                      </View>
                      {poi.photoUri && (
                        <TouchableOpacity onPress={() => {
                          console.log('👁️ Ouverture photo:', poi.photoUri);
                          setSelectedPhoto(poi.photoUri || null);
                        }}>
                          <Text className="text-blue-600 text-lg">👁️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Modal de création POI */}
        <Modal
          visible={showPOIModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPOIModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center px-4">
            <View className="bg-white rounded-2xl p-6">
              <Text className="text-xl font-bold text-center mb-4">
                📍 Nouveau point d'intérêt
              </Text>
              
              <Text className="text-sm text-gray-600 mb-2">Titre *</Text>
              <TextInput
                value={poiTitle}
                onChangeText={setPoiTitle}
                placeholder="Ex: Sommet du Maïdo, Cascade..."
                className="border border-gray-300 rounded-lg p-3 mb-4"
                maxLength={50}
              />
              
              <Text className="text-sm text-gray-600 mb-2">Note (optionnel)</Text>
              <TextInput
                value={poiNote}
                onChangeText={setPoiNote}
                placeholder="Vos observations, ressenti..."
                className="border border-gray-300 rounded-lg p-3 mb-4 h-20"
                multiline
                textAlignVertical="top"
                maxLength={200}
              />

              {/* Photo sélectionnée */}
              {poiPhoto && (
                <View className="mb-4">
                  <Text className="text-sm text-gray-600 mb-2">Photo sélectionnée</Text>
                  <View className="relative">
                    <Image 
                      source={{ uri: poiPhoto }} 
                      className="w-full h-40 rounded-lg" 
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={handleRemovePhoto}
                      className="absolute top-2 right-2 bg-red-500 p-2 rounded-full"
                    >
                      <Text className="text-white text-xs">✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Actions photos */}
              {!poiPhoto && (
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
                  onPress={() => setShowPOIModal(false)}
                  className="flex-1 bg-gray-500 p-3 rounded-lg"
                >
                  <Text className="text-white font-bold text-center">Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleCreatePOI}
                  disabled={creatingPOI || !poiTitle.trim()}
                  className={`flex-1 p-3 rounded-lg ${
                    creatingPOI || !poiTitle.trim() ? 'bg-gray-400' : 'bg-purple-600'
                  }`}
                >
                  <Text className="text-white font-bold text-center">
                    {creatingPOI ? '⏳ Création...' : '📍 Créer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal photo plein écran */}
        <Modal
          visible={selectedPhoto !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/90 justify-center items-center"
            onPress={() => setSelectedPhoto(null)}
            activeOpacity={1}
          >
            <TouchableOpacity
              onPress={() => setSelectedPhoto(null)}
              className="absolute top-12 right-4 z-10 bg-black/50 p-3 rounded-full"
            >
              <Text className="text-white text-xl">✕</Text>
            </TouchableOpacity>
            
            {selectedPhoto && (
              <TouchableOpacity activeOpacity={1} className="flex-1 justify-center items-center w-full">
                <Image
                  source={{ uri: selectedPhoto }}
                  className="w-full h-3/4"
                  resizeMode="contain"
                  onLoad={() => {
                    console.log('✅ Image chargée avec succès:', selectedPhoto);
                  }}
                  onError={(error) => {
                    console.log('❌ Erreur chargement image:', selectedPhoto);
                    console.log('❌ Détail erreur:', error.nativeEvent.error);
                    // Ne pas fermer automatiquement, laisser l'utilisateur voir l'erreur
                  }}
                  onLoadStart={() => {
                    console.log('🔄 Début chargement image:', selectedPhoto);
                  }}
                />
                {/* Indicateur de chargement */}
                <Text className="text-white text-center mt-4 text-sm opacity-70">
                  Appuyez n'importe où pour fermer
                </Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}
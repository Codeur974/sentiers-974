import React from 'react';
import { View, TouchableOpacity, Text, Image, Modal, TextInput, ActivityIndicator } from 'react-native';

interface AddPhotoModalProps {
  visible: boolean;
  photoTitle: string;
  photoNote: string;
  selectedPhotoUri: string | null;
  creatingPhoto: boolean;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onNoteChange: (note: string) => void;
  onTakePhoto: () => void;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  onCreate: () => void;
}

export const AddPhotoModal: React.FC<AddPhotoModalProps> = ({
  visible,
  photoTitle,
  photoNote,
  selectedPhotoUri,
  creatingPhoto,
  onClose,
  onTitleChange,
  onNoteChange,
  onTakePhoto,
  onPickPhoto,
  onRemovePhoto,
  onCreate
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center px-4">
        <View className="bg-white rounded-2xl p-6 relative">
          <Text className="text-xl font-bold text-center mb-4">
            📷 Ajouter photo oubliée
          </Text>

          <Text className="text-sm text-gray-600 mb-2">Titre *</Text>
          <TextInput
            value={photoTitle}
            onChangeText={onTitleChange}
            placeholder="Ex: Panorama du sommet, Pause repas..."
            className="border border-gray-300 rounded-lg p-3 mb-4"
            maxLength={50}
            autoFocus={false}
            editable={!creatingPhoto}
          />

          <Text className="text-sm text-gray-600 mb-2">Note (optionnel)</Text>
          <TextInput
            value={photoNote}
            autoFocus={false}
            onChangeText={onNoteChange}
            placeholder="Souvenir, détail, ressenti..."
            className="border border-gray-300 rounded-lg p-3 mb-4 h-20"
            multiline
            textAlignVertical="top"
            maxLength={200}
            editable={!creatingPhoto}
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
                {!creatingPhoto && (
                  <TouchableOpacity
                    onPress={onRemovePhoto}
                    className="absolute top-2 right-2 bg-red-500 p-2 rounded-full"
                  >
                    <Text className="text-white text-xs">✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Actions photos */}
          {!selectedPhotoUri && !creatingPhoto && (
            <View className="flex-row space-x-3 mb-4">
              <TouchableOpacity
                onPress={onTakePhoto}
                className="flex-1 bg-blue-100 border border-blue-300 p-3 rounded-lg"
              >
                <Text className="text-blue-700 font-bold text-center">📷 Prendre</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onPickPhoto}
                className="flex-1 bg-green-100 border border-green-300 p-3 rounded-lg"
              >
                <Text className="text-green-700 font-bold text-center">🖼️ Choisir</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-500 p-3 rounded-lg"
              disabled={creatingPhoto}
            >
              <Text className="text-white font-bold text-center">Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onCreate}
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

          {/* Overlay de chargement pendant la création */}
          {creatingPhoto && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', borderRadius: 16 }}>
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginTop: 16, textAlign: 'center' }}>
                  POI en cours de création
                </Text>
                <Text style={{ fontSize: 14, color: '#4b5563', marginTop: 8, textAlign: 'center' }}>
                  Veuillez patienter...
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
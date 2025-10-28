import React from 'react';
import { View, TouchableOpacity, Text, Image, Modal, TextInput } from 'react-native';

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
        <View className="bg-white rounded-2xl p-6">
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
                  onPress={onRemovePhoto}
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
        </View>
      </View>
    </Modal>
  );
};
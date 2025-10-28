import React from 'react';
import { View, TouchableOpacity, Text, Image, Modal } from 'react-native';

interface PhotoModalProps {
  visible: boolean;
  photo: {
    uri: string;
    title: string;
    note?: string;
  } | null;
  onClose: () => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  visible,
  photo,
  onClose
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/90 justify-center items-center">
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-12 right-4 z-10 bg-black/50 p-3 rounded-full"
        >
          <Text className="text-white text-xl">✕</Text>
        </TouchableOpacity>

        {photo && (
          <View className="flex-1 justify-center items-center w-full px-4">
            <Image
              source={{ uri: photo.uri }}
              className="w-full h-2/3"
              resizeMode="contain"
              onLoad={() => console.log('✅ Photo plein écran chargée')}
              onError={(e) => console.log('❌ Erreur photo:', e.nativeEvent.error)}
            />

            {/* Infos en bas de la photo */}
            <View className="mt-4 bg-black/70 p-4 rounded-lg max-w-full">
              <Text className="text-white font-bold text-lg text-center mb-2">
                📸 {photo.title}
              </Text>
              {photo.note && (
                <Text className="text-white text-base text-center">
                  💭 {photo.note}
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
  );
};
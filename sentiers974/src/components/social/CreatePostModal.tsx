import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SocialPhoto, CreatePostData, SocialPost } from '../../types/social';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (postData: CreatePostData) => void;
  editPost?: SocialPost; // Post à modifier (optionnel)
}

export default function CreatePostModal({ visible, onClose, onSubmit, editPost }: CreatePostModalProps) {
  const [caption, setCaption] = useState('');
  const [photos, setPhotos] = useState<SocialPhoto[]>([]);
  const [location, setLocation] = useState('');
  const [sport, setSport] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialiser les valeurs si on modifie un post existant
  React.useEffect(() => {
    if (editPost && visible) {
      setCaption(editPost.caption);
      setPhotos(editPost.photos);
      setLocation(editPost.location || '');
      setSport(editPost.sport || '');
    }
  }, [editPost, visible]);

  const resetForm = () => {
    setCaption('');
    setPhotos([]);
    setLocation('');
    setSport('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTakePhoto = async () => {
    try {
      console.log('🔍 Vérification des permissions caméra...');
      
      // Vérifier d'abord les permissions actuelles
      const currentPermissions = await ImagePicker.getCameraPermissionsAsync();
      console.log('📋 Permissions caméra actuelles:', currentPermissions);
      
      let finalStatus = currentPermissions.status;
      
      if (finalStatus !== 'granted') {
        console.log('🔑 Demande de permissions caméra...');
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        finalStatus = status;
        console.log('📝 Réponse permissions:', status);
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permissions refusées');
        Alert.alert(
          'Permission refusée', 
          'Pour prendre des photos, veuillez autoriser l\'accès à l\'appareil photo dans les réglages de votre téléphone.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Réglages', onPress: () => console.log('Redirection vers réglages') }
          ]
        );
        return;
      }

      console.log('📷 Ouverture de l\'appareil photo...');
      // Ouvrir l'appareil photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('📸 Résultat photo:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const newPhoto: SocialPhoto = {
          id: `photo_${Date.now()}`,
          uri: result.assets[0].uri,
          caption: ''
        };
        console.log('✅ Photo ajoutée:', newPhoto.id);
        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error('❌ Erreur prise de photo:', error);
      Alert.alert('Erreur', `Impossible de prendre la photo: ${error.message || error}`);
    }
  };

  const handlePickPhoto = async () => {
    try {
      console.log('🔍 Vérification des permissions galerie...');
      
      // Vérifier d'abord les permissions actuelles
      const currentPermissions = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('📋 Permissions galerie actuelles:', currentPermissions);
      
      let finalStatus = currentPermissions.status;
      
      if (finalStatus !== 'granted') {
        console.log('🔑 Demande de permissions galerie...');
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = status;
        console.log('📝 Réponse permissions:', status);
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permissions refusées');
        Alert.alert(
          'Permission refusée', 
          'Pour sélectionner des photos, veuillez autoriser l\'accès à votre galerie dans les réglages de votre téléphone.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Réglages', onPress: () => console.log('Redirection vers réglages') }
          ]
        );
        return;
      }

      console.log('📱 Ouverture de la galerie...');
      // Ouvrir la galerie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      console.log('🖼️ Résultat galerie:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const newPhoto: SocialPhoto = {
          id: `photo_${Date.now()}`,
          uri: result.assets[0].uri,
          caption: ''
        };
        console.log('✅ Photo ajoutée:', newPhoto.id);
        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error('❌ Erreur sélection photo:', error);
      Alert.alert('Erreur', `Impossible de sélectionner la photo: ${error.message || error}`);
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const handleSubmit = async () => {
    if (!caption.trim()) {
      Alert.alert('Erreur', 'Veuillez ajouter une description');
      return;
    }

    setIsSubmitting(true);

    const postData: CreatePostData = {
      photos,
      caption: caption.trim(),
      location: location.trim() || undefined,
      sport: sport.trim() || undefined
    };

    onSubmit(postData);
    resetForm();
  };

  const sportOptions = ['Course', 'Randonnée', 'Vélo', 'VTT', 'Surf', 'Natation', 'Escalade'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <TouchableOpacity onPress={handleClose}>
              <Text className="text-blue-500 font-semibold text-lg">Annuler</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold">{editPost ? 'Modifier Post' : 'Nouveau Post'}</Text>
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={!caption.trim() || isSubmitting}
              className={`px-4 py-2 rounded-full ${
                caption.trim() && !isSubmitting ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <Text className={`font-semibold ${
                caption.trim() && !isSubmitting ? 'text-white' : 'text-gray-500'
              }`}>
                {isSubmitting ? 'Envoi...' : (editPost ? 'Modifier' : 'Publier')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Zone de texte principale */}
            <TextInput
              className="text-lg text-gray-900 mb-4 min-h-[100px]"
              placeholder="Partagez votre expérience..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={caption}
              onChangeText={setCaption}
              style={{ textAlignVertical: 'top' }}
            />

            {/* Photos */}
            <View className="mb-4">
              <Text className="text-base font-semibold text-gray-900 mb-3">Photos</Text>
              
              {/* Photos ajoutées */}
              {photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                  {photos.map((photo) => (
                    <View key={photo.id} className="relative mr-2">
                      <Image 
                        source={{ uri: photo.uri }}
                        className="w-20 h-20 rounded-lg"
                      />
                      <TouchableOpacity
                        onPress={() => removePhoto(photo.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                      >
                        <Text className="text-white text-xs font-bold">×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Boutons d'ajout de photos */}
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={handleTakePhoto}
                  className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-4 items-center"
                >
                  <Text className="text-2xl mb-1">📷</Text>
                  <Text className="text-blue-600 font-medium">Prendre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePickPhoto}
                  className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 items-center"
                >
                  <Text className="text-2xl mb-1">📱</Text>
                  <Text className="text-green-600 font-medium">Galerie</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Localisation */}
            <View className="mb-4">
              <Text className="text-base font-semibold text-gray-900 mb-2">Lieu (optionnel)</Text>
              <TextInput
                className="bg-gray-50 rounded-xl p-4 text-gray-900"
                placeholder="Où étiez-vous ?"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* Sport */}
            <View className="mb-4">
              <Text className="text-base font-semibold text-gray-900 mb-2">Sport (optionnel)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-2">
                  {sportOptions.map((sportOption) => (
                    <TouchableOpacity
                      key={sportOption}
                      onPress={() => setSport(sport === sportOption ? '' : sportOption)}
                      className={`px-4 py-2 rounded-full border ${
                        sport === sportOption 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`font-medium ${
                        sport === sportOption ? 'text-white' : 'text-gray-700'
                      }`}>
                        {sportOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
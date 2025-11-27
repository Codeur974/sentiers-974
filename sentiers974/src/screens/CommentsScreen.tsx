import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  Keyboard,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSocialStore } from '../store/useSocialStore';
import { SocialPost } from '../types/social';
import * as ImagePicker from 'expo-image-picker';

interface CommentsScreenProps {
  route: {
    params: {
      postId: string;
    };
  };
}

export default function CommentsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { postId } = route.params as { postId: string };

  const [commentText, setCommentText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputPosition, setInputPosition] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState<Array<{id: string, uri: string}>>([]);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const { posts, addComment, updateComment, deleteComment: removeComment, currentUserId } = useSocialStore();
  const post = posts.find(p => p.id === postId);
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      const keyboardTop = e.endCoordinates.screenY;
      const inputHeight = 80; // Hauteur approximative de notre zone de saisie
      setInputPosition(keyboardTop - inputHeight);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      setInputPosition(0);
    });

    // Auto-focus sur l'input quand l'écran s'ouvre
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  if (!post) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500">Post introuvable</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-blue-500 mt-4">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhoto = {
        id: Date.now().toString(),
        uri: result.assets[0].uri
      };
      setSelectedPhotos(prev => [...prev, newPhoto]);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhoto = {
        id: Date.now().toString(),
        uri: result.assets[0].uri
      };
      setSelectedPhotos(prev => [...prev, newPhoto]);
    }
  };

  const removePhoto = (photoId: string) => {
    setSelectedPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleSubmit = async () => {
    const text = commentText.trim();

    // Vérifier qu'on a au moins du texte ou des photos
    if (!text && selectedPhotos.length === 0) {
      return; // Ne rien faire si pas de contenu
    }

    // Si on a des photos mais pas de texte, demander un commentaire
    if (!text && selectedPhotos.length > 0) {
      Alert.alert(
        'Commentaire requis',
        'Veuillez ajouter un commentaire avec votre photo.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      if (editingComment) {
        // Mode édition
        await updateComment(postId, editingComment, text, selectedPhotos);
        setEditingComment(null);
      } else {
        // Mode création
        await addComment(postId, text, selectedPhotos);
      }
      setCommentText('');
      setSelectedPhotos([]);
      // Garder le focus pour écrire d'autres commentaires
      inputRef.current?.focus();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le commentaire');
    }
  };

  const startEditComment = (comment: any) => {
    setEditingComment(comment.id);
    setCommentText(comment.text);
    setSelectedPhotos(comment.photos || []);
    setShowCommentMenu(null);
    inputRef.current?.focus();
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      'Supprimer le commentaire',
      'Êtes-vous sûr de vouloir supprimer ce commentaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await removeComment(postId, commentId);
            setShowCommentMenu(null);
          }
        }
      ]
    );
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setCommentText('');
    setSelectedPhotos([]);
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}j`;
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-blue-500 text-16">← Retour</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold">Commentaires</Text>
          <View className="w-16" />
        </View>

        {/* Liste des commentaires */}
        <ScrollView
          className="flex-1 p-4"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
        {post.comments && post.comments.length > 0 ? (
          post.comments.slice().reverse().map((comment) => (
            <View
              key={comment.id}
              className="mb-4 p-3 bg-gray-50 rounded-xl"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-sm text-gray-900 leading-4">
                    <Text className="font-semibold">{comment.userName}</Text>
                    <Text> {comment.text}</Text>
                  </Text>
                  {/* Photos du commentaire */}
                  {comment.photos && comment.photos.length > 0 && (
                    <ScrollView horizontal className="mt-2" showsHorizontalScrollIndicator={false}>
                      {comment.photos.map((photo: any) => (
                        <Image
                          key={photo.id}
                          source={{ uri: photo.uri }}
                          className="w-20 h-20 rounded-lg mr-2"
                        />
                      ))}
                    </ScrollView>
                  )}
                  <Text className="text-xs text-gray-500 mt-2">
                    {formatTime(comment.createdAt)}
                  </Text>
                </View>

                {/* Menu pour le propriétaire du commentaire */}
                {comment.userId === currentUserId && (
                  <View className="relative">
                    <TouchableOpacity
                      onPress={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)}
                      className="w-6 h-6 items-center justify-center"
                    >
                      <Text className="text-gray-500 text-sm">⋯</Text>
                    </TouchableOpacity>

                    {showCommentMenu === comment.id && (
                      <View className="absolute right-0 top-6 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[100px] z-50">
                        <TouchableOpacity
                          onPress={() => startEditComment(comment)}
                          className="px-3 py-2 flex-row items-center"
                        >
                          <Text className="mr-2">✏️</Text>
                          <Text className="text-gray-900 text-sm">Modifier</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(comment.id)}
                          className="px-3 py-2 flex-row items-center"
                        >
                          <Text className="mr-2">🗑️</Text>
                          <Text className="text-red-500 text-sm">Supprimer</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-500 text-center">
              Aucun commentaire pour le moment
            </Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              Soyez le premier à commenter !
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Zone de saisie fixe en bas */}
      <View className="p-4 border-t border-gray-200 bg-white">
        {/* Photos sélectionnées */}
        {selectedPhotos.length > 0 && (
          <ScrollView horizontal className="mb-3" showsHorizontalScrollIndicator={false}>
            {selectedPhotos.map((photo) => (
              <View key={photo.id} className="relative mr-2">
                <Image source={{ uri: photo.uri }} className="w-16 h-16 rounded-lg" />
                <TouchableOpacity
                  onPress={() => removePhoto(photo.id)}
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                >
                  <Text className="text-white text-xs font-bold">×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View className="flex-row items-end bg-gray-100 rounded-2xl px-4 py-3">
          {/* Bouton photo */}
          <TouchableOpacity
            onPress={() => setShowPhotoModal(true)}
            className="w-8 h-8 items-center justify-center mr-2"
            style={{ marginBottom: 8 }}
          >
            <Text className="text-lg">📷</Text>
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            className="flex-1 text-base max-h-24"
            placeholder="Écrire un commentaire..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSubmit}
            style={{ minHeight: 36 }}
          />

          {(commentText.trim().length > 0 || selectedPhotos.length > 0) && (
            <View className="flex-row">
              {editingComment && (
                <TouchableOpacity
                  onPress={cancelEdit}
                  className="bg-gray-500 rounded-full w-8 h-8 items-center justify-center mr-2"
                  style={{ marginBottom: 2 }}
                >
                  <Text className="text-white font-bold text-sm">×</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSubmit}
                className="bg-blue-500 rounded-full w-8 h-8 items-center justify-center"
                style={{ marginBottom: 2 }}
              >
                <Text className="text-white font-bold text-sm">
                  {editingComment ? '✓' : '→'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Modal de sélection photo */}
      {showPhotoModal && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-2xl p-6 mx-8 min-w-64">
            <Text className="text-lg font-bold text-center mb-4">Ajouter une photo</Text>

            <TouchableOpacity
              onPress={() => {
                setShowPhotoModal(false);
                takePhoto();
              }}
              className="flex-row items-center p-4 bg-gray-100 rounded-xl mb-3"
            >
              <Text className="text-2xl mr-3">📷</Text>
              <Text className="text-base font-medium">Prendre une photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowPhotoModal(false);
                pickPhoto();
              }}
              className="flex-row items-center p-4 bg-gray-100 rounded-xl mb-4"
            >
              <Text className="text-2xl mr-3">🖼️</Text>
              <Text className="text-base font-medium">Choisir depuis la galerie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPhotoModal(false)}
              className="p-3 items-center"
            >
              <Text className="text-gray-500 text-base">Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
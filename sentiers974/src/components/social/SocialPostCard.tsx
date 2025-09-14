import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, Alert } from 'react-native';
import { SocialPost } from '../../types/social';

interface SocialPostCardProps {
  post: SocialPost;
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export default function SocialPostCard({ post, currentUserId, onLike, onComment, onEdit, onDelete }: SocialPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isLiked = post.likes ? post.likes.includes(currentUserId) : false;
  const likesCount = post.likes ? post.likes.length : 0;
  const commentsCount = post.comments ? post.comments.length : 0;

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText.trim());
      setCommentText('');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le post',
      'Êtes-vous sûr de vouloir supprimer ce post ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onDelete && onDelete(post.id)
        }
      ]
    );
  };

  const isOwner = post.userId === currentUserId;

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}j`;
  };

  return (
    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
      {/* Header du post */}
      <View className="p-4 flex-row items-center">
        <Image 
          source={{ uri: post.userAvatar || 'https://via.placeholder.com/40' }}
          className="w-10 h-10 rounded-full"
        />
        <View className="ml-3 flex-1">
          <Text className="font-semibold text-gray-900">{post.userName}</Text>
          <View className="flex-row items-center">
            <Text className="text-gray-500 text-sm">{formatTime(post.createdAt)}</Text>
            {post.location && (
              <>
                <Text className="text-gray-400 mx-2">•</Text>
                <Text className="text-gray-500 text-sm">📍 {post.location}</Text>
              </>
            )}
            {post.sport && (
              <>
                <Text className="text-gray-400 mx-2">•</Text>
                <Text className="text-blue-500 text-sm font-medium">{post.sport}</Text>
              </>
            )}
          </View>
        </View>
        
        {/* Menu pour le propriétaire du post */}
        {isOwner && (
          <View className="relative">
            <TouchableOpacity
              onPress={() => setShowMenu(!showMenu)}
              className="w-8 h-8 items-center justify-center"
            >
              <Text className="text-gray-500 text-lg">⋯</Text>
            </TouchableOpacity>
            
            {showMenu && (
              <View className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[120px] z-50">
                <TouchableOpacity
                  onPress={() => {
                    setShowMenu(false);
                    onEdit && onEdit(post.id);
                  }}
                  className="px-4 py-2 flex-row items-center"
                >
                  <Text className="mr-2">✏️</Text>
                  <Text className="text-gray-900">Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowMenu(false);
                    handleDelete();
                  }}
                  className="px-4 py-2 flex-row items-center"
                >
                  <Text className="mr-2">🗑️</Text>
                  <Text className="text-red-500">Supprimer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Photos */}
      {post.photos && post.photos.length > 0 && (
        <View>
          {post.photos.length === 1 ? (
            <Image 
              source={{ uri: post.photos[0].uri }}
              className="w-full h-64"
              resizeMode="cover"
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="h-64"
            >
              {(showAllPhotos ? post.photos : post.photos.slice(0, 3)).map((photo, index) => (
                <View key={photo.id} className="relative">
                  <Image 
                    source={{ uri: photo.uri }}
                    className="w-64 h-64 mr-2"
                    resizeMode="cover"
                  />
                  {/* Indicateur s'il y a plus de photos */}
                  {!showAllPhotos && index === 2 && post.photos.length > 3 && (
                    <TouchableOpacity 
                      className="absolute inset-0 bg-black/50 items-center justify-center"
                      onPress={() => setShowAllPhotos(true)}
                    >
                      <Text className="text-white font-bold text-lg">
                        +{post.photos.length - 3}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Caption */}
      {post.caption && (
        <View className="px-4 pt-3">
          <Text className="text-gray-900 leading-5">
            <Text className="font-semibold">{post.userName}</Text>
            <Text> {post.caption}</Text>
          </Text>
        </View>
      )}

      {/* Actions (like, comment) */}
      <View className="px-4 py-3">
        <View className="flex-row items-center mb-2">
          <TouchableOpacity 
            onPress={() => onLike(post.id)}
            className="flex-row items-center mr-6"
          >
            <Text className={`text-lg mr-1 ${isLiked ? '' : 'opacity-50'}`}>
              {isLiked ? '❤️' : '🤍'}
            </Text>
            <Text className={`text-sm font-medium ${isLiked ? 'text-red-500' : 'text-gray-600'}`}>
              {likesCount > 0 ? likesCount : ''}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowComments(!showComments)}
            className="flex-row items-center"
          >
            <Text className="text-lg mr-1 opacity-70">💬</Text>
            <Text className="text-sm font-medium text-gray-600">
              {commentsCount > 0 ? commentsCount : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Affichage du nombre de likes */}
        {likesCount > 0 && (
          <Text className="text-sm font-medium text-gray-900 mb-1">
            {likesCount} j'aime{likesCount > 1 ? 's' : ''}
          </Text>
        )}

        {/* Commentaires */}
        {showComments && (
          <View className="mt-2">
            {/* Liste des commentaires */}
            {post.comments && post.comments.map((comment) => (
              <View key={comment.id} className="mb-2">
                <Text className="text-sm text-gray-900 leading-4">
                  <Text className="font-semibold">{comment.userName}</Text>
                  <Text> {comment.text}</Text>
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {formatTime(comment.createdAt)}
                </Text>
              </View>
            ))}

            {/* Zone d'ajout de commentaire */}
            <View className="flex-row items-center mt-2 pt-2 border-t border-gray-100">
              <TextInput
                className="flex-1 bg-gray-50 rounded-full px-4 py-2 mr-2"
                placeholder="Ajouter un commentaire..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={!commentText.trim()}
                className={`px-4 py-2 rounded-full ${
                  commentText.trim() ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <Text className={`text-sm font-medium ${
                  commentText.trim() ? 'text-white' : 'text-gray-500'
                }`}>
                  →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
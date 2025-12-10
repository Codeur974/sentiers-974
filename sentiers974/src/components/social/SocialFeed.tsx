import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SocialPost } from '../../types/social';
import SocialPostCard from './SocialPostCard';
import { useAuth } from '../../contexts/AuthContext';

interface SocialFeedProps {
  posts: SocialPost[];
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
  onEdit: (postId: string) => void;
  onDelete: (postId: string) => void;
  onRefresh: () => Promise<void>;
  onCreatePost: () => void;
}

export default function SocialFeed({
  posts,
  currentUserId,
  onLike,
  onComment,
  onEdit,
  onDelete,
  onRefresh,
  onCreatePost
}: SocialFeedProps) {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleCreatePost = () => {
    // Le bouton n'est visible que si authentifié, pas besoin de vérifier
    onCreatePost();
  };

  return (
    <View className="mb-6">
      {/* Header avec bouton + ou message de connexion */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-900">
          🏆 Partager vos exploits
        </Text>

        {isAuthenticated ? (
          <TouchableOpacity
            onPress={handleCreatePost}
            className="bg-blue-500 px-4 py-2 rounded-full flex-row items-center"
          >
            <Text className="text-white font-semibold mr-1">+</Text>
            <Text className="text-white font-semibold">Post</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile" as never)}
            className="bg-gray-100 px-3 py-2 rounded-full border border-gray-300"
          >
            <Text className="text-gray-600 font-medium text-xs">
              🔒 Connexion
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Liste des posts */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        nestedScrollEnabled={true}
      >
        {posts && posts.length > 0 ? posts.map((post) => (
          <SocialPostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            onLike={onLike}
            onComment={onComment}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )) : (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-500">Aucun post à afficher</Text>
          </View>
        )}
      </ScrollView>

    </View>
  );
}
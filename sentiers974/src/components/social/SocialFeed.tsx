import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SocialPost } from '../../types/social';
import SocialPostCard from './SocialPostCard';

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <View className="mb-6">
      {/* Header avec bouton + */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-900">
          🏆 Partager vos exploits
        </Text>
        <TouchableOpacity
          onPress={onCreatePost}
          className="bg-blue-500 px-4 py-2 rounded-full flex-row items-center"
        >
          <Text className="text-white font-semibold mr-1">+</Text>
          <Text className="text-white font-semibold">Post</Text>
        </TouchableOpacity>
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
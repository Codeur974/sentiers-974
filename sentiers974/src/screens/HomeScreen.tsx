import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { ImageBackground, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Layout from "../components/Layout";
import FooterNavigation from "../components/FooterNavigation";
import LocationSection from "../components/LocationSection";
import SocialFeed from "../components/social/SocialFeed";
import CreatePostModal from "../components/social/CreatePostModal";
import Filter, { FilterRef } from "../components/Filter";
import { Modal } from "react-native";
import { SocialPost } from "../types/social";
import { useLocationStore } from "../store/useLocationStore";
import { useSessionStore } from "../store/useSessionStore";

// Données mock pour tester
const mockPosts: SocialPost[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Marie Delacroix',
    userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    userLocation: 'Saint-Denis, La Réunion',
    photos: [{
      id: 'photo1',
      uri: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop',
      caption: 'Vue du sommet'
    }],
    caption: 'Magnifique randonnée au Piton de la Fournaise ce matin ! 🌋 Les paysages de La Réunion sont vraiment uniques.',
    likes: ['user2', 'user3', 'user4'],
    comments: [
      {
        id: 'comment1',
        userId: 'user2',
        userName: 'Paul Martin',
        text: 'Superbes photos ! 😍',
        createdAt: Date.now() - 3600000
      },
      {
        id: 'comment2',
        userId: 'user3',
        userName: 'Sophie Leroy',
        text: 'J\'y étais la semaine dernière, c\'est magique !',
        createdAt: Date.now() - 1800000
      }
    ],
    createdAt: Date.now() - 7200000,
    sport: 'Randonnée',
    location: 'Piton de la Fournaise'
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Paul Martin',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    userLocation: 'Saint-Paul, La Réunion',
    photos: [
      {
        id: 'photo2',
        uri: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=300&fit=crop',
        caption: 'Session surf'
      },
      {
        id: 'photo3',
        uri: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&h=300&fit=crop',
        caption: 'Les vagues parfaites'
      }
    ],
    caption: 'Session surf incroyable à la Plage des Roches Noires ! 🏄‍♂️ Les vagues étaient parfaites aujourd\'hui.',
    likes: ['user1', 'user3'],
    comments: [
      {
        id: 'comment3',
        userId: 'user1',
        userName: 'Marie Delacroix',
        text: 'Trop stylé ! Tu m\'apprends ? 😄',
        createdAt: Date.now() - 900000
      }
    ],
    createdAt: Date.now() - 14400000,
    sport: 'Surf',
    location: 'Plage des Roches Noires'
  },
  {
    id: '3',
    userId: 'currentUser', // Post de l'utilisateur actuel pour tester les fonctions
    userName: 'Moi',
    userAvatar: 'https://via.placeholder.com/40',
    userLocation: 'La Réunion',
    photos: [{
      id: 'photo4',
      uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      caption: 'Vue magnifique'
    }],
    caption: 'Mon premier post sur Sentiers 974 ! 🌋 Quelle île incroyable !',
    likes: ['user1'],
    comments: [],
    createdAt: Date.now() - 3600000,
    sport: 'Randonnée',
    location: 'Cirque de Mafate'
  }
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Accès aux stores pour réinitialisation
  const { reset: resetLocation } = useLocationStore();
  const { reset: resetSession } = useSessionStore();

  const [isFirstHomeLoad, setIsFirstHomeLoad] = useState(true);
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [posts, setPosts] = useState<SocialPost[]>(mockPosts);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [sportFilterVisible, setSportFilterVisible] = useState(false);
  const filterRef = useRef<FilterRef>(null);

  const currentUserId = 'currentUser';


  // Réinitialiser HomeScreen quand on revient dessus (pas au premier chargement)
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      
      if (isFirstHomeLoad) {
        console.log("🏠 Premier chargement HomeScreen - pas de reset");
        setIsFirstHomeLoad(false);
      } else {
        console.log("🏠 Retour HomeScreen - reset des stores");
        resetLocation();
        resetSession();
      }
    }, [isFirstHomeLoad, resetLocation, resetSession])
  );

  // Handle sport selection and navigation
  const handleSportSelect = (sport: any) => {
    setSportFilterVisible(false);
    navigation.navigate("Tracking", { selectedSport: sport });
  };

  // Boutons du footer avec navigation vers Sports
  const footerButtons = (
    <View className="flex-row justify-around w-full">
      {/* Bouton Sports */}
      <View className="items-center">
        <TouchableOpacity
          onPress={() => navigation.navigate("Sports")}
          className="w-10 h-10 items-center justify-center mb-1"
        >
          <Text className="text-base">🏃</Text>
        </TouchableOpacity>
        <Text className="text-gray-700 text-xs font-medium">
          Événement
        </Text>
      </View>

      {/* Bouton Sentiers */}
      <View className="items-center">
        <TouchableOpacity
          onPress={() => navigation.navigate("Sentiers")}
          className="w-10 h-10 items-center justify-center mb-1"
        >
          <Text className="text-base">🥾</Text>
        </TouchableOpacity>
        <Text className="text-gray-700 text-xs font-medium">
          Sentiers
        </Text>
      </View>

      {/* Bouton Sport Filter */}
      <View className="items-center">
        <TouchableOpacity
          onPress={() => setSportFilterVisible(true)}
          className="w-10 h-10 items-center justify-center mb-1"
        >
          <Text className="text-base">📝</Text>
        </TouchableOpacity>
        <Text className="text-gray-700 text-xs font-medium">
          Enregistrer
        </Text>
      </View>

      {/* Bouton Tracking */}
      <View className="items-center">
        <TouchableOpacity
          onPress={() => navigation.navigate("Tracking")}
          className="w-10 h-10 items-center justify-center mb-1"
        >
          <Text className="text-base">📊</Text>
        </TouchableOpacity>
        <Text className="text-gray-700 text-xs font-medium">
          Suivi
        </Text>
      </View>
    </View>
  );

  // Fonctions pour gérer les posts
  const handleRefresh = async () => {
    // Ici on rechargerait les posts depuis l'API
  };

  const handleLike = (postId: string) => {
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === postId) {
        const isLiked = post.likes.includes(currentUserId);
        return {
          ...post,
          likes: isLiked 
            ? post.likes.filter(id => id !== currentUserId)
            : [...post.likes, currentUserId]
        };
      }
      return post;
    }));
  };

  const handleComment = (postId: string, text: string) => {
    const newComment = {
      id: `comment_${Date.now()}`,
      userId: currentUserId,
      userName: 'Moi',
      text,
      createdAt: Date.now()
    };

    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    }));
  };

  const handleCreatePost = (postData: any) => {
    if (editingPost) {
      // Mode édition
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === editingPost.id ? {
          ...post,
          photos: postData.photos,
          caption: postData.caption,
          sport: postData.sport,
          location: postData.location
        } : post
      ));
      setEditingPost(null);
    } else {
      // Mode création
      const newPost: SocialPost = {
        id: `post_${Date.now()}`,
        userId: currentUserId,
        userName: 'Moi',
        userLocation: 'La Réunion',
        photos: postData.photos,
        caption: postData.caption,
        likes: [],
        comments: [],
        createdAt: Date.now(),
        sport: postData.sport,
        location: postData.location
      };

      setPosts(prevPosts => [newPost, ...prevPosts]);
    }
    setCreatePostVisible(false);
  };

  const handleEditPost = (postId: string) => {
    const postToEdit = posts.find(post => post.id === postId);
    if (postToEdit) {
      setEditingPost(postToEdit);
      setCreatePostVisible(true);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };


  return (
    <Layout footerButtons={<FooterNavigation currentPage="Home" />} showHomeButton={false}>
      <ScrollView ref={scrollViewRef} className="flex-1">
        {/* Hero section avec photo de La Réunion */}
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3'
          }}
          className="px-4 pt-6 pb-8 mb-4"
          imageStyle={{ borderRadius: 0 }}
        >
          {/* Overlay sombre pour la lisibilité */}
          <View 
            className="absolute inset-0" 
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} 
          />
          
          <View className="items-center relative z-10">
            <Text 
              className="text-5xl font-bold text-white mb-3 text-center"
              style={{ textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 6 }}
            >
              Sentiers 974
            </Text>
            <View className="flex-row items-center px-4 py-2 rounded-full mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <Text 
                className="text-white text-xl font-bold"
                style={{ textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 }}
              >
                🏝️ La Réunion, l'île intense
              </Text>
            </View>
            <Text 
              className="text-white text-center text-xl font-bold"
              style={{ textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 }}
            >
              Sports & Aventures
            </Text>
          </View>
        </ImageBackground>
        
        <View className="px-4 bg-slate-50 flex-1">
          <LocationSection />

          {/* Section Sentiers */}
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => navigation.navigate("Sentiers")}
              className="bg-blue-600 rounded-2xl p-6 mb-4"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold mb-2">
                    🏔️ Découvrir les sentiers
                  </Text>
                  <Text className="text-white opacity-90 text-base">
                    Sentiers officiels de randonnée et parcours VTT
                  </Text>
                  <Text className="text-white opacity-75 text-sm mt-1">
                    Données certifiées IGN • Parc National
                  </Text>
                </View>
                <Text className="text-white text-3xl ml-4">→</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Feed Social */}
          <SocialFeed
            posts={posts}
            currentUserId={currentUserId}
            onLike={handleLike}
            onComment={handleComment}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onRefresh={handleRefresh}
            onCreatePost={() => setCreatePostVisible(true)}
          />

          {/* Espacement final */}
          <View className="h-6" />
        </View>
      </ScrollView>

      {/* Modal pour créer/modifier un post */}
      <CreatePostModal
        visible={createPostVisible}
        onClose={() => {
          setCreatePostVisible(false);
          setEditingPost(null);
        }}
        onSubmit={handleCreatePost}
        editPost={editingPost || undefined}
      />

      {/* Modal pour sélectionner un sport */}
      <Modal
        visible={sportFilterVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSportFilterVisible(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <View style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '90%',
            position: 'relative',
          }}>
            {/* Bouton fermer positionné par-dessus le contenu */}
            <TouchableOpacity 
              onPress={() => setSportFilterVisible(false)} 
              style={{
                position: 'absolute',
                top: 8,
                right: 20,
                zIndex: 10,
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 20,
                padding: 6,
              }}
            >
              <Text style={{ fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
            
            <Filter 
              ref={filterRef}
              onSportSelect={handleSportSelect}
              onCloseFilter={() => {}}
              autoOpen={true}
            />
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

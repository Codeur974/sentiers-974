import { create } from 'zustand';
import { Alert } from 'react-native';
import { SocialPost, CreatePostData } from '../types/social';
import { socialApi } from '../services/socialApi';
import { secureGetItem } from '../utils/secureStorage';

// Posts de démonstration
const mockPosts: SocialPost[] = [
  {
    id: 'post_1',
    userId: 'user_1',
    userName: 'Alex Runners',
    userAvatar: 'https://via.placeholder.com/40',
    userLocation: 'Saint-Denis',
    photos: [
      { id: 'photo_1', uri: 'https://picsum.photos/400/300?random=1' }
    ],
    caption: 'Belle randonnée ce matin dans les hauteurs de Saint-Denis ! 🏔️ #Réunion #Randonnée',
    likes: ['user_2', 'user_3'],
    comments: [
      {
        id: 'comment_1',
        userId: 'user_2',
        userName: 'Marie Trail',
        text: 'Magnifique vue ! 😍',
        createdAt: Date.now() - 3600000
      }
    ],
    createdAt: Date.now() - 7200000,
    sport: 'Randonnée',
    location: 'Saint-Denis, La Réunion'
  }
];

interface SocialState {
  posts: SocialPost[];
  currentUserId: string;
  createPostModalVisible: boolean;
  editingPost: SocialPost | null;
  loading: boolean;
  error: string | null;
}

interface SocialActions {
  loadCurrentUserId: () => Promise<void>;
  loadPosts: () => Promise<void>;
  createPost: (postData: CreatePostData) => Promise<void>;
  updatePost: (postId: string, postData: CreatePostData) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string, photos?: Array<{id: string, uri: string}>) => Promise<void>;
  updateComment: (postId: string, commentId: string, text: string, photos?: Array<{id: string, uri: string}>) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  showCreatePostModal: () => void;
  hideCreatePostModal: () => void;
  setEditingPost: (post: SocialPost | null) => void;
  resetStore: () => void;
}

export const useSocialStore = create<SocialState & SocialActions>()((set, get) => ({
  // État initial
  posts: [],
  currentUserId: 'currentUser',
  createPostModalVisible: false,
  editingPost: null,
  loading: false,
  error: null,

  // Actions
  // 🔑 RÉCUPÉRER LE USERID DEPUIS SECURESTORE
  // Fix: Après migration AsyncStorage → SecureStore (commit 5e5401f6)
  // Le userId doit venir de SecureStore, pas des posts!
  loadCurrentUserId: async () => {
    try {
      const storedUserId = await secureGetItem('userId');
      if (storedUserId) {
        set({ currentUserId: storedUserId });
        console.log('🔑 userId chargé depuis SecureStore:', storedUserId);
      } else {
        console.warn('⚠️ Aucun userId trouvé dans SecureStore');
      }
    } catch (error) {
      console.error('❌ Erreur chargement userId depuis SecureStore:', error);
    }
  },

  loadPosts: async () => {
    try {
      set({ loading: true, error: null });

      // Charger le userId depuis SecureStore AVANT de charger les posts
      await get().loadCurrentUserId();

      const posts = await socialApi.getPosts();
      set({ posts, loading: false });
    } catch (error) {
      console.error('Erreur chargement posts:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  createPost: async (postData: CreatePostData) => {
    try {
      set({ loading: true, error: null });

      // 🔑 IMPORTANT: Recharger le userId depuis SecureStore AVANT de créer le post
      await get().loadCurrentUserId();
      const { currentUserId } = get();

      console.log('📝 Création post avec userId:', currentUserId);

      const newPost = await socialApi.createPost({
        ...postData,
        userId: currentUserId,
        userName: 'Moi',
        userLocation: 'La Réunion'
      });

      set(state => ({
        posts: [newPost, ...state.posts],
        createPostModalVisible: false,
        editingPost: null,
        loading: false
      }));

      // Afficher message de succès
      Alert.alert('✅ Succès', 'Post publié avec succès !');
    } catch (error) {
      console.error('Erreur création post:', error);
      set({ error: (error as Error).message, loading: false });
      Alert.alert('❌ Erreur', 'Impossible de publier le post. Veuillez réessayer.');
    }
  },

  updatePost: async (postId: string, postData: CreatePostData) => {
    try {
      set({ loading: true, error: null });
      const updatedPost = await socialApi.updatePost(postId, postData);

      set(state => ({
        posts: state.posts.map(post =>
          post.id === postId ? updatedPost : post
        ),
        createPostModalVisible: false,
        editingPost: null,
        loading: false
      }));

      // Afficher message de succès
      Alert.alert('✅ Succès', 'Post modifié avec succès !');
    } catch (error) {
      console.error('Erreur modification post:', error);
      set({ error: (error as Error).message, loading: false });
      Alert.alert('❌ Erreur', 'Impossible de modifier le post. Veuillez réessayer.');
    }
  },

  deletePost: async (postId: string) => {
    try {
      set({ loading: true, error: null });
      await socialApi.deletePost(postId);

      set(state => ({
        posts: state.posts.filter(post => post.id !== postId),
        loading: false
      }));

      // Afficher message de succès
      Alert.alert('✅ Succès', 'Post supprimé avec succès !');
    } catch (error) {
      console.error('Erreur suppression post:', error);
      set({ error: (error as Error).message, loading: false });
      Alert.alert('❌ Erreur', 'Impossible de supprimer le post. Veuillez réessayer.');
    }
  },

  likePost: async (postId: string) => {
    try {
      const { currentUserId } = get();
      const result = await socialApi.likePost(postId, currentUserId);

      set(state => ({
        posts: state.posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes: result.liked
                ? [...post.likes, currentUserId]
                : post.likes.filter(id => id !== currentUserId)
            };
          }
          return post;
        })
      }));
    } catch (error) {
      console.error('Erreur like post:', error);
      set({ error: (error as Error).message });
    }
  },

  unlikePost: async (postId: string) => {
    // Même logique que likePost - l'API gère le toggle
    const { likePost } = get();
    await likePost(postId);
  },

  addComment: async (postId: string, text: string, photos?: Array<{id: string, uri: string}>) => {
    try {
      const { currentUserId } = get();
      const newComment = await socialApi.addComment(postId, {
        userId: currentUserId,
        userName: 'Moi',
        text,
        photos: photos || []
      });

      set(state => ({
        posts: state.posts.map(post =>
          post.id === postId
            ? { ...post, comments: [...post.comments, newComment] }
            : post
        )
      }));
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
      set({ error: (error as Error).message });
    }
  },

  updateComment: async (postId: string, commentId: string, text: string, photos?: Array<{id: string, uri: string}>) => {
    try {
      const updatedComment = await socialApi.updateComment(commentId, {
        text,
        photos: photos || []
      });

      set(state => ({
        posts: state.posts.map(post =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.map(comment =>
                  comment.id === commentId ? updatedComment : comment
                )
              }
            : post
        )
      }));
    } catch (error) {
      console.error('Erreur modification commentaire:', error);
      set({ error: (error as Error).message });
    }
  },

  deleteComment: async (postId: string, commentId: string) => {
    try {
      await socialApi.deleteComment(commentId);

      set(state => ({
        posts: state.posts.map(post =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.filter(comment => comment.id !== commentId)
              }
            : post
        )
      }));
    } catch (error) {
      console.error('Erreur suppression commentaire:', error);
      set({ error: (error as Error).message });
    }
  },

  showCreatePostModal: () => set({ createPostModalVisible: true }),
  hideCreatePostModal: () => set({
    createPostModalVisible: false,
    editingPost: null
  }),

  setEditingPost: (post: SocialPost | null) => set({
    editingPost: post,
    createPostModalVisible: !!post
  }),

  resetStore: () => set({
    posts: [],
    currentUserId: 'currentUser',
    createPostModalVisible: false,
    editingPost: null,
    loading: false,
    error: null
  })
}));
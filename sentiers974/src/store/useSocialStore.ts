import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialPost, CreatePostData } from '../types/social';

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
}

interface SocialActions {
  createPost: (postData: CreatePostData) => void;
  updatePost: (postId: string, postData: CreatePostData) => void;
  deletePost: (postId: string) => void;
  likePost: (postId: string) => void;
  unlikePost: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  showCreatePostModal: () => void;
  hideCreatePostModal: () => void;
  setEditingPost: (post: SocialPost | null) => void;
  resetStore: () => void;
}

export const useSocialStore = create<SocialState & SocialActions>()(
  persist(
    (set, get) => ({
  // État initial
  posts: mockPosts,
  currentUserId: 'currentUser',
  createPostModalVisible: false,
  editingPost: null,

  // Actions
  createPost: (postData: CreatePostData) => {
    const { currentUserId, posts } = get();

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

    set({
      posts: [newPost, ...posts],
      createPostModalVisible: false,
      editingPost: null
    });
  },

  updatePost: (postId: string, postData: CreatePostData) => {
    set(state => ({
      posts: state.posts.map(post =>
        post.id === postId ? {
          ...post,
          photos: postData.photos,
          caption: postData.caption,
          sport: postData.sport,
          location: postData.location
        } : post
      ),
      createPostModalVisible: false,
      editingPost: null
    }));
  },

  deletePost: (postId: string) => {
    set(state => ({
      posts: state.posts.filter(post => post.id !== postId)
    }));
  },

  likePost: (postId: string) => {
    const { currentUserId } = get();
    set(state => ({
      posts: state.posts.map(post =>
        post.id === postId
          ? { ...post, likes: [...post.likes, currentUserId] }
          : post
      )
    }));
  },

  unlikePost: (postId: string) => {
    const { currentUserId } = get();
    set(state => ({
      posts: state.posts.map(post =>
        post.id === postId
          ? { ...post, likes: post.likes.filter(id => id !== currentUserId) }
          : post
      )
    }));
  },

  addComment: (postId: string, text: string) => {
    const { currentUserId } = get();
    const newComment = {
      id: `comment_${Date.now()}`,
      userId: currentUserId,
      userName: 'Moi',
      text,
      createdAt: Date.now()
    };

    set(state => ({
      posts: state.posts.map(post =>
        post.id === postId
          ? { ...post, comments: [...post.comments, newComment] }
          : post
      )
    }));
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
    posts: mockPosts,
    currentUserId: 'currentUser',
    createPostModalVisible: false,
    editingPost: null
  }),

  clearCache: () => {
    // Vider le cache AsyncStorage
    import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
      AsyncStorage.removeItem('social-store');
    });
  }
}),
    {
      name: 'social-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        posts: state.posts,
        currentUserId: state.currentUserId
      })
    }
  )
);
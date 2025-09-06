export interface SocialUser {
  id: string;
  name: string;
  avatar?: string;
  location?: string;
}

export interface SocialPhoto {
  id: string;
  uri: string;
  caption?: string;
}

export interface SocialComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: number;
}

export interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userLocation?: string;
  photos: SocialPhoto[];
  caption: string;
  likes: string[]; // Array of user IDs who liked
  comments: SocialComment[];
  createdAt: number;
  sport?: string;
  location?: string;
}

export interface CreatePostData {
  photos: SocialPhoto[];
  caption: string;
  sport?: string;
  location?: string;
}

export interface EditPostData extends CreatePostData {
  id: string;
}
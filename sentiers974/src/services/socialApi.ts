import { SocialPost, CreatePostData } from '../types/social';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.17:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class SocialApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erreur API');
    }

    return data.data as T;
  }

  // Posts
  async getPosts(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    sport?: string;
  }): Promise<SocialPost[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.sport) searchParams.append('sport', params.sport);

    const queryString = searchParams.toString();
    const endpoint = `/posts${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<SocialPost[]>(endpoint);
  }

  async createPost(postData: CreatePostData & {
    userId: string;
    userName: string;
    userAvatar?: string;
    userLocation?: string;
  }): Promise<SocialPost> {
    return this.makeRequest<SocialPost>('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async updatePost(postId: string, postData: Partial<CreatePostData>): Promise<SocialPost> {
    return this.makeRequest<SocialPost>(`/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  }

  async deletePost(postId: string): Promise<void> {
    await this.makeRequest<void>(`/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  async likePost(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    return this.makeRequest<{ liked: boolean; likesCount: number }>(`/posts/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // Comments
  async getComments(postId: string): Promise<any[]> {
    return this.makeRequest<any[]>(`/posts/${postId}/comments`);
  }

  async addComment(postId: string, commentData: {
    userId: string;
    userName: string;
    userAvatar?: string;
    text: string;
    photos?: Array<{id: string, uri: string}>;
  }): Promise<any> {
    return this.makeRequest<any>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
  }

  async updateComment(commentId: string, commentData: {
    text: string;
    photos?: Array<{id: string, uri: string}>;
  }): Promise<any> {
    return this.makeRequest<any>(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(commentData),
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.makeRequest<void>(`/comments/${commentId}`, {
      method: 'DELETE',
    });
  }
}

export const socialApi = new SocialApiService();
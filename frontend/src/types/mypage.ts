export interface UserProfile {
  user_id: number;
  email: string;
  nickname: string;
  bio: string | null;
  profile_image_url: string | null;
}

export interface Restaurant {
  id: number;
  name: string;
  address: string;
  category: string;
  phone: string | null;
  latitude: number;
  longitude: number;
}

export interface Bookmark {
  id: number;
  restaurant: Restaurant;
  restaurant_id?: number;
  created_at: string;
}

export interface UserReview {
  id: number;
  restaurantId: number;
  restaurantName: string;
  content: string;
  rating: number;
  images: string[];
  createdAt: string;
  updatedAt: string | null;
}

export type MyPageTab = 'profile' | 'bookmarks' | 'reviews';
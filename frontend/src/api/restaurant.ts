/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from './client';
import type { FoodCategory, VegetarianLevel } from '../types/common';
import type { Restaurant } from '../types/restaurant';

interface ApiResponse {
  success: boolean;
  count: number;
  data: ApiRestaurant[];
  error?: string;
}

interface ApiRestaurant {
  restaurant_id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  category?: string;
  business_hours?: string;
  data_source?: string;
  closed_days?: string;
  available_levels?: string[];
  rating?: number;
  review_count?: number;
  thumbnailUrl?: string;
  image_urls?: string[];
  created_at?: string;
  updated_at?: string;
}

interface SearchResult {
  success: boolean;
  count: number;
  restaurants: Restaurant[];
  error: string | null;
}

const convertCategory = (dbCategory?: string): FoodCategory => {
  if (!dbCategory) return 'etc';
  const categoryLower = dbCategory.toLowerCase();
  if (['한식', 'korean'].some(k => categoryLower.includes(k))) return 'korean';
  if (['중식', 'chinese'].some(k => categoryLower.includes(k))) return 'chinese';
  if (['일식', 'japanese'].some(k => categoryLower.includes(k))) return 'japanese';
  if (['양식', 'western'].some(k => categoryLower.includes(k))) return 'western';
  if (['카페', 'cafe', 'coffee'].some(k => categoryLower.includes(k))) return 'cafe';
  return 'etc';
};

const convertCategoryToBackend = (category: FoodCategory): string => {
  const map: Record<FoodCategory, string> = {
    korean: '한식',
    chinese: '중식',
    japanese: '일식',
    western: '양식',
    cafe: '카페',
    etc: '기타',
  };
  return map[category] || '기타';
};

const isValidVegetarianLevel = (level: string): level is VegetarianLevel => {
  const validLevels: VegetarianLevel[] = [
    'vegan',
    'lacto',
    'ovo',
    'lacto-ovo',
    'pesco',
    'pollo',
    'flexitarian'
  ];
  return validLevels.includes(level as VegetarianLevel);
};

const convertToVegetarianLevels = (levels?: string[]): VegetarianLevel[] => {
  if (!Array.isArray(levels)) return [];
  return levels
    .filter(level => isValidVegetarianLevel(level))
    .map(level => level as VegetarianLevel);
};

const convertApiRestaurantToRestaurant = (item: ApiRestaurant): Restaurant => {

  // 이 부분 추가
  console.log('API Restaurant Item:', {
    id: item.restaurant_id,
    name: item.name,
    thumbnailurl: item.thumbnailUrl,
    image_urls: item.image_urls
  });
  
  if (!item.restaurant_id || !item.name || !item.address) {
    throw new Error('필수 필드가 누락되었습니다.');
  }
  if (typeof item.restaurant_id !== 'number') {
    throw new Error('잘못된 식당 ID 형식입니다.');
  }

  const latitude = item.latitude || 37.5665;
  const longitude = item.longitude || 126.9780;

  return {
    id: item.restaurant_id,
    name: item.name,
    address: item.address,
    location: {
      lat: latitude,
      lng: longitude,
    },
    phone: item.phone || undefined,
    category: convertCategory(item.category),
    openingHours: item.business_hours || undefined,
    closedDays: [],
    menus: [],
    availableLevels: convertToVegetarianLevels(item.available_levels),
    rating: typeof item.rating === 'number' ? item.rating : undefined,
    reviewCount: typeof item.review_count === 'number' ? item.review_count : 0,
    thumbnailUrl: item.thumbnailUrl || undefined,
    imageUrls: Array.isArray(item.image_urls) ? item.image_urls : [],
    dataSource: item.data_source || undefined,
    createdAt: item.created_at || new Date().toISOString(),
    updatedAt: item.updated_at || new Date().toISOString(),
    isBookmarked: false,
  };
};

export const searchRestaurants = async (
  keyword: string = '',
  categories: FoodCategory[] = []
): Promise<SearchResult> => {
  try {
    const categoryParam = categories.length > 0
      ? categories.map(convertCategoryToBackend).join(',')
      : '';

    const response = await apiClient.get<ApiResponse>('/search', {
      params: {
        keyword: keyword.trim(),
        category: categoryParam,
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || '검색 실패');
    }

    const restaurants: Restaurant[] = [];
    for (const item of response.data.data) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      try {
        const restaurant = convertApiRestaurantToRestaurant(item as ApiRestaurant);
        restaurants.push(restaurant);
      } catch {
        /* noop */
      }
    }

    return {
      success: true,
      count: restaurants.length,
      restaurants,
      error: null,
    };
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error ||
      error.message ||
      '검색 중 오류가 발생했습니다.';

    return {
      success: false,
      count: 0,
      restaurants: [],
      error: errorMessage,
    };
  }
};

export const getAllRestaurants = async () => {
  return searchRestaurants('', []);
};

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
  if (!item.restaurant_id || !item.name || !item.address) { 
    throw new Error('필수 필드가 누락되었습니다.');
  }

  if (typeof item.restaurant_id !== 'number') { 
    throw new Error('잘못된 식당 ID 형식입니다.');
  }

  const latitude = item.latitude || 37.5665;
  const longitude = item.longitude || 126.9780;

  if (latitude < -90 || latitude > 90) {
    console.warn(`⚠️ 유효하지 않은 위도: ${latitude}, 기본값 사용`);
  }

  if (longitude < -180 || longitude > 180) {
    console.warn(`⚠️ 유효하지 않은 경도: ${longitude}, 기본값 사용`);
  }

  return {
    // 🚨 수정: 'restaurant_id'를 UI의 'id'로 매핑
    id: item.restaurant_id, 
    name: item.name,
    address: item.address,
    location: {
      lat: latitude,
      lng: longitude,
    },
    phone: item.phone || undefined,
    category: convertCategory(item.category),
    
    // 🚨 수정: 'business_hours'를 UI의 'openingHours'로 매핑
    openingHours: item.business_hours || undefined, 
    closedDays: [],
    menus: [],
    availableLevels: convertToVegetarianLevels(item.available_levels),
    rating: typeof item.rating === 'number' ? item.rating : undefined,
    reviewCount: typeof item.review_count === 'number' ? item.review_count : 0,
    thumbnailUrl: item.thumbnailUrl || undefined,
    imageUrls: Array.isArray(item.image_urls) ? item.image_urls : [],
    
    // 🚨 수정: 'data_source', 'created_at', 'updated_at' 매핑
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
      ? categories.map(cat => convertCategoryToBackend(cat)).join(',')
      : '';
      
    console.log('🔍 [API] 검색 요청:', { keyword, categories, categoryParam });

    const response = await apiClient.get<ApiResponse>('/search', {
      params: {
        keyword: keyword.trim(),
        category: categoryParam,
      },
    });

    console.log('✅ [API] 응답:', response.data);

    // 🔍 추가: 첫 번째 식당의 원본 데이터 확인
    if (response.data.data.length > 0) {
      console.log('🖼️ 첫 번째 식당 원본 데이터:', response.data.data[0]);
      console.log('🖼️ thumbnail_url 값:', response.data.data[0].thumbnailUrl);
    }

    if (!response.data.success) {
      throw new Error(response.data.error || '검색 실패');
    }

    const restaurants: Restaurant[] = [];
    
    for (const item of response.data.data) {
      if (!item || typeof item !== 'object') {
        console.error('식당 데이터 변환 실패: API 응답 배열에 유효하지 않은 항목(null/undefined)이 포함되어 있습니다. 항목을 건너뜁니다.');
        continue;
      }
      
      try {
        const restaurant = convertApiRestaurantToRestaurant(item as ApiRestaurant);
        // 🔍 추가: 변환 후 thumbnailUrl 확인
        console.log('🖼️ 변환 후:', {
          name: restaurant.name,
          thumbnailUrl: restaurant.thumbnailUrl
        });
        
        restaurants.push(restaurant);
      } catch (error) {
        const itemId = (item as ApiRestaurant).restaurant_id ?? '필드누락';
        console.error(`식당 데이터 변환 실패 (ID: ${itemId}):`, error);
      }
    }

    return {
      success: true,
      count: restaurants.length,
      restaurants,
      error: null,
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[API] 검색 오류:', error);

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
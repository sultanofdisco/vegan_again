import apiClient from './client';
import type { FoodCategory, VegetarianLevel } from '../types/common';
import type { Restaurant } from '../types/restaurant';

interface ApiResponse {
  success: boolean;
  count: number;
  data: ApiRestaurant[];
  error?: string;
}

// 🚨 수정: DB 스키마(snake_case)에 맞게 ApiRestaurant 타입 정의 변경
interface ApiRestaurant {
  restaurant_id: number; // 🚨 id -> restaurant_id로 변경
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  category?: string;
  business_hours?: string; // 🚨 business_hours로 변경 (camelCase -> snake_case)
  data_source?: string;    // 🚨 data_source 추가
  
  // DB 스키마에 없는 필드는 그대로 두거나 API 응답을 확인하여 추가
  closed_days?: string;
  available_levels?: string[];
  rating?: number;
  review_count?: number;
  thumbnail_url?: string;
  image_urls?: string[];

  created_at?: string; // 🚨 created_at로 변경
  updated_at?: string; // 🚨 updated_at로 변경
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

// 🔒 VegetarianLevel 타입 검증 함수
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

// 🔒 string[]을 VegetarianLevel[]로 안전하게 변환
const convertToVegetarianLevels = (levels?: string[]): VegetarianLevel[] => {
  if (!Array.isArray(levels)) return [];
  
  return levels
    .filter(level => isValidVegetarianLevel(level))
    .map(level => level as VegetarianLevel);
};

// 🔒 보안: API 데이터 검증 및 변환 함수
const convertApiRestaurantToRestaurant = (item: ApiRestaurant): Restaurant => {
  // 🚨 수정: 필수 필드 검증을 'restaurant_id'로 변경
  if (!item.restaurant_id || !item.name || !item.address) { 
    throw new Error('필수 필드가 누락되었습니다.');
  }

  // 🚨 수정: 숫자 타입 검증을 'restaurant_id'로 변경
  if (typeof item.restaurant_id !== 'number') { 
    throw new Error('잘못된 식당 ID 형식입니다.');
  }

  // 좌표 검증 (유효 범위 체크)
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
    thumbnailUrl: item.thumbnail_url || undefined,
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
    // ✅ 여러 카테고리를 쉼표로 연결 (예: "한식,일식,양식")
    const categoryParam = categories.length > 0 
      ? categories.map(cat => convertCategoryToBackend(cat)).join(',')
      : '';

    console.log('🔍 [API] 검색 요청:', { keyword, categories, categoryParam });

    const response = await apiClient.get<ApiResponse>('/search', {
      params: {
        keyword: keyword.trim(),
        category: categoryParam, // "한식,일식" 형태로 전송
      },
    });

    console.log('✅ [API] 응답:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.error || '검색 실패');
    }

    // 🔒 보안: 각 데이터 항목을 검증하며 변환
    const restaurants: Restaurant[] = [];
    
    for (const item of response.data.data) {
      // 배열 항목이 유효한 객체인지 확인 (기존 방어 로직)
      if (!item || typeof item !== 'object') {
        console.error('❌ 식당 데이터 변환 실패: API 응답 배열에 유효하지 않은 항목(null/undefined)이 포함되어 있습니다. 항목을 건너뜁니다.');
        continue;
      }
      
      try {
        const restaurant = convertApiRestaurantToRestaurant(item as ApiRestaurant);
        restaurants.push(restaurant);
      } catch (error) {
        // 🚨 개선된 로깅: 이제 item.restaurant_id를 사용합니다.
        const itemId = (item as ApiRestaurant).restaurant_id ?? '필드누락';
        console.error(`❌ 식당 데이터 변환 실패 (ID: ${itemId}):`, error);
      }
    }

    console.log('✅ [API] 변환된 식당 목록:', restaurants);

    return {
      success: true,
      count: restaurants.length,
      restaurants,
      error: null,
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ [API] 검색 오류:', error);

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
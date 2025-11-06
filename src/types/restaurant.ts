// src/types/restaurant.ts
import type { FoodCategory, VegetarianLevel, Location } from "./common";
import type { Menu } from "./menu";

// ============================================
// 📦 DB 스키마 타입 (snake_case)
// ============================================

/** DB restaurants 테이블 스키마 */
export interface RestaurantSchema {
  restaurant_id: number;
  name: string;
  address: string;
  phone: string | null;
  latitude: number;                    // DECIMAL(10, 8)
  longitude: number;                   // DECIMAL(11, 8)
  category: string;                    // VARCHAR(50)
  business_hours: string | null;       // TEXT
  data_source: string | null;          // VARCHAR(100)
  created_at: string;
  updated_at: string;
}

/** DB에 삽입할 식당 데이터 */
export interface RestaurantInsert {
  name: string;
  address: string;
  phone?: string | null;
  latitude: number;
  longitude: number;
  category: string;
  business_hours?: string | null;
  data_source?: string | null;
}

/** DB에서 업데이트할 식당 데이터 */
export interface RestaurantUpdate {
  name?: string;
  address?: string;
  phone?: string | null;
  latitude?: number;
  longitude?: number;
  category?: string;
  business_hours?: string | null;
  data_source?: string | null;
  updated_at?: string;
}

// ============================================
// 🎨 프론트엔드 UI 타입 (camelCase)
// ============================================

/** UI에서 사용하는 식당 타입 */
export interface Restaurant {
  id: number;                          // ✅ string → number
  name: string;
  address: string;
  location: Location;                  // ✅ latitude, longitude를 Location으로 변환
  phone?: string;
  category: FoodCategory;              // ✅ string → FoodCategory
  
  // 영업 시간
  openingHours?: string;               // business_hours → openingHours
  closedDays?: string[];               // ⚠️ ERD에 없음 (파싱 필요)
  
  // 메뉴 정보 (조인 필요)
  menus: Menu[];
  
  // 식당에서 제공하는 채식 단계 (menus에서 계산)
  availableLevels: VegetarianLevel[];
  
  // 평점 및 리뷰 (reviews 테이블에서 계산)
  rating?: number;
  reviewCount: number;
  
  // 이미지 (⚠️ ERD에 없음 - 추후 추가 고려)
  imageUrls?: string[];
  thumbnailUrl?: string;
  
  // 메타 정보
  dataSource?: string;                 // 데이터 출처
  createdAt: string;
  updatedAt: string;
  
  // 즐겨찾기 여부 (bookmarks 테이블에서 확인)
  isBookmarked?: boolean;
}

// ============================================
// 📝 API 요청/응답 타입
// ============================================

/** 식당 목록 조회 필터 */
export interface RestaurantFilter {
  category?: FoodCategory;
  vegetarianLevel?: VegetarianLevel;
  searchText?: string;
  region?: string;
  
  // 지도 범위로 필터링
  bounds?: {
    sw: Location;  // 남서쪽 좌표
    ne: Location;  // 북동쪽 좌표
  };
}

/** 식당 목록 응답 */
export interface RestaurantListResponse {
  restaurants: Restaurant[];
  total: number;
  page?: number;
  pageSize?: number;
}

/** 식당 상세 정보 */
export interface RestaurantDetail extends Restaurant {
  facilities?: string[];
  priceRange?: string;
  websiteUrl?: string;
  instagramUrl?: string;
}

/** 식당 생성 요청 */
export interface CreateRestaurantRequest {
  name: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
  category: FoodCategory;
  businessHours?: string;
  dataSource?: string;
}

// ============================================
// 🔄 타입 변환 유틸리티
// ============================================

/** DB 스키마 → UI 타입 변환 */
export function restaurantSchemaToRestaurant(
  schema: RestaurantSchema,
  menus: Menu[] = [],
  reviewCount: number = 0,
  rating?: number,
  isBookmarked?: boolean
): Restaurant {
  // 메뉴에서 사용 가능한 채식 단계 추출
  const availableLevels = Array.from(
    new Set(
      menus
        .map(m => m.vegetarianLevel)
        .filter((level): level is VegetarianLevel => level !== null)
    )
  );

  // category를 FoodCategory로 매핑
  let category: FoodCategory = 'etc';
  const categoryLower = schema.category?.toLowerCase() || '';
  if (['한식', 'korean'].some(k => categoryLower.includes(k))) category = 'korean';
  else if (['중식', 'chinese'].some(k => categoryLower.includes(k))) category = 'chinese';
  else if (['일식', 'japanese'].some(k => categoryLower.includes(k))) category = 'japanese';
  else if (['양식', 'western'].some(k => categoryLower.includes(k))) category = 'western';
  else if (['카페', 'cafe'].some(k => categoryLower.includes(k))) category = 'cafe';
  else if (['디저트', 'dessert'].some(k => categoryLower.includes(k))) category = 'dessert';

  return {
    id: schema.restaurant_id,
    name: schema.name,
    address: schema.address,
    location: {
      lat: schema.latitude,
      lng: schema.longitude,
    },
    phone: schema.phone || undefined,
    category,
    openingHours: schema.business_hours || undefined,
    menus,
    availableLevels,
    rating,
    reviewCount,
    dataSource: schema.data_source || undefined,
    createdAt: schema.created_at,
    updatedAt: schema.updated_at,
    isBookmarked,
  };
}

/** UI 타입 → DB Insert 변환 */
export function restaurantToInsert(restaurant: CreateRestaurantRequest): RestaurantInsert {
  return {
    name: restaurant.name,
    address: restaurant.address,
    phone: restaurant.phone || null,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    category: restaurant.category,
    business_hours: restaurant.businessHours || null,
    data_source: restaurant.dataSource || null,
  };
}

/** UI 타입 → DB Update 변환 */
export function restaurantToUpdate(restaurant: Partial<CreateRestaurantRequest>): RestaurantUpdate {
  const update: RestaurantUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (restaurant.name !== undefined) update.name = restaurant.name;
  if (restaurant.address !== undefined) update.address = restaurant.address;
  if (restaurant.phone !== undefined) update.phone = restaurant.phone || null;
  if (restaurant.latitude !== undefined) update.latitude = restaurant.latitude;
  if (restaurant.longitude !== undefined) update.longitude = restaurant.longitude;
  if (restaurant.category !== undefined) update.category = restaurant.category;
  if (restaurant.businessHours !== undefined) update.business_hours = restaurant.businessHours || null;
  if (restaurant.dataSource !== undefined) update.data_source = restaurant.dataSource || null;

  return update;
}

// ============================================
// 🗺️ 카카오맵 API 타입
// ============================================

/** 카카오맵 API에서 받아온 원본 데이터 */
export interface KakaoMapPlaceData {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
  phone?: string;
  x: string;  // 경도 
  y: string;  // 위도 
  place_url?: string;
  category_name?: string;
}

/** 카카오맵 데이터 → RestaurantInsert 변환 */
export function kakaoMapToRestaurantInsert(
  kakaoData: KakaoMapPlaceData,
  category: FoodCategory = 'etc'
): RestaurantInsert {
  return {
    name: kakaoData.place_name,
    address: kakaoData.road_address_name || kakaoData.address_name,
    phone: kakaoData.phone || null,
    latitude: parseFloat(kakaoData.y),
    longitude: parseFloat(kakaoData.x),
    category: category,
    business_hours: null,
    data_source: 'kakao_map',
  };
}

// ============================================
// 📍 위치 관련 유틸리티
// ============================================

/**
 * 두 좌표 사이의 거리 계산 (단위: km)
 * Haversine 공식 사용
 */
export function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 거리를 사람이 읽기 쉬운 형태로 변환
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * 좌표가 bounds 내에 있는지 확인
 */
export function isInBounds(location: Location, bounds: { sw: Location; ne: Location }): boolean {
  return (
    location.lat >= bounds.sw.lat &&
    location.lat <= bounds.ne.lat &&
    location.lng >= bounds.sw.lng &&
    location.lng <= bounds.ne.lng
  );
}
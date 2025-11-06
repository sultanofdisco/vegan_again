import type { FoodCategory, VegetarianLevel, Location } from "./common";
import type { Menu } from "./menu";

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

export interface Restaurant {
  id: number;                          
  name: string;
  address: string;
  location: Location;              
  phone?: string;
  category: FoodCategory;        
  
  openingHours?: string;           
  closedDays?: string[];        
  
  menus: Menu[];
  
  availableLevels: VegetarianLevel[];
  
  rating?: number;
  reviewCount: number;
  
  imageUrls?: string[];
  thumbnailUrl?: string;
  
  dataSource?: string;               
  createdAt: string;
  updatedAt: string;
  
  isBookmarked?: boolean;
}

export interface RestaurantFilter {
  category?: FoodCategory;
  vegetarianLevel?: VegetarianLevel;
  searchText?: string;
  region?: string;
  
  bounds?: {
    sw: Location;  
    ne: Location;  
  };
}

export interface RestaurantListResponse {
  restaurants: Restaurant[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface RestaurantDetail extends Restaurant {
  facilities?: string[];
  priceRange?: string;
  websiteUrl?: string;
  instagramUrl?: string;
}

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
  else if (['기타', 'etc'].some(k => categoryLower.includes(k))) category = 'etc';

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

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export function isInBounds(location: Location, bounds: { sw: Location; ne: Location }): boolean {
  return (
    location.lat >= bounds.sw.lat &&
    location.lat <= bounds.ne.lat &&
    location.lng >= bounds.sw.lng &&
    location.lng <= bounds.ne.lng
  );
}
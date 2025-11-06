import type { FoodCategory, VegetarianLevel, Location } from "./common";
import type { Menu } from "./menu";

// 식당 기본 정보
export interface Restaurant {
  id: string;                          // 식당 고유 ID
  name: string;                        // 식당명
  address: string;                     // 주소
  location: Location;                  // 위도/경도
  phone?: string;                      // 전화번호
  category: FoodCategory;              // 음식 카테고리
  
  // 영업 시간
  openingHours?: string;               // 오픈 시간
  closedDays?: string[];               // 휴무일 
  
  // 메뉴 정보
  menus: Menu[];                       // 메뉴 목록
  
  // 식당에서 제공하는 채식 단계 
  availableLevels: VegetarianLevel[];  
  
  // 평점 및 리뷰
  rating?: number;                     // 평균 평점 (0~5)
  reviewCount: number;                 // 리뷰 개수
  
  // 이미지
  imageUrls?: string[];                // 식당 사진들
  thumbnailUrl?: string;               // 대표 이미지
  
  // 메타 정보
  createdAt: string;                   // 생성일
  updatedAt: string;                   // 수정일
  
  // 즐겨찾기 여부 (클라이언트에서만 사용)
  isBookmarked?: boolean;
}

// 식당 목록 조회 필터
export interface RestaurantFilter {
  category?: FoodCategory;             // 음식 카테고리 필터
  vegetarianLevel?: VegetarianLevel;   // 채식 단계 필터
  searchText?: string;                 // 검색어
  region?: string;                     // 지역 
  
  // 지도 범위로 필터링 (사용자가 보는 지도 영역)
  bounds?: {
    sw: Location;  // 남서쪽 좌표
    ne: Location;  // 북동쪽 좌표
  };
}

// 식당 목록 응답
export interface RestaurantListResponse {
  restaurants: Restaurant[];
  total: number;                       // 전체 개수
  page?: number;                       // 현재 페이지
  pageSize?: number;                   // 페이지 크기
}

// 식당 상세 정보 (팝업에서 보여줄 때)
export interface RestaurantDetail extends Restaurant {
  // 추가 정보들
  facilities?: string[];               // 편의시설
  priceRange?: string;                 // 가격대
  websiteUrl?: string;                 // 웹사이트 URL
  instagramUrl?: string;               // 인스타그램 URL
}

// 카카오맵 API에서 받아온 원본 데이터 
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
// 채식 단계
export type VegetarianLevel = 
  | 'vegan'              // 비건 
  | 'lacto'              // 락토 베지테리언 
  | 'ovo'                // 오보 베지테리언 
  | 'lacto-ovo'          // 락토-오보 베지테리언
  | 'pesco'              // 페스코 베지테리언
  | 'pollo'              // 폴로 베지테리언
  | 'flexitarian';       // 플렉시테리언 

// 채식 단계 한글 매핑
export const VegetarianLevelKR: Record<VegetarianLevel, string> = {
  vegan: '비건',
  lacto: '락토 베지테리언',
  ovo: '오보 베지테리언',
  'lacto-ovo': '락토-오보 베지테리언',
  pesco: '페스코 베지테리언',
  pollo: '폴로 베지테리언',
  flexitarian: '플렉시테리언',
};

// 채식 단계 설명
export const VegetarianLevelDescription: Record<VegetarianLevel, string> = {
  vegan: '동물성 식품 없음',
  lacto: '유제품 가능',
  ovo: '달걀 가능',
  'lacto-ovo': '유제품, 달걀 가능',
  pesco: '유제품, 달걀, 생선 가능',
  pollo: '유제품, 달걀, 생선, 닭고기 가능',
  flexitarian: '모든 음식 가능 (간헐적 채식)',
};

// 음식 카테고리
export type FoodCategory = 
  | 'korean'     // 한식
  | 'chinese'    // 중식
  | 'japanese'   // 일식
  | 'western'    // 양식
  | 'cafe'       // 카페
  | 'dessert'    // 디저트
  | 'etc';       // 기타

// 음식 카테고리 한글 매핑
export const FoodCategoryKR: Record<FoodCategory, string> = {
  korean: '한식',
  chinese: '중식',
  japanese: '일식',
  western: '양식',
  cafe: '카페',
  dessert: '디저트',
  etc: '기타',
};

// 위치 좌표
export interface Location {
  lat: number;  // 위도
  lng: number;  // 경도
}

// API 응답 공통 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
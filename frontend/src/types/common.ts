// src/types/common.ts

// ============================================
// 🌱 채식 단계 (Vegetarian Levels)
// ============================================

/** ERD ENUM과 일치하는 채식 단계 */
export type VegetarianLevel = 
  | 'vegan'              // 비건 
  | 'lacto'              // 락토 베지테리언 
  | 'ovo'                // 오보 베지테리언 
  | 'lacto-ovo'          // 락토-오보 베지테리언
  | 'pesco'              // 페스코 베지테리언
  | 'pollo'              // 폴로 베지테리언
  | 'flexitarian';       // 플렉시테리언 

/** 채식 단계 한글 라벨 (짧은 버전) */
export const VegetarianLevelLabel: Record<VegetarianLevel, string> = {
  vegan: '비건',
  lacto: '락토',
  ovo: '오보',
  'lacto-ovo': '락토 오보',
  pesco: '페스코',
  pollo: '폴로',
  flexitarian: '플렉시테리언',
};

/** 채식 단계 이모지 */
export const VegetarianLevelEmoji: Record<VegetarianLevel, string> = {
  vegan: '🥬',
  lacto: '🥛',
  ovo: '🥚',
  'lacto-ovo': '🥛🥚',
  pesco: '🐟',
  pollo: '🍗',
  flexitarian: '🍽️',
};

/** 채식 단계 한글 매핑 (전체 이름) */
export const VegetarianLevelKR: Record<VegetarianLevel, string> = {
  vegan: '비건',
  lacto: '락토 베지테리언',
  ovo: '오보 베지테리언',
  'lacto-ovo': '락토 오보 베지테리언',
  pesco: '페스코 베지테리언',
  pollo: '폴로 베지테리언',
  flexitarian: '플렉시테리언',
};

/** 채식 단계 설명 */
export const VegetarianLevelDescription: Record<VegetarianLevel, string> = {
  vegan: '동물성 식품 없음',
  lacto: '유제품 가능',
  ovo: '달걀 가능',
  'lacto-ovo': '유제품, 달걀 가능',
  pesco: '유제품, 달걀, 생선 가능',
  pollo: '유제품, 달걀, 생선, 닭고기 가능',
  flexitarian: '모든 음식 가능 (간헐적 채식)',
};

/** 채식 단계별 허용 식품 아이콘 */
export const VegetarianLevelIcons: Record<VegetarianLevel, string[]> = {
  vegan: ['🥬'],
  lacto: ['🥬', '🥛'],
  ovo: ['🥬', '🥚'],
  'lacto-ovo': ['🥬', '🥛', '🥚'],
  pesco: ['🥬', '🥛', '🥚', '🐟'],
  pollo: ['🥬', '🥛', '🥚', '🐟', '🍗'],
  flexitarian: ['🥬', '🥛', '🥚', '🐟', '🍗', '🥩'],
};

// ============================================
// 🍽️ 음식 카테고리 (Food Categories)
// ============================================

/** 음식 카테고리 */
export type FoodCategory = 
  | 'korean'     // 한식
  | 'chinese'    // 중식
  | 'japanese'   // 일식
  | 'western'    // 양식
  | 'cafe'       // 카페
  | 'dessert'    // 디저트
  | 'etc';       // 기타

/** 음식 카테고리 한글 매핑 */
export const FoodCategoryKR: Record<FoodCategory, string> = {
  korean: '한식',
  chinese: '중식',
  japanese: '일식',
  western: '양식',
  cafe: '카페',
  dessert: '디저트',
  etc: '기타',
};

/** 음식 카테고리 이모지 */
export const FoodCategoryEmoji: Record<FoodCategory, string> = {
  korean: '🍚',
  chinese: '🥟',
  japanese: '🍱',
  western: '🍝',
  cafe: '☕',
  dessert: '🍰',
  etc: '🍽️',
};

// ============================================
// 📍 위치 (Location)
// ============================================

/** 위치 좌표 */
export interface Location {
  lat: number;  // 위도
  lng: number;  // 경도
}

// ============================================
// 🔄 API 응답 (API Response)
// ============================================

/** API 응답 공통 타입 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 페이지네이션 메타데이터 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** 페이지네이션이 포함된 API 응답 */
export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  meta?: PaginationMeta;
}

// ============================================
// 🎨 UI 유틸리티 함수
// ============================================

/**
 * 채식 단계의 전체 표시 문자열 생성
 * @example getVegetarianLevelDisplay('vegan') => '🥬 비건'
 */
export function getVegetarianLevelDisplay(level: VegetarianLevel): string {
  return `${VegetarianLevelEmoji[level]} ${VegetarianLevelLabel[level]}`;
}

/**
 * 채식 단계의 상세 정보 생성
 * @example getVegetarianLevelInfo('lacto') => '🥛 락토 베지테리언 - 유제품 가능'
 */
export function getVegetarianLevelInfo(level: VegetarianLevel): string {
  return `${VegetarianLevelEmoji[level]} ${VegetarianLevelKR[level]} - ${VegetarianLevelDescription[level]}`;
}

/**
 * 음식 카테고리의 전체 표시 문자열 생성
 * @example getFoodCategoryDisplay('korean') => '🍚 한식'
 */
export function getFoodCategoryDisplay(category: FoodCategory): string {
  return `${FoodCategoryEmoji[category]} ${FoodCategoryKR[category]}`;
}

/**
 * 신뢰도 점수를 퍼센트로 변환
 * @param score 0~1 사이의 신뢰도 점수
 * @returns 0~100 사이의 정수
 */
export function confidenceToPercent(score: number | null | undefined): number {
  if (score === null || score === undefined) return 0;
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

/**
 * 신뢰도에 따른 색상 클래스 반환
 * @param score 0~1 사이의 신뢰도 점수
 * @returns 'high' | 'medium' | 'low'
 */
export function getConfidenceLevel(score: number | null | undefined): 'high' | 'medium' | 'low' {
  if (score === null || score === undefined) return 'low';
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}
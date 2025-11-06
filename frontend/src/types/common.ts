export type VegetarianLevel = 
  | 'vegan'              // 비건 
  | 'lacto'              // 락토 베지테리언 
  | 'ovo'                // 오보 베지테리언 
  | 'lacto-ovo'          // 락토-오보 베지테리언
  | 'pesco'              // 페스코 베지테리언
  | 'pollo'              // 폴로 베지테리언
  | 'flexitarian'        // 플렉시테리언
  | 'others';            // 기타 ← 추가

/** 채식 단계 한글 라벨 */
export const VegetarianLevelLabel: Record<VegetarianLevel, string> = {
  vegan: '비건',
  lacto: '락토',
  ovo: '오보',
  'lacto-ovo': '락토 오보',
  pesco: '페스코',
  pollo: '폴로',
  flexitarian: '플렉시테리언',
  others: '기타',  // ← 추가
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
  others: '🥄',  // ← 추가
};

/** 채식 단계 한글 매핑 */
export const VegetarianLevelKR: Record<VegetarianLevel, string> = {
  vegan: '비건',
  lacto: '락토 베지테리언',
  ovo: '오보 베지테리언',
  'lacto-ovo': '락토 오보 베지테리언',
  pesco: '페스코 베지테리언',
  pollo: '폴로 베지테리언',
  flexitarian: '플렉시테리언',
  others: '기타',  // ← 추가
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
  others: '분류되지 않은 메뉴',  // ← 추가
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
  others: ['🥄'],  // ← 추가
};

/** 음식 카테고리 */
export type FoodCategory = 
  | 'korean'     // 한식
  | 'chinese'    // 중식
  | 'japanese'   // 일식
  | 'western'    // 양식
  | 'cafe'       // 카페
  | 'etc';       // 기타

/** 음식 카테고리 한글 매핑 */
export const FoodCategoryKR: Record<FoodCategory, string> = {
  korean: '한식',
  chinese: '중식',
  japanese: '일식',
  western: '양식',
  cafe: '카페',
  etc: '기타',
};

/** 음식 카테고리 이모지 */
export const FoodCategoryEmoji: Record<FoodCategory, string> = {
  korean: '🍚',
  chinese: '🥟',
  japanese: '🍱',
  western: '🍝',
  cafe: '☕',
  etc: '🍽️',
};

/** 위치 좌표 */
export interface Location {
  lat: number;  // 위도
  lng: number;  // 경도
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  meta?: PaginationMeta;
}

export function getVegetarianLevelDisplay(level: VegetarianLevel): string {
  return `${VegetarianLevelEmoji[level]} ${VegetarianLevelLabel[level]}`;
}

export function getVegetarianLevelInfo(level: VegetarianLevel): string {
  return `${VegetarianLevelEmoji[level]} ${VegetarianLevelKR[level]} - ${VegetarianLevelDescription[level]}`;
}

export function getFoodCategoryDisplay(category: FoodCategory): string {
  return `${FoodCategoryEmoji[category]} ${FoodCategoryKR[category]}`;
}

export function confidenceToPercent(score: number | null | undefined): number {
  if (score === null || score === undefined) return 0;
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

export function getConfidenceLevel(score: number | null | undefined): 'high' | 'medium' | 'low' {
  if (score === null || score === undefined) return 'low';
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}
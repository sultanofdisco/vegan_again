// src/types/menu.ts
import type { VegetarianLevel } from "./common";

/** DB menus 테이블 스키마 */
export interface MenuSchema {
  menu_id: number;
  restaurant_id: number;
  menu_name: string;
  price: number | null;
  vegetarian_level: VegetarianLevel | null;  // ENUM
  confidence_score: number | null;           // DECIMAL(3,2)
  ingredients: string | null;                // TEXT
  analyzed_at: string | null;                // TIMESTAMP
  created_at: string;
  updated_at: string;
}

/** DB에 삽입할 메뉴 데이터 */
export interface MenuInsert {
  restaurant_id: number;
  menu_name: string;
  price?: number | null;
  vegetarian_level?: VegetarianLevel | null;
  confidence_score?: number | null;
  ingredients?: string | null;
}

/** DB에서 업데이트할 메뉴 데이터 */
export interface MenuUpdate {
  menu_name?: string;
  price?: number | null;
  vegetarian_level?: VegetarianLevel | null;
  confidence_score?: number | null;
  ingredients?: string | null;
  analyzed_at?: string;
  updated_at?: string;
}

// ============================================
// 🎨 프론트엔드 UI 타입 (camelCase)
// ============================================

/** UI에서 사용하는 메뉴 타입 */
export interface Menu {
  id: number;                              // ✅ string → number
  name: string;
  price: number | null;
  description?: string;                    // ingredients를 description으로 매핑
  imageUrl?: string;                       // ⚠️ ERD에 없음 (나중에 추가 고려)
  
  // AI가 분석한 채식 단계 (단일)
  vegetarianLevel: VegetarianLevel | null;  // ✅ 배열 → 단일
  confidenceScore: number | null;           // ✅ 신뢰도 점수 (0~1)
  analyzedAt: string | null;                // ✅ 분석 시간
  
  // 알레르기 정보 (있으면) - 나중에 추가
  allergyInfo?: string[];
}

// ✅ 기존 타입 (호환성 유지)
export interface VegetarianLevelProbability {
  level: VegetarianLevel;
  probability: number;     // 0~100
  reason?: string;
}

// ============================================
// 📝 API 요청/응답 타입
// ============================================

/** 메뉴 생성 요청 */
export interface CreateMenuRequest {
  restaurantId: number;                    // ✅ string → number
  name: string;
  price?: number;
  ingredients?: string;                    // ✅ description → ingredients
  vegetarianLevel?: VegetarianLevel;
  confidenceScore?: number;
}

/** 메뉴 수정 요청 */
export interface UpdateMenuRequest {
  name?: string;
  price?: number;
  ingredients?: string;
  vegetarianLevel?: VegetarianLevel;
  confidenceScore?: number;
}

// ============================================
// 🔄 타입 변환 유틸리티
// ============================================

/** DB 스키마 → UI 타입 변환 */
export function menuSchemaToMenu(schema: MenuSchema): Menu {
  return {
    id: schema.menu_id,
    name: schema.menu_name,
    price: schema.price,
    description: schema.ingredients || undefined,
    vegetarianLevel: schema.vegetarian_level,
    confidenceScore: schema.confidence_score,
    analyzedAt: schema.analyzed_at,
  };
}

/** UI 타입 → DB Insert 변환 */
export function menuToInsert(menu: CreateMenuRequest): MenuInsert {
  return {
    restaurant_id: menu.restaurantId,
    menu_name: menu.name,
    price: menu.price,
    vegetarian_level: menu.vegetarianLevel || null,
    confidence_score: menu.confidenceScore || null,
    ingredients: menu.ingredients || null,
  };
}

/** UI 타입 → DB Update 변환 */
export function menuToUpdate(menu: UpdateMenuRequest): MenuUpdate {
  const update: MenuUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (menu.name !== undefined) {
    update.menu_name = menu.name;
  }
  if (menu.price !== undefined) {
    update.price = menu.price;
  }
  if (menu.vegetarianLevel !== undefined) {
    update.vegetarian_level = menu.vegetarianLevel;
  }
  if (menu.confidenceScore !== undefined) {
    update.confidence_score = menu.confidenceScore;
  }
  if (menu.ingredients !== undefined) {
    update.ingredients = menu.ingredients;
  }

  return update;
}

/** 
 * 기존 vegetarianLevels 배열 형식으로 변환 
 * (기존 코드 호환성 유지용)
 */
export function menuToLegacyFormat(menu: Menu): Menu & { vegetarianLevels: VegetarianLevelProbability[] } {
  const vegetarianLevels: VegetarianLevelProbability[] = [];
  
  if (menu.vegetarianLevel && menu.confidenceScore !== null) {
    vegetarianLevels.push({
      level: menu.vegetarianLevel,
      probability: Math.round(menu.confidenceScore * 100), // 0~1 → 0~100
    });
  }

  return {
    ...menu,
    vegetarianLevels,
  };
}
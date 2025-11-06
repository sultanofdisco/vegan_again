import type { VegetarianLevel } from "./common";

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
  description: string | null;
}

export interface MenuInsert {
  restaurant_id: number;
  menu_name: string;
  price?: number | null;
  vegetarian_level?: VegetarianLevel | null;
  confidence_score?: number | null;
  ingredients?: string | null;
  description?: string | null;
}

export interface MenuUpdate {
  menu_name?: string;
  price?: number | null;
  vegetarian_level?: VegetarianLevel | null;
  confidence_score?: number | null;
  ingredients?: string | null;
  analyzed_at?: string;
  updated_at?: string;
  description?: string | null;
}

export interface Menu {
  id: number;                            
  name: string;
  price: number | null;
  description?: string;                   
  imageUrl?: string;                      
  
  vegetarianLevel: VegetarianLevel | null;  
  confidenceScore: number | null;          
  analyzedAt: string | null;           
  
  // 알레르기 정보 나중에 추가
  allergyInfo?: string[];
}

export interface VegetarianLevelProbability {
  level: VegetarianLevel;
  probability: number;     
  reason?: string;
}

export interface CreateMenuRequest {
  restaurantId: number;                   
  name: string;
  price?: number;
  ingredients?: string;
  description?: string;
  vegetarianLevel?: VegetarianLevel;
  confidenceScore?: number;
}

export interface UpdateMenuRequest {
  name?: string;
  price?: number;
  ingredients?: string;
  description?: string;
  vegetarianLevel?: VegetarianLevel;
  confidenceScore?: number;
}

export function menuSchemaToMenu(schema: MenuSchema): Menu {
  return {
    id: schema.menu_id,
    name: schema.menu_name,
    price: schema.price,
    description: schema.description || undefined,
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
    description: menu.description || null,
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
  if (menu.description !== undefined) {
    update.description = menu.description;
  }

  return update;
}

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
import type { VegetarianLevel } from "./common";

// 메뉴 아이템
export interface Menu {
  id: string;                           // 메뉴 고유 ID
  name: string;                         // 메뉴명
  price: number | null;                 // 가격 (없으면 null)
  description?: string;                 // 메뉴 설명
  imageUrl?: string;                    // 메뉴 이미지 URL
  
  // AI가 분석한 채식 단계
  vegetarianLevels: VegetarianLevelProbability[];
  
  // 알레르기 정보 (있으면)
  allergyInfo?: string[];
}

// AI가 예측한 채식 단계 확률
export interface VegetarianLevelProbability {
  level: VegetarianLevel;  // 채식 단계
  probability: number;     // 확률 (0~100)
  reason?: string;         // AI 판단 근거
}

// 메뉴 생성 요청 (백엔드로 보낼 때)
export interface CreateMenuRequest {
  restaurantId: string;
  name: string;
  price?: number;
  description?: string;
  imageUrl?: string;
}
import type { VegetarianLevel } from "./common";

// 유저 프로필
export interface UserProfile {
  id: string;                    // 유저 ID
  email: string;                 // 이메일
  nickname?: string;             // 닉네임
  profileImage?: string;         // 프로필 이미지
  introduction?: string;         // 소개글
  
  // 선호하는 채식 단계 (선택사항)
  preferredLevel?: VegetarianLevel;
  
  // 통계
  reviewCount?: number;          // 작성한 리뷰 수
  bookmarkCount?: number;        // 즐겨찾기 수
  
  createdAt: string;             // 가입일
}

// 프로필 수정 요청
export interface UpdateProfileRequest {
  nickname?: string;
  introduction?: string;
  preferredLevel?: VegetarianLevel;
  profileImage?: File;
}
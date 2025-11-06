// src/types/user.ts
import type { VegetarianLevel } from "./common";

// 유저 프로필
export interface UserProfile {
  id: string;                          // user_id (Primary Key, INT이지만 string으로 처리)
  email: string;                       // email (VARCHAR(255))
  password_hash?: string;              // password_hash (VARCHAR(255)) - 보통 프론트에선 안 씀
  nickname: string;                    // nickname (VARCHAR(50))
  profile_image_url?: string | null;   // profile_image_url (TEXT)
  bio?: string | null;                 // bio (VARCHAR(500))
  oauth_provider?: 'google' | 'kakao' | 'self' | null;  // oauth_provider (ENUM)
  oauth_id?: string | null;            // oauth_id (VARCHAR(255))
  created_at: string;                  // created_at (TIMESTAMP)
  updated_at: string;                  // updated_at (TIMESTAMP)
  
  // 추가 필드 (프론트엔드에서 계산/조회)
  preferredLevel?: VegetarianLevel;    // 선호하는 채식 단계 (별도 테이블이나 계산)
  reviewCount?: number;                // 작성한 리뷰 수 (집계)
  bookmarkCount?: number;              // 즐겨찾기 수 (집계)
}

// Supabase에서 받아오는 원본 데이터 타입
export interface UserFromDB {
  user_id: number;                     // DB는 INT
  email: string;
  password_hash: string;
  nickname: string;
  profile_image_url: string | null;
  bio: string | null;
  oauth_provider: 'google' | 'kakao' | 'self' | null;
  oauth_id: string | null;
  created_at: string;
  updated_at: string;
}

// DB 데이터를 프론트엔드 타입으로 변환
export function mapUserFromDB(dbUser: UserFromDB): UserProfile {
  return {
    id: String(dbUser.user_id),        // INT를 string으로 변환
    email: dbUser.email,
    nickname: dbUser.nickname,
    profile_image_url: dbUser.profile_image_url ?? undefined,
    bio: dbUser.bio ?? undefined,
    oauth_provider: dbUser.oauth_provider ?? undefined,
    oauth_id: dbUser.oauth_id ?? undefined,
    created_at: dbUser.created_at,
    updated_at: dbUser.updated_at,
  };
}

// 프로필 수정 요청
export interface UpdateProfileRequest {
  nickname?: string;                   // VARCHAR(50)
  bio?: string;                        // VARCHAR(500)
  preferredLevel?: VegetarianLevel;    // 별도 처리
  profileImage?: File;                 // 이미지 파일 업로드
}

// Supabase에 보낼 업데이트 데이터
export interface UpdateProfileDB {
  nickname?: string;
  bio?: string;
  profile_image_url?: string;
  updated_at?: string;                 // 자동으로 현재 시간
}
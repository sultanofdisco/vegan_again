import type { VegetarianLevel } from "./common";

// 유저 프로필
export interface UserProfile {
  id: string;                       
  email: string;                    
  password_hash?: string;            
  nickname: string;                
  profile_image_url?: string | null; 
  bio?: string | null;            
  oauth_provider?: 'google' | 'kakao' | 'self' | null; 
  oauth_id?: string | null;        
  created_at: string;           
  updated_at: string;            
  
  preferredLevel?: VegetarianLevel;    
  reviewCount?: number;          
  bookmarkCount?: number;        
}

export interface UserFromDB {
  user_id: number;                 
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

export function mapUserFromDB(dbUser: UserFromDB): UserProfile {
  return {
    id: String(dbUser.user_id),     
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

export interface UpdateProfileRequest {
  nickname?: string;                  
  bio?: string;                      
  preferredLevel?: VegetarianLevel;    
  profileImage?: File;               
}

export interface UpdateProfileDB {
  nickname?: string;
  bio?: string;
  profile_image_url?: string;
  updated_at?: string;                
}
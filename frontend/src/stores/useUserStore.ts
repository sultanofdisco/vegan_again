// 백엔드 사용자 타입 정의
export interface BackendUser {
  user_id: number;
  email: string;
  nickname: string;
  profile_image_url?: string | null;
  bio?: string | null;
  oauth_provider: string;
}

import { create } from 'zustand';

// 상태 타입 정의
interface UserState {
  user: BackendUser | null; // 로그인한 유저 정보 (없으면 null)
  setUser: (user: BackendUser | null) => void; // 유저 정보 넣는 함수
}

// Zustand 스토어 생성
export const useUserStore = create<UserState>((set) => ({
  user: null,       // 앱 시작 시엔 로그인 안 된 상태

  // set 함수는 Zustand가 제공하는 함수로, 상태를 업데이트
  // 'setUser'는 사용자 정보를 변경할 때 사용
  setUser: (user) => set({ user: user }),
}));

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

{/* 상태 타입 정의 */}
interface UserState {
  user: User | null; // 로그인한 유저 정보 (없으면 null)
  isLoading: boolean; // 유저 정보 로딩 중인지 여부
  setUser: (user: User | null) => void; // 유저 정보 넣는 함수
  setIsLoading: (loading: boolean) => void; // 로딩 상태 업데이트 함수
}

{/* Zustand 스토어 생성 */}
export const useUserStore = create<UserState>((set) => ({
  user: null,       // 앱 시작 시엔 로그인 안 된 상태
  isLoading: true,  // 앱 시작 시엔 로딩 중 (유저 정보 확인 전)

  // set 함수는 Zustand가 제공하는 함수로, 상태를 업데이트
  // 'setUser'는 사용자 정보를 변경할 때 사용
  setUser: (user) => set({ user: user }),

  // 'setIsLoading'는 로딩 상태를 변경할 때 사용
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
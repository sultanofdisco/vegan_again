export interface BackendUser {
  user_id: number;
  email: string;
  nickname: string;
  profile_image_url?: string | null;
  bio?: string | null;
  oauth_provider: string;
}

import { create } from 'zustand';
import type { UserProfile } from '../types/user';

interface UserState {
  user: BackendUser | null;
  setUser: (user: BackendUser | null) => void;
}
interface backendUserState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export const usebackUserStore = create<backendUserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface UserState {
  user: User | null; 
  isLoading: boolean; 
  setUser: (user: User | null) => void; 
  setIsLoading: (loading: boolean) => void; 
}

export const useUserStore = create<UserState>((set) => ({
  user: null,      
  isLoading: true,  

  setUser: (user) => set({ user: user }),

  setIsLoading: (loading) => set({ isLoading: loading }),
}));
import { create } from 'zustand';
import type { FoodCategory } from '../types/common';

interface SearchState {
  searchText: string;
  categories: FoodCategory[]; // 배열로 변경
  
  setSearchText: (text: string) => void;
  toggleCategory: (category: FoodCategory) => void; // 토글 방식으로 변경
  resetFilters: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchText: '',
  categories: [], // 빈 배열로 시작
  
  setSearchText: (text) => set({ searchText: text }),
  
  // 카테고리 토글 (선택/해제)
  toggleCategory: (category) => set((state) => {
    if (state.categories.includes(category)) {
      // 이미 선택된 경우 제거
      return { categories: state.categories.filter(c => c !== category) };
    } else {
      // 선택되지 않은 경우 추가
      return { categories: [...state.categories, category] };
    }
  }),
  
  resetFilters: () => set({ 
    searchText: '', 
    categories: []
  }),
}));
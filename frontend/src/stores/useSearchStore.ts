import { create } from 'zustand';
import type { FoodCategory } from '../types/common';

interface SearchState {
  searchText: string;
  categories: FoodCategory[]; 
  
  setSearchText: (text: string) => void;
  toggleCategory: (category: FoodCategory) => void; 
  resetFilters: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchText: '',
  categories: [], 
  
  setSearchText: (text) => set({ searchText: text }),
  
  toggleCategory: (category) => set((state) => {
    if (state.categories.includes(category)) {
      return { categories: state.categories.filter(c => c !== category) };
    } else {
      return { categories: [...state.categories, category] };
    }
  }),
  
  resetFilters: () => set({ 
    searchText: '', 
    categories: []
  }),
}));
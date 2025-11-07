import { useState, useEffect, useCallback } from 'react';
import { searchRestaurants } from '../api/restaurant';
import type { Restaurant } from '../types/restaurant';
import type { FoodCategory } from '../types/common';

interface UseRestaurantsReturn {
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRestaurants(
  searchText: string,
  categories: FoodCategory[]
): UseRestaurantsReturn {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await searchRestaurants(searchText, categories);

      if (result.success) {
        setRestaurants(result.restaurants);
      } else {
        setError(result.error || '식당 데이터를 불러오는데 실패했습니다.');
        setRestaurants([]);
      }
    } catch (err) {
      setError('식당 데이터를 불러오는 중 오류가 발생했습니다.');
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [searchText, categories]);

  // 초기 로드 및 검색 조건 변경 시 자동 호출
  useEffect(() => {
    fetchRestaurants();
  }, [searchText, categories.join(',')]); // categories를 문자열로 변환하여 비교

  return {
    restaurants,
    loading,
    error,
    refetch: fetchRestaurants,
  };
}
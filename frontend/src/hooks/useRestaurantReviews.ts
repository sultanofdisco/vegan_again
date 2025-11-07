// src/hooks/useRestaurantReviews.ts
import { useState, useEffect } from 'react';
import apiClient from '../lib/axios';
import type { Review } from '../types/review';
import { parseRestaurantId } from '../utils/restaurantHelpers';

interface UseRestaurantReviewsReturn {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRestaurantReviews(restaurantId: number | string): UseRestaurantReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);

    try {
      const parsedId = parseRestaurantId(restaurantId);
      if (parsedId === null) {
        setReviews([]);
        return;
      }

      const res = await apiClient.get(`/restaurants/${parsedId}/reviews`);

      if (res.data.success && Array.isArray(res.data.data)) {
        setReviews(res.data.data);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('[useRestaurantReviews] Fetch Failed:', err);
      setError('리뷰를 불러오는데 실패했습니다.');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  return {
    reviews,
    loading,
    error,
    refetch: fetchReviews,
  };
}

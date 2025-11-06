import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

      // 리뷰 데이터 가져오기
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('review_id, rating, content, created_at, updated_at, image_url, user_id')
        .eq('restaurant_id', parsedId)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      
      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        return;
      }

      // 유저 정보 가져오기
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, nickname, profile_image_url')
        .in('user_id', userIds);

      if (usersError) {
        console.warn('[useRestaurantReviews] Users Fetch Warning:', usersError);
      }

      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, u])
      );

      // 리뷰 데이터 포맷팅
      const formattedReviews: Review[] = reviewsData.map((review): Review => {
        const user = usersMap.get(review.user_id);
        return {
          id: review.review_id,
          content: review.content,
          rating: review.rating || 0,
          createdAt: review.created_at,
          updatedAt: review.updated_at,
          userName: user?.nickname || '익명',
          userProfileImage: user?.profile_image_url || null,
          images: review.image_url ? [review.image_url] : [],
        };
      });

      setReviews(formattedReviews);
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
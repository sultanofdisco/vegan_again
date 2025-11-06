/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/axios';
import type { UserReview } from '../types/mypage';

interface UseUserReviewsReturn {
  reviews: UserReview[];
  loading: boolean;
  error: string | null;
  deleteReview: (reviewId: number) => Promise<boolean>;
  updateReview: (reviewId: number, content: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useUserReviews(userId: string | null): UseUserReviewsReturn {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async (): Promise<UserReview[]> => {
    if (!userId) return [];

    try {
      const response = await apiClient.get('/users/reviews');
      
      if (response.data.success && response.data.data) {
        const reviewsData = response.data.data.reviews || [];
        return reviewsData.map((item: any) => ({
          id: item.id,
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          content: item.content,
          rating: item.rating,
          images: item.images || [],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt || null,
        }));
      }
      
      return [];
    } catch (err: any) {
      // 401 에러는 상위에서 처리
      if (err.response?.status === 401) {
        throw err;
      }
      console.error('[useUserReviews] Fetch Failed:', err);
      return [];
    }
  }, [userId]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchReviews();
      setReviews(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw err; // 상위로 전파
      }
      setError('리뷰를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [fetchReviews]);

  const deleteReview = async (reviewId: number): Promise<boolean> => {
    if (!userId) return false;

    try {
      const response = await apiClient.delete(`/reviews/${reviewId}`);
      
      if (response.data.success) {
        // 리뷰 목록 새로고침
        const updatedReviews = await fetchReviews();
        setReviews(updatedReviews);
        return true;
      }
      
      throw new Error(response.data.error || '리뷰 삭제 실패');
    } catch (err: any) {
      console.error('[useUserReviews] Delete Failed:', err);
      
      if (err.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      if (err.response?.status === 403) {
        throw new Error('본인의 리뷰만 삭제할 수 있습니다.');
      }
      
      throw new Error('리뷰 삭제에 실패했습니다.');
    }
  };

  const updateReview = async (reviewId: number, content: string): Promise<boolean> => {
    if (!userId) return false;

    // 검증
    if (!content || content.trim().length === 0) {
      throw new Error('리뷰 내용을 입력해주세요.');
    }
    if (content.length > 2000) {
      throw new Error('리뷰는 최대 2000자까지 입력 가능합니다.');
    }

    try {
      const response = await apiClient.put(`/reviews/${reviewId}`, {
        content: content,
      });
      
      if (response.data.success) {
        // 리뷰 목록 새로고침
        const updatedReviews = await fetchReviews();
        setReviews(updatedReviews);
        return true;
      }
      
      throw new Error(response.data.error || '리뷰 수정 실패');
    } catch (err: any) {
      console.error('[useUserReviews] Update Failed:', err);
      
      if (err.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      if (err.response?.status === 403) {
        throw new Error('본인의 리뷰만 수정할 수 있습니다.');
      }
      
      throw new Error(err.message || '리뷰 수정에 실패했습니다.');
    }
  };

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  return {
    reviews,
    loading,
    error,
    deleteReview,
    updateReview,
    refetch: loadReviews,
  };
}
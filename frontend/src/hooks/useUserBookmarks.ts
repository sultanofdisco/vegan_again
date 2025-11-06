/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/axios';
import type { Bookmark } from '../types/mypage';

interface UseUserBookmarksReturn {
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  removeBookmark: (bookmarkId: number, restaurantId: number) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useUserBookmarks(userId: string | null): UseUserBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async (): Promise<Bookmark[]> => {
    if (!userId) return [];

    try {
      const response = await apiClient.get('/users/bookmarks');
      
      if (response.data.success && response.data.data) {
        const formattedBookmarks = response.data.data
          .map((item: any) => {
            const restaurant = item.restaurants || item.restaurant;
            const restaurantId = item.restaurant_id;
            
            return {
              id: item.id,
              restaurant: restaurant || null,
              restaurant_id: restaurantId,
              created_at: item.created_at,
            };
          })
          .filter((bookmark: any) => bookmark.restaurant_id && bookmark.restaurant);
        
        return formattedBookmarks;
      }
      
      return [];
    } catch (err) {
      console.error('[useUserBookmarks] Fetch Failed:', err);
      return [];
    }
  }, [userId]);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchBookmarks();
      setBookmarks(data);
    } catch (err) {
      setError('북마크를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [fetchBookmarks]);

  const removeBookmark = async (bookmarkId: number, restaurantId: number): Promise<boolean> => {
    if (!userId) return false;

    try {
      // 북마크 데이터 검증
      const bookmark = bookmarks.find((b) => b.id === bookmarkId);
      if (!bookmark) {
        throw new Error('즐겨찾기를 찾을 수 없습니다.');
      }

      const bookmarkRestaurantId =
        bookmark.restaurant_id ||
        (bookmark.restaurant as any)?.restaurant_id ||
        bookmark.restaurant?.id;

      if (bookmarkRestaurantId !== restaurantId) {
        throw new Error('북마크 데이터가 일치하지 않습니다. 페이지를 새로고침해주세요.');
      }

      // 백엔드 API 호출
      const response = await apiClient.delete(`/users/bookmarks/${restaurantId}`);

      if (response.data.success) {
        // 북마크 목록 새로고침
        try {
          const updatedBookmarks = await fetchBookmarks();
          setBookmarks(updatedBookmarks);
        } catch {
          // 새로고침 실패 시 로컬에서 제거
          setBookmarks((prev) => prev.filter((b) => b.restaurant_id !== restaurantId));
        }
        return true;
      }
      
      throw new Error(response.data.error || '북마크 삭제 실패');
    } catch (err: any) {
      console.error('[useUserBookmarks] Remove Failed:', err);
      const errorMessage = err.response?.data?.error || err.message || '즐겨찾기 해제에 실패했습니다.';
      alert(errorMessage);
      return false;
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  return {
    bookmarks,
    loading,
    error,
    removeBookmark,
    refetch: loadBookmarks,
  };
}
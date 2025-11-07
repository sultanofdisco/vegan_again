/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/axios';
import type { User } from '../types/user';

interface UseRestaurantBookmarkReturn {
  isBookmarked: boolean;
  loading: boolean;
  toggleBookmark: () => Promise<void>;
}

export function useRestaurantBookmark(
  restaurantId: number | string,
  user: User | null
): UseRestaurantBookmarkReturn {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const checkBookmarkStatus = useCallback(async () => {
    if (!user) {
      setIsBookmarked(false);
      setBookmarkId(null);
      return;
    }

    try {
      // /bookmarks → /users/bookmarks 로 변경
      const response = await apiClient.get('/users/bookmarks');
      if (response.data.success && response.data.data) {
        const bookmark = response.data.data.find(
          (item: any) => {
            const restaurantIdFromItem =
              item.restaurant_id ||
              (item.restaurants && item.restaurants.id) ||
              (item.restaurant && item.restaurant.id);
            return restaurantIdFromItem === restaurantId;
          }
        );

        if (bookmark) {
          setIsBookmarked(true);
          setBookmarkId(bookmark.id);
        } else {
          setIsBookmarked(false);
          setBookmarkId(null);
        }
      } else {
        setIsBookmarked(false);
        setBookmarkId(null);
      }
    } catch (error) {
      setIsBookmarked(false);
      setBookmarkId(null);
    }
  }, [user, restaurantId]);

  const addBookmark = async () => {
    try {
      // /bookmarks/${restaurantId} → /users/bookmarks/${restaurantId} 로 변경
      const response = await apiClient.post(`/users/bookmarks/${restaurantId}`);
      if (response.data.success) {
        setIsBookmarked(true);
        await checkBookmarkStatus();
        alert('찜 목록에 추가되었습니다!');
      } else {
        throw new Error(response.data.error || '북마크 추가 실패');
      }
    } catch (error: any) {
      if (error.response?.status === 409 || error.response?.status === 400) {
        alert('이미 즐겨찾기한 식당입니다.');
        await checkBookmarkStatus();
      } else {
        alert('찜하기에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const removeBookmark = async () => {
    try {
      // /bookmarks/${restaurantId} → /users/bookmarks/${restaurantId} 로 변경
      const response = await apiClient.delete(`/users/bookmarks/${restaurantId}`);
      if (response.data.success) {
        setIsBookmarked(false);
        setBookmarkId(null);
        alert('찜 해제되었습니다.');
      } else {
        throw new Error(response.data.error || '북마크 삭제 실패');
      }
    } catch (error) {
      alert('찜 해제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const toggleBookmark = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isBookmarked) {
        await removeBookmark();
      } else {
        await addBookmark();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBookmarkStatus();
  }, [checkBookmarkStatus]);

  return {
    isBookmarked,
    loading,
    toggleBookmark,
  };
}
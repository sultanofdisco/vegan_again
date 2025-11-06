import { useState, useEffect } from 'react';
import { addBookmark, removeBookmark, checkBookmarkStatus } from '../api/bookmark';
import { useUserStore } from '../stores/useUserStore';

export function useRestaurantBookmark(restaurantId: number | string) {
  const user = useUserStore((state) => state.user);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkBookmark = async () => {
    if (!user) return;
    
    try {
      const status = await checkBookmarkStatus(restaurantId);
      setIsBookmarked(status);
    } catch (error) {
      console.error('[Check Bookmark Failed]:', error);
    }
  };

  const handleAddBookmark = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      const result = await addBookmark(restaurantId);
      
      if (result.success) {
        setIsBookmarked(true);
        alert('찜 목록에 추가되었습니다!');
      } else {
        alert(result.error || '찜하기에 실패했습니다.');
      }
    } catch (error) {
      console.error('[Add Bookmark Failed]:', error);
      alert('찜하기에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await removeBookmark(restaurantId);
      
      if (result.success) {
        setIsBookmarked(false);
        alert('찜 해제되었습니다.');
      } else {
        alert(result.error || '찜 해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('[Remove Bookmark Failed]:', error);
      alert('찜 해제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = () => {
    if (loading) return;
    if (isBookmarked) {
      handleRemoveBookmark();
    } else {
      handleAddBookmark();
    }
  };

  useEffect(() => {
    if (user) {
      checkBookmark();
    }
  }, [restaurantId, user]);

  return {
    isBookmarked,
    loading,
    toggleBookmark,
  };
}
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../stores/useUserStore';
import type { Review } from '../types/review';

export function useRestaurantReviews(restaurantId: number | string) {
  const user = useUserStore((state) => state.user);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      let queryValue: number | string = restaurantId;
                  
      if (typeof restaurantId === 'string') {
        if (restaurantId.includes('rest-')) {
          queryValue = parseInt(restaurantId.replace('rest-', ''));
        } else {
          queryValue = parseInt(restaurantId);
        }
        
        if (isNaN(queryValue as number)) {
          setReviews([]);
          setLoading(false);
          return;
        }
      }
                  
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('review_id, rating, content, created_at, updated_at, image_url, user_id')
        .eq('restaurant_id', queryValue)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      
      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        return;
      }

      const userIds = [...new Set(reviewsData.map(r => r.user_id))];

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, nickname, profile_image_url')
        .in('user_id', userIds);

      if (usersError) {
        console.warn('[Users Fetch Warning]:', usersError);
      }

      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, u])
      );

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
      
    } catch (error) {
      console.error('❌ [Fetch Reviews Failed]:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE) {
      console.error(`파일이 너무 큽니다: ${file.name}`);
      alert(`${file.name}은(는) 5MB를 초과합니다.`);
      return null;
    }

    const fileExtension = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('review_images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('review_images')
        .getPublicUrl(path);

      return data.publicUrl;

    } catch (error) {
      console.error('[Image Upload Error]:', error);
      return null;
    }
  };

  const submitReview = async (content: string, image: File | null, rating: number) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      let imageUrl: string | null = null;

      if (image) {
        console.log('[Submit Review] 이미지 업로드 시작...');
        imageUrl = await uploadImage(image, user.id);
        
        if (imageUrl) {
          console.log('[Image Upload Success]:', imageUrl);
        } else {
          console.warn('[Image Upload Failed]');
        }
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          restaurant_id: restaurantId,
          content: content,
          rating: rating,
          image_url: imageUrl,
        });

      if (error) throw error;
      
      await fetchReviews();

    } catch (error) {
      console.error('[Submit Review Error]:', error);
      alert('리뷰 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
      throw error;
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [restaurantId]);

  return { reviews, loading, submitReview };
}
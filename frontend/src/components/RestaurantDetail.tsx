/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import MenuList from './MenuList';
import ReviewList from './ReviewList';
import LoadingState from './LoadingState';
import styles from './RestaurantDetail.module.css';
import type { Restaurant } from '../types/restaurant';
import { usebackUserStore } from '../stores/useUserStore';
import { useRestaurantMenus } from '../hooks/useRestaurantMenus';
import { useRestaurantReviews } from '../hooks/useRestaurantReviews';
import { useRestaurantBookmark } from '../hooks/useRestaurantBookmark';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onClose: () => void;
}

type TabType = 'menu' | 'review';

function RestaurantDetail({ restaurant, onClose }: RestaurantDetailProps) {
  const user = usebackUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabType>('menu');

  // Custom Hooks
  const { menus, loading: menusLoading } = useRestaurantMenus(restaurant.id);
  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useRestaurantReviews(restaurant.id);
  const { isBookmarked, loading: bookmarkLoading, toggleBookmark } = useRestaurantBookmark(restaurant.id, user);

  const handleBookmarkClick = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    await toggleBookmark();
  };

  const handleSubmitReview = async (content: string, image: File | null, rating: number) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      let base64Image: string | null = null;

      // 이미지가 있으면 base64로 변환
      if (image) {
        console.log('📤 이미지 변환 시작:', image.name);
        base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });
        console.log('✅ Base64 변환 완료');
      }

      // 백엔드 API를 통해 리뷰 작성 (이미지 포함)
      const apiClient = (await import('../lib/axios')).default;
      const response = await apiClient.post(`/restaurants/${restaurant.id}/reviews`, {
        title: content.substring(0, 100),
        content: content,
        rating: rating,
        image: base64Image,
      });

      if (response.data.success) {
        console.log('✅ 리뷰 등록 성공!');
        await refetchReviews();
        alert('리뷰가 등록되었습니다.');
      } else {
        throw new Error(response.data.error || '리뷰 등록 실패');
      }
    } catch (error: any) {
      console.error('[Submit Review Error]:', error);
      const errorMessage = error.response?.data?.error || error.message || '리뷰 등록 중 오류가 발생했습니다.';
      alert(errorMessage);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 이미지 섹션 */}
        {restaurant.thumbnailUrl && (
          <div className={styles.imageSection}>
            <img 
              src={restaurant.thumbnailUrl} 
              alt={restaurant.name}
              className={styles.image}
            />
            <button onClick={onClose} className={styles.closeButtonOnImage}>
              ✕
            </button>
          </div>
        )}

        {/* 헤더 */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2 className={styles.name}>{restaurant.name}</h2>
            <button
              onClick={handleBookmarkClick}
              className={`${styles.bookmarkButton} ${isBookmarked ? styles.bookmarked : ''}`}
              aria-label={isBookmarked ? '찜 해제' : '찜하기'}
              disabled={bookmarkLoading}
            >
              {bookmarkLoading ? '-' : isBookmarked ? '❤️' : '🤍'}
            </button>
          </div>
          {!restaurant.thumbnailUrl && (
            <button onClick={onClose} className={styles.closeButton}>
              ✕
            </button>
          )}
        </div>

        {/* 정보 섹션 */}
        <div className={styles.info}>
          <div className={styles.infoItem}>
            <span className={styles.icon}>📍</span>
            <span>{restaurant.address}</span>
          </div>
          {restaurant.phone && (
            <div className={styles.infoItem}>
              <span className={styles.icon}>📞</span>
              <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>
            </div>
          )}
          {restaurant.openingHours && (
            <div className={styles.infoItem}>
              <span className={styles.icon}>🕐</span>
              <span>{restaurant.openingHours}</span>
            </div>
          )}
        </div>

        {/* 탭 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'menu' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            메뉴 ({menus.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'review' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('review')}
          >
            리뷰 ({reviews.length})
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className={styles.content}>
          {activeTab === 'menu' && (
            menusLoading ? (
              <LoadingState message="메뉴를 불러오는 중입니다..." />
            ) : (
              <MenuList menus={menus} />
            )
          )}
          
          {activeTab === 'review' && (
            reviewsLoading ? (
              <LoadingState message="리뷰를 불러오는 중입니다..." />
            ) : (
              <ReviewList 
                reviews={reviews} 
                isLoggedIn={!!user}
                onSubmitReview={handleSubmitReview}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default RestaurantDetail;
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import MenuList from './MenuList';
import ReviewList from './ReviewList';
import styles from './RestaurantDetail.module.css';
import type { Restaurant } from '../types/restaurant';
import { useUserStore } from '../stores/useUserStore';
import { useRestaurantMenus } from '../hooks/useRestaurantMenus';
import { useRestaurantReviews } from '../hooks/useRestaurantReviews';
import { useRestaurantBookmark } from '../hooks/useRestaurantBookmark';
import { useImageUpload } from '../hooks/useImageUpload';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onClose: () => void;
}

type TabType = 'menu' | 'review';

function RestaurantDetail({ restaurant, onClose }: RestaurantDetailProps) {
  const user = useUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabType>('menu');

  // Custom Hooks
  const { menus, loading: menusLoading } = useRestaurantMenus(restaurant.id);
  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useRestaurantReviews(restaurant.id);
  const { isBookmarked, loading: bookmarkLoading, toggleBookmark } = useRestaurantBookmark(restaurant.id, user);
  const { uploadImage } = useImageUpload();

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
      let imageUrl: string | null = null;

      if (image) {
        imageUrl = await uploadImage(image, user.user_id);
        if (!imageUrl) {
          alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
          return;
        }
      }

      // 백엔드 API를 통해 리뷰 작성
      const apiClient = (await import('../lib/axios')).default;
      const response = await apiClient.post(`/restaurants/${restaurant.id}/reviews`, {
        title: content.substring(0, 100),
        content: content,
        rating: rating,
        image_url: imageUrl,
      });

      if (response.data.success) {
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
              <p className={styles.loadingText}>메뉴를 불러오는 중입니다...</p>
            ) : (
              <MenuList menus={menus} />
            )
          )}
          
          {activeTab === 'review' && (
            reviewsLoading ? (
              <p className={styles.loadingText}>리뷰를 불러오는 중입니다...</p>
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
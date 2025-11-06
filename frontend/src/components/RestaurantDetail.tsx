import { useState } from 'react';
import MenuList from './MenuList';
import ReviewList from './ReviewList';
import styles from './RestaurantDetail.module.css';
import type { Restaurant } from '../types/restaurant';
import { useUserStore } from '../stores/useUserStore';
import { useRestaurantBookmark } from '../hooks/useRestaurantBookmark';
import { useRestaurantMenus } from '../hooks/useRestaurantMenus';
import { useRestaurantReviews } from '../hooks/useRestaurantReviews';

interface RestaurantDetailProps {
    restaurant: Restaurant;
    onClose: () => void;
}

type TabType = 'menu' | 'review';

function RestaurantDetail({ restaurant, onClose }: RestaurantDetailProps) {
    console.log('🖼️ RestaurantDetail - thumbnailUrl:', restaurant.thumbnailUrl);

    const user = useUserStore((state) => state.user);
    const [activeTab, setActiveTab] = useState<TabType>('menu');
    
    // 커스텀 훅 사용
    const { isBookmarked, loading: bookmarkLoading, toggleBookmark } = useRestaurantBookmark(restaurant.id);
    const { menus, loading: menusLoading } = useRestaurantMenus(restaurant.id);
    const { reviews, loading: reviewsLoading, submitReview } = useRestaurantReviews(restaurant.id);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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

                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h2 className={styles.name}>{restaurant.name}</h2>
                        <button
                            onClick={toggleBookmark}
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

                <div className={styles.content}>
                    {activeTab === 'menu' && menusLoading ? (
                        <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                            메뉴를 불러오는 중입니다...
                        </p>
                    ) : (
                        activeTab === 'menu' && <MenuList menus={menus} />
                    )}
                    
                    {activeTab === 'review' && reviewsLoading ? (
                        <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                            리뷰를 불러오는 중입니다...
                        </p>
                    ) : (
                        activeTab === 'review' && (
                            <ReviewList 
                                reviews={reviews} 
                                isLoggedIn={!!user}
                                onSubmitReview={submitReview}
                            />
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default RestaurantDetail;
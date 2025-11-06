import { useState, useEffect } from 'react';
import MenuList from './MenuList';
import ReviewList from './ReviewList';
import styles from './RestaurantDetail.module.css';
import type { Restaurant } from '../types/restaurant';
import type { Review } from '../types/review';
import { useUserStore } from '../stores/useUserStore';
import { supabase } from '../lib/supabase';
/* eslint-disable @typescript-eslint/no-explicit-any */

interface RestaurantDetailProps {
    restaurant: Restaurant;
    onClose: () => void;
}

type TabType = 'menu' | 'review';

function RestaurantDetail({ restaurant, onClose }: RestaurantDetailProps) {
    const user = useUserStore((state) => state.user);
    const [activeTab, setActiveTab] = useState<TabType>('menu');
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarkId, setBookmarkId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);

    // restaurant.id를 숫자로 변환하는 함수
    const getRestaurantIdAsNumber = (): number | null => {
        const id = restaurant.id;
        
        if (typeof id === 'number') {
            return id;
        }
        
        if (typeof id === 'string') {
            const match = id.match(/\d+/);
            if (match) {
                return parseInt(match[0], 10);
            }
        }
        
        console.error('[ID Conversion] Failed:', id);
        return null;
    };

    // 리뷰 목록 불러오기
    const fetchReviews = async (restaurantIdNum: number) => {
        setReviewsLoading(true);
        try {
            // 리뷰 데이터 먼저 가져오기
            const { data: reviewsData, error: reviewsError } = await supabase
                .from('reviews')
                .select('id, rating, content, created_at, image_url, user_id')
                .eq('restaurant_id', restaurantIdNum)
                .order('created_at', { ascending: false });

            if (reviewsError) throw reviewsError;
            
            if (!reviewsData || reviewsData.length === 0) {
                setReviews([]);
                return;
            }

            // 고유한 user_id 목록 추출
            const userIds = [...new Set(reviewsData.map(r => r.user_id))];

            // users 테이블에서 사용자 정보 한 번에 가져오기
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, nickname, profile_image_url')
                .in('id', userIds);

            if (usersError) {
                console.warn('⚠️ [Users Fetch Warning]:', usersError);
            }

            // 사용자 정보를 Map으로 변환
            const usersMap = new Map(
                (usersData || []).map(u => [u.id, u])
            );

            // 리뷰와 사용자 정보 병합
            const formattedReviews: Review[] = reviewsData.map((review): Review => {
                const user = usersMap.get(review.user_id);
                return {
                    id: review.id,
                    content: review.content,
                    rating: review.rating || 0,
                    createdAt: review.created_at,
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
            setReviewsLoading(false);
        }
    };

    // 찜 상태 확인
    const checkBookmarkStatus = async () => {
        if (!user) return;

        const restaurantIdNum = getRestaurantIdAsNumber();
        if (restaurantIdNum === null) {
            console.error('[Bookmark Check] Invalid restaurant ID');
            return;
        }
    
        try {
            const { data, error } = await supabase
                .from('bookmarks')
                .select('id')
                .eq('user_id', user.id)
                .eq('restaurant_id', restaurantIdNum)
                .maybeSingle();
    
            if (error && error.code !== 'PGRST116') {
                console.error('[Bookmark Check Error]:', error);
                return;
            }
    
            if (data) {
                setIsBookmarked(true);
                setBookmarkId(data.id);
            } else {
                setIsBookmarked(false);
                setBookmarkId(null);
            }
        } catch (error) {
            console.error('[Bookmark Check Failed]:', error);
        }
    };

    // 찜하기
    const handleAddBookmark = async () => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }
    
        const restaurantIdNum = getRestaurantIdAsNumber();
        if (restaurantIdNum === null) {
            alert('잘못된 식당 정보입니다.');
            return;
        }
    
        setLoading(true);
        try {
            const { data: existingBookmark } = await supabase
                .from('bookmarks')
                .select('id')
                .eq('user_id', user.id)
                .eq('restaurant_id', restaurantIdNum)
                .maybeSingle();
    
            if (existingBookmark) {
                alert('이미 즐겨찾기한 식당입니다.');
                setIsBookmarked(true);
                setBookmarkId(existingBookmark.id);
                setLoading(false);
                return;
            }
    
            const { data, error } = await supabase
                .from('bookmarks')
                .insert({
                    user_id: user.id,
                    restaurant_id: restaurantIdNum,
                })
                .select()
                .single();
    
            if (error) {
                if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
                    alert('이미 즐겨찾기한 식당입니다.');
                    await checkBookmarkStatus();
                    setLoading(false);
                    return;
                }
                console.error('[Add Bookmark Error]:', error);
                throw error;
            }
    
            setIsBookmarked(true);
            setBookmarkId(data.id);
            alert('찜 목록에 추가되었습니다!');
        } catch (error: any) {
            if (error.message?.includes('409') || error.status === 409) {
                alert('이미 즐겨찾기한 식당입니다.');
                await checkBookmarkStatus();
            } else {
                alert('찜하기에 실패했습니다. 다시 시도해주세요.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 찜 해제
    const handleRemoveBookmark = async () => {
        if (!user || !bookmarkId) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('bookmarks')
                .delete()
                .eq('id', bookmarkId)
                .eq('user_id', user.id);

            if (error) {
                console.error('[Remove Bookmark Error]:', error);
                throw error;
            }

            setIsBookmarked(false);
            setBookmarkId(null);
            alert('찜 해제되었습니다.');
        } catch (error) {
            console.error('[Remove Bookmark Failed]:', error);
            alert('찜 해제에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    // 찜하기/해제 토글
    const handleBookmarkToggle = () => {
        if (loading) return;
        if (isBookmarked) {
            handleRemoveBookmark();
        } else {
            handleAddBookmark();
        }
    };

    // 이미지 업로드
    const uploadImages = async (files: File[], userId: string): Promise<string[]> => {
        if (files.length === 0) return [];

        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

        const uploadPromises = files.map(async (file) => {
            if (file.size > MAX_FILE_SIZE) {
                console.error(`❌ 파일이 너무 큽니다: ${file.name}`);
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
                console.error('❌ [Image Upload Error]:', error);
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        return results.filter((url): url is string => url !== null);
    };

    // 리뷰 제출
    const handleSubmitReview = async (content: string, images: File[], rating: number) => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        const restaurantIdNum = getRestaurantIdAsNumber();
        if (restaurantIdNum === null) {
            throw new Error('잘못된 식당 정보입니다.');
        }

        try {
            console.log('📝 [Submit Review] 이미지 업로드 시작...');
            
            const imageUrls = await uploadImages(images, user.id);
            
            console.log('✅ [Image Upload Success]:', imageUrls.length, '개');

            const { error } = await supabase
                .from('reviews')
                .insert({
                    user_id: user.id,
                    restaurant_id: restaurantIdNum,
                    content: content,
                    rating: rating,
                    image_url: imageUrls.length > 0 ? imageUrls[0] : null,
                });

            if (error) throw error;
            
            await fetchReviews(restaurantIdNum);

        } catch (error) {
            console.error('❌ [Submit Review Error]:', error);
            alert('리뷰 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
            throw error;
        }
    };

    // 페이지 로드 시 데이터 불러오기
    useEffect(() => {
        const restaurantIdNum = getRestaurantIdAsNumber();
        
        if (user) {
            checkBookmarkStatus();
        }
        
        if (restaurantIdNum !== null) {
            fetchReviews(restaurantIdNum); 
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurant.id, user]);

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
                            onClick={handleBookmarkToggle}
                            className={`${styles.bookmarkButton} ${isBookmarked ? styles.bookmarked : ''}`}
                            aria-label={isBookmarked ? '찜 해제' : '찜하기'}
                            disabled={loading}
                        >
                            {loading ? '-' : isBookmarked ? '❤️' : '🤍'}
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
                        메뉴 ({restaurant.menus.length})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'review' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('review')}
                    >
                        리뷰 ({reviews.length})
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === 'menu' && <MenuList menus={restaurant.menus} />}
                    
                    {activeTab === 'review' && reviewsLoading ? (
                        <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                            리뷰를 불러오는 중입니다...
                        </p>
                    ) : (
                        activeTab === 'review' && (
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
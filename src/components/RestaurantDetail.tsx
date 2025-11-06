import { useState, useEffect } from 'react';
import MenuList from './MenuList';
import ReviewList from './ReviewList';
import styles from './RestaurantDetail.module.css';
import type { Restaurant } from '../types/restaurant';
import type { Review } from '../types/review';
import type { Menu } from '../types/menu';
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
    const [menus, setMenus] = useState<Menu[]>([]);
    const [menusLoading, setMenusLoading] = useState(true);

    const restaurantId = restaurant.id;

    const fetchMenus = async (restaurantIdNum: number | string) => {
        setMenusLoading(true);
        try {
            let queryValue: number | string = restaurantIdNum;
                        
            if (typeof restaurantIdNum === 'string') {
                if (restaurantIdNum.includes('rest-')) {
                    queryValue = parseInt(restaurantIdNum.replace('rest-', ''));
                } else {
                    queryValue = parseInt(restaurantIdNum);
                }
                
                if (isNaN(queryValue as number)) {
                    setMenus([]);
                    setMenusLoading(false);
                    return;
                }
            }
                        
            const { data, error } = await supabase
                .from('menus')
                .select(`
                    menu_id,
                    restaurant_id,
                    menu_name,
                    price,
                    description,
                    vegetarian_level,
                    confidence_score,
                    ingredients,
                    analyzed_at,
                    created_at,
                    updated_at
                `)
                .eq('restaurant_id', queryValue);

            if (error) throw error;
            
            const formattedMenus: Menu[] = (data || []).map(menu => ({
                id: menu.menu_id,
                name: menu.menu_name,
                price: menu.price,
                description: menu.description, // ingredients를 description으로 사용
                vegetarianLevel: menu.vegetarian_level,
                confidenceScore: menu.confidence_score,
                analyzedAt: menu.analyzed_at,
            }));
            
            setMenus(formattedMenus);
            
        } catch (error) {
            console.error('[Fetch Menus Failed]:', error);
            setMenus([]);
        } finally {
            setMenusLoading(false);
        }
    };

    // 리뷰 목록 불러오기
    const fetchReviews = async (restaurantIdNum: number | string) => {
        setReviewsLoading(true);
        try {
            let queryValue: number | string = restaurantIdNum;
                        
            if (typeof restaurantIdNum === 'string') {
                if (restaurantIdNum.includes('rest-')) {
                    queryValue = parseInt(restaurantIdNum.replace('rest-', ''));
                } else {
                    queryValue = parseInt(restaurantIdNum);
                }
                
                if (isNaN(queryValue as number)) {
                    setReviews([]);
                    setReviewsLoading(false);
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
            setReviewsLoading(false);
        }
    };

    const checkBookmarkStatus = async () => {
        if (!user) return;
    
        try {
            const { data, error } = await supabase
                .from('bookmarks')
                .select('id')
                .eq('user_id', user.id)
                .eq('restaurant_id', restaurantId)
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

    const handleAddBookmark = async () => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }
    
        setLoading(true);
        try {
            const { data: existingBookmark } = await supabase
                .from('bookmarks')
                .select('id')
                .eq('user_id', user.id)
                .eq('restaurant_id', restaurantId)
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
                    restaurant_id: restaurantId,
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

    const handleBookmarkToggle = () => {
        if (loading) return;
        if (isBookmarked) {
            handleRemoveBookmark();
        } else {
            handleAddBookmark();
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

    const handleSubmitReview = async (content: string, image: File | null, rating: number) => {
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
            
            await fetchReviews(restaurantId);

        } catch (error) {
            console.error('[Submit Review Error]:', error);
            alert('리뷰 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
            throw error;
        }
    };

    useEffect(() => {        
        if (user) {
            checkBookmarkStatus();
        }
        
        fetchReviews(restaurantId);
        fetchMenus(restaurantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId, user]);

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
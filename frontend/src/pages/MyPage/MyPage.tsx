import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';
import apiClient from '../../lib/axios';
import ProfileSection from './components/ProfileSection';
import ReviewsList from './components/ReviewsList';
import styles from './MyPage.module.css';
import BookmarksList from './components/BookmarkList';

type TabType = 'profile' | 'bookmarks' | 'reviews';

interface UserProfile {
  user_id: number;
  email: string;
  nickname: string;
  bio: string | null;
  profile_image_url: string | null;
}

interface Restaurant {
  id: number;
  name: string;
  address: string;
  category: string;
  phone: string | null;
  latitude: number;
  longitude: number;
}

interface Bookmark {
  id: number;
  restaurant: Restaurant;
  restaurant_id?: number; // 백엔드에서 직접 받을 수 있는 restaurant_id
  created_at: string;
}

interface Review {
  id: number;
  restaurantId: number;
  restaurantName: string;
  content: string;
  rating: number;
  images: string[];
  createdAt: string;
  updatedAt: string | null;
}

const MyPage = () => {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    
    fetchUserData();
  }, [user, navigate]);

  // 북마크 목록 가져오기 함수 (재사용)
  const fetchBookmarks = async (): Promise<Bookmark[]> => {
    try {
      const bookmarksResponse = await apiClient.get('/users/bookmarks');
      if (bookmarksResponse.data.success && bookmarksResponse.data.data) {
        console.log('백엔드 응답 원본:', bookmarksResponse.data.data);
        
        const formattedBookmarks = bookmarksResponse.data.data.map((item: any) => {
          const restaurant = item.restaurants || item.restaurant;
          // restaurant_id는 favorites 테이블의 컬럼에서 직접 가져오기
          const restaurantId = item.restaurant_id;
          
          // restaurant 객체가 있으면 restaurant_id도 확인 (restaurant.restaurant_id 또는 restaurant.id)
          const restaurantObjectId = restaurant?.restaurant_id || restaurant?.id;
          
          // 디버깅: 데이터 구조 확인
          if (!restaurantId) {
            console.warn('restaurant_id가 없는 북마크:', item);
          }
          if (!restaurant) {
            console.warn('restaurant 객체가 없는 북마크:', item);
          }
          if (restaurant && restaurantObjectId && restaurantObjectId !== restaurantId) {
            console.warn('restaurant_id 불일치:', {
              item_id: item.id,
              favorites_restaurant_id: restaurantId,
              restaurant_object_id: restaurantObjectId,
              restaurant_object: restaurant
            });
          }
          
          return {
            id: item.id,
            restaurant: restaurant || null,
            restaurant_id: restaurantId, // favorites 테이블의 restaurant_id를 우선 사용
            created_at: item.created_at,
          };
        }).filter((bookmark: any) => bookmark.restaurant_id && bookmark.restaurant);
        
        console.log('포맷된 북마크:', formattedBookmarks);
        return formattedBookmarks;
      }
      return [];
    } catch (error) {
      console.error('북마크 로딩 실패:', error);
      return [];
    }
  };

  const fetchUserData = async () => {
    if (!user) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 프로필 정보 가져오기
      const profileResponse = await apiClient.get('/users/profile');
      if (profileResponse.data.success && profileResponse.data.data) {
        const profileData = profileResponse.data.data;
        setProfile({
          user_id: profileData.userId,
          email: profileData.email,
          nickname: profileData.nickname,
          bio: profileData.bio || null,
          profile_image_url: profileData.profileImage || null,
        });
      }

      // 북마크 목록 가져오기
      const formattedBookmarks = await fetchBookmarks();
      console.log('포맷된 북마크:', formattedBookmarks);
      setBookmarks(formattedBookmarks);

      // 리뷰 목록 가져오기
      try {
        const reviewsResponse = await apiClient.get('/users/reviews');
        console.log('리뷰 API 응답 전체:', reviewsResponse.data);
        
        if (reviewsResponse.data.success && reviewsResponse.data.data) {
          const reviewsData = reviewsResponse.data.data.reviews || [];
          console.log('리뷰 데이터:', reviewsData);
          
          // 백엔드 응답 형식에 맞게 변환
          const formattedReviews = reviewsData.map((item: any) => ({
            id: item.id,
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            content: item.content,
            rating: item.rating,
            images: item.images || [],
            createdAt: item.createdAt,
            updatedAt: item.updatedAt || null,
          }));
          
          console.log('포맷된 리뷰:', formattedReviews);
          setReviews(formattedReviews);
        } else {
          console.warn('리뷰 응답 형식 오류:', reviewsResponse.data);
          setReviews([]);
        }
      } catch (reviewsError: any) {
        console.error('리뷰 로딩 오류:', reviewsError);
        console.error('리뷰 에러 상세:', {
          message: reviewsError.message,
          response: reviewsError.response?.data,
          status: reviewsError.response?.status
        });
        // 401 에러인 경우 (인증 실패) 로그인 페이지로 리다이렉트
        if (reviewsError.response?.status === 401) {
          alert('로그인이 필요합니다.');
          navigate('/login');
          return;
        }
        setReviews([]); // 오류 발생 시 빈 배열로 설정
      }

    } catch (error) {
      console.error('데이터 로딩 실패:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (updatedProfile.nickname !== undefined) {
        updateData.nickname = updatedProfile.nickname;
      }
      if (updatedProfile.bio !== undefined) {
        updateData.bio = updatedProfile.bio;
      }
      if (updatedProfile.profile_image_url !== undefined) {
        updateData.profileImage = updatedProfile.profile_image_url;
      }

      const response = await apiClient.put('/users/profile', updateData);
      if (response.data.success && response.data.data) {
        const profileData = response.data.data;
        setProfile({
          user_id: profileData.userId,
          email: profileData.email,
          nickname: profileData.nickname,
          bio: profileData.bio || null,
          profile_image_url: profileData.profileImage || null,
        });
        alert('프로필이 수정되었습니다.');
      }
    } catch (error) {
      console.error('프로필 수정 실패:', error);
      alert('프로필 수정에 실패했습니다.');
    }
  };

  const handleRemoveBookmark = async (bookmarkId: number, restaurantId: number) => {
    if (!confirm('즐겨찾기를 해제하시겠습니까?')) return;

    try {
      // bookmarkId로 북마크 찾기 (검증용)
      const bookmark = bookmarks.find(b => b.id === bookmarkId);
      if (!bookmark) {
        console.error('북마크를 찾을 수 없습니다:', { bookmarkId, 현재북마크IDs: bookmarks.map(b => b.id) });
        alert('즐겨찾기를 찾을 수 없습니다.');
        return;
      }

      // restaurant_id 검증 (여러 소스 확인)
      // 백엔드에서 조인된 restaurants 객체는 restaurant_id를 가질 수 있지만, 프론트엔드 타입은 id로 매핑됨
      const bookmarkRestaurantId = bookmark.restaurant_id || 
                                    (bookmark.restaurant as any)?.restaurant_id || 
                                    bookmark.restaurant?.id;
      
      // 검증: 전달된 restaurantId와 북마크의 restaurant_id가 일치하는지 확인
      // 단, restaurant 객체의 id와 다를 수 있으므로 북마크의 restaurant_id를 우선 사용
      if (bookmarkRestaurantId !== restaurantId) {
        console.error('restaurant_id 불일치:', {
          전달된restaurantId: restaurantId,
          북마크의restaurant_id: bookmark.restaurant_id,
          restaurant객체의id: bookmark.restaurant?.id,
          restaurant객체의restaurant_id: (bookmark.restaurant as any)?.restaurant_id,
          최종확인된값: bookmarkRestaurantId,
          bookmark
        });
        alert('북마크 데이터가 일치하지 않습니다. 페이지를 새로고침해주세요.');
        return;
      }

      console.log('북마크 삭제 시도:', { 
        bookmarkId, 
        restaurantId, 
        bookmarkName: bookmark.restaurant?.name,
        restaurantObjectId: bookmark.restaurant?.id
      });

      const response = await apiClient.delete(`/users/bookmarks/${restaurantId}`);
      
      if (response.data.success) {
        // 삭제 성공 후 서버에서 최신 북마크 목록 다시 가져오기 (가장 안전한 방법)
        try {
          const updatedBookmarks = await fetchBookmarks();
          console.log('삭제 후 새로고침된 북마크:', updatedBookmarks);
          setBookmarks(updatedBookmarks);
        } catch (refreshError) {
          console.error('북마크 목록 새로고침 실패:', refreshError);
          // 새로고침 실패 시 로컬 상태만 업데이트 (fallback)
          setBookmarks(prev => prev.filter(b => b.restaurant_id !== restaurantId));
        }
        
        alert('즐겨찾기가 해제되었습니다.');
      } else {
        throw new Error(response.data.error || '북마크 삭제 실패');
      }
    } catch (error: any) {
      console.error('즐겨찾기 해제 실패:', error);
      const errorMessage = error.response?.data?.error || error.message || '즐겨찾기 해제에 실패했습니다.';
      alert(errorMessage);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    
    if (!confirm('리뷰를 삭제하시겠습니까?')) return;

    try {
      const response = await apiClient.delete(`/reviews/${reviewId}`);
      if (response.data.success) {
        // 삭제 성공 후 리뷰 목록 다시 가져오기
        const reviewsResponse = await apiClient.get('/users/reviews');
        if (reviewsResponse.data.success && reviewsResponse.data.data) {
          const reviewsData = reviewsResponse.data.data.reviews || [];
          const formattedReviews = reviewsData.map((item: any) => ({
            id: item.id,
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            content: item.content,
            rating: item.rating,
            images: item.images || [],
            createdAt: item.createdAt,
            updatedAt: item.updatedAt || null,
          }));
          setReviews(formattedReviews);
        }
        alert('리뷰가 삭제되었습니다.');
      } else {
        throw new Error(response.data.error || '리뷰 삭제 실패');
      }
    } catch (err: any) {
      console.error('리뷰 삭제 실패:', err);
      // 401 에러인 경우 (인증 실패) 로그인 페이지로 리다이렉트
      if (err.response?.status === 401) {
        alert('로그인이 필요합니다.');
        navigate('/login');
        return;
      }
      // 403 에러인 경우 (권한 없음)
      if (err.response?.status === 403) {
        alert('본인의 리뷰만 삭제할 수 있습니다.');
        return;
      }
      alert('리뷰 삭제에 실패했습니다.');
    }
  };

  const handleUpdateReview = async (reviewId: number, updatedContent: string) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    
    // 입력 검증
    if (!updatedContent || updatedContent.trim().length === 0) {
      alert('리뷰 내용을 입력해주세요.');
      return;
    }
    
    if (updatedContent.length > 2000) {
      alert('리뷰는 최대 2000자까지 입력 가능합니다.');
      return;
    }
    
    try {
      const response = await apiClient.put(`/reviews/${reviewId}`, { 
        content: updatedContent 
      });
      if (response.data.success && response.data.data) {
        // 수정 성공 후 리뷰 목록 다시 가져오기
        const reviewsResponse = await apiClient.get('/users/reviews');
        if (reviewsResponse.data.success && reviewsResponse.data.data) {
          const reviewsData = reviewsResponse.data.data.reviews || [];
          const formattedReviews = reviewsData.map((item: any) => ({
            id: item.id,
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            content: item.content,
            rating: item.rating,
            images: item.images || [],
            createdAt: item.createdAt,
            updatedAt: item.updatedAt || null,
          }));
          setReviews(formattedReviews);
        }
        alert('리뷰가 수정되었습니다.');
      } else {
        throw new Error(response.data.error || '리뷰 수정 실패');
      }
    } catch (err: any) {
      console.error('리뷰 수정 실패:', err);
      // 401 에러인 경우 (인증 실패) 로그인 페이지로 리다이렉트
      if (err.response?.status === 401) {
        alert('로그인이 필요합니다.');
        navigate('/login');
        return;
      }
      // 403 에러인 경우 (권한 없음)
      if (err.response?.status === 403) {
        alert('본인의 리뷰만 수정할 수 있습니다.');
        return;
      }
      alert('리뷰 수정에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={() => fetchUserData()}>
          다시 시도
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <p>프로필 정보를 불러올 수 없습니다.</p>
        <button onClick={() => fetchUserData()}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>마이페이지</h1>

        {/* 탭 네비게이션 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className={styles.tabIcon}>👤</span>
            프로필
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'bookmarks' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            <span className={styles.tabIcon}>⭐</span>
            즐겨찾기 <span className={styles.badge}>{bookmarks.length}</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'reviews' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <span className={styles.tabIcon}>💬</span>
            내 리뷰 <span className={styles.badge}>{reviews.length}</span>
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div className={styles.tabContent}>
          {activeTab === 'profile' && (
            <ProfileSection
              profile={profile}
              onUpdate={handleProfileUpdate}
            />
          )}
          
          {activeTab === 'bookmarks' && (
            <BookmarksList
              bookmarks={bookmarks}
              onRemove={handleRemoveBookmark}
            />
          )}
          
          {activeTab === 'reviews' && (
            <ReviewsList
              reviews={reviews}
              onDelete={handleDeleteReview}
              onUpdate={handleUpdateReview}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPage;

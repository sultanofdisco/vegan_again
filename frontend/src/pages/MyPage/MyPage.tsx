/* eslint-disable @typescript-eslint/no-explicit-any */
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
  restaurant_id?: number;
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

  const fetchBookmarks = async (): Promise<Bookmark[]> => {
    try {
      const bookmarksResponse = await apiClient.get('/users/bookmarks');
      if (bookmarksResponse.data.success && bookmarksResponse.data.data) {
        const formattedBookmarks = bookmarksResponse.data.data
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
    } catch {
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

      const formattedBookmarks = await fetchBookmarks();
      setBookmarks(formattedBookmarks);

      try {
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
        } else {
          setReviews([]);
        }
      } catch (reviewsError: any) {
        if (reviewsError.response?.status === 401) {
          alert('로그인이 필요합니다.');
          navigate('/login');
          return;
        }
        setReviews([]);
      }
    } catch {
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
    } catch {
      alert('프로필 수정에 실패했습니다.');
    }
  };

  const handleRemoveBookmark = async (bookmarkId: number, restaurantId: number) => {
    if (!confirm('즐겨찾기를 해제하시겠습니까?')) return;

    try {
      const bookmark = bookmarks.find((b) => b.id === bookmarkId);
      if (!bookmark) {
        alert('즐겨찾기를 찾을 수 없습니다.');
        return;
      }

      const bookmarkRestaurantId =
        bookmark.restaurant_id ||
        (bookmark.restaurant as any)?.restaurant_id ||
        bookmark.restaurant?.id;

      if (bookmarkRestaurantId !== restaurantId) {
        alert('북마크 데이터가 일치하지 않습니다. 페이지를 새로고침해주세요.');
        return;
      }

      const response = await apiClient.delete(`/users/bookmarks/${restaurantId}`);

      if (response.data.success) {
        try {
          const updatedBookmarks = await fetchBookmarks();
          setBookmarks(updatedBookmarks);
        } catch {
          setBookmarks((prev) => prev.filter((b) => b.restaurant_id !== restaurantId));
        }
        alert('즐겨찾기가 해제되었습니다.');
      } else {
        throw new Error(response.data.error || '북마크 삭제 실패');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || '즐겨찾기 해제에 실패했습니다.';
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
      if (err.response?.status === 401) {
        alert('로그인이 필요합니다.');
        navigate('/login');
        return;
      }
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
        content: updatedContent,
      });
      if (response.data.success && response.data.data) {
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
      if (err.response?.status === 401) {
        alert('로그인이 필요합니다.');
        navigate('/login');
        return;
      }
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
        <button onClick={() => fetchUserData()}>다시 시도</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <p>프로필 정보를 불러올 수 없습니다.</p>
        <button onClick={() => fetchUserData()}>다시 시도</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>마이페이지</h1>

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

        <div className={styles.tabContent}>
          {activeTab === 'profile' && (
            <ProfileSection profile={profile} onUpdate={handleProfileUpdate} />
          )}

          {activeTab === 'bookmarks' && (
            <BookmarksList bookmarks={bookmarks} onRemove={handleRemoveBookmark} />
          )}

          {activeTab === 'reviews' && (
            <ReviewsList reviews={reviews} onDelete={handleDeleteReview} onUpdate={handleUpdateReview} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPage;

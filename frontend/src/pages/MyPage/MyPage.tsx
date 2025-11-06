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
  created_at: string;
}

interface Review {
  id: number;
  restaurant: Restaurant;
  rating: number;
  content: string;
  image_url: string | null;
  created_at: string;
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
      try {
        const bookmarksResponse = await apiClient.get('/users/bookmarks');
        if (bookmarksResponse.data.success && bookmarksResponse.data.data) {
          // 백엔드 응답 형식에 맞게 변환
          const formattedBookmarks = bookmarksResponse.data.data.map((item: any) => ({
            id: item.id,
            restaurant: item.restaurants || item.restaurant,
            created_at: item.created_at,
          }));
          setBookmarks(formattedBookmarks);
        }
      } catch (bookmarksError) {
        console.error('북마크 로딩 실패:', bookmarksError);
        setBookmarks([]);
      }

      // 리뷰 목록 가져오기 (리뷰 API가 있다면)
      // 현재는 빈 배열로 설정
      setReviews([]);

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

  const handleRemoveBookmark = async (bookmarkId: number) => {
    if (!confirm('즐겨찾기를 해제하시겠습니까?')) return;

    try {
      // bookmarkId로 restaurant_id 찾기
      const bookmark = bookmarks.find(b => b.id === bookmarkId);
      if (!bookmark) {
        alert('즐겨찾기를 찾을 수 없습니다.');
        return;
      }

      await apiClient.delete(`/users/bookmarks/${bookmark.restaurant.id}`);
      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkId));
      alert('즐겨찾기가 해제되었습니다.');
    } catch (error) {
      console.error('즐겨찾기 해제 실패:', error);
      alert('즐겨찾기 해제에 실패했습니다.');
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('리뷰를 삭제하시겠습니까?')) return;

    try {
      await apiClient.delete(`/users/reviews/${reviewId}`);
      setReviews(prev => prev.filter(review => review.id !== reviewId));
      alert('리뷰가 삭제되었습니다.');
    } catch (error) {
      console.error('리뷰 삭제 실패:', error);
      alert('리뷰 삭제에 실패했습니다.');
    }
  };

  const handleUpdateReview = async (reviewId: number, updatedContent: string) => {
    try {
      await apiClient.put(`/users/reviews/${reviewId}`, { content: updatedContent });
      setReviews(prev => 
        prev.map(review => 
          review.id === reviewId 
            ? { ...review, content: updatedContent }
            : review
        )
      );
      alert('리뷰가 수정되었습니다.');
    } catch (error) {
      console.error('리뷰 수정 실패:', error);
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

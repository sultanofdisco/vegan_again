/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useUserBookmarks } from '../../hooks/useUserBookmarks';
import { useUserReviews } from '../../hooks/useUserReviews';
import ProfileSection from './components/ProfileSection';
import ReviewsList from './components/ReviewsList';
import BookmarksList from './components/BookmarkList';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import styles from './MyPage.module.css';
import type { MyPageTab, UserProfile } from '../../types/mypage';

const MyPage = () => {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<MyPageTab>('profile');

  // Custom Hooks
  const userId = user?.user_id ? String(user.user_id) : null;
  
  const { 
    profile, 
    loading: profileLoading, 
    error: profileError,
    updateProfile,
    refetch: refetchProfile 
  } = useUserProfile(userId);

  const { 
    bookmarks, 
    loading: bookmarksLoading,
    removeBookmark 
  } = useUserBookmarks(userId);

  const { 
    reviews, 
    loading: reviewsLoading,
    deleteReview,
    updateReview 
  } = useUserReviews(userId);

  // 로그인 체크
  useEffect(() => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
    }
  }, [user, navigate]);

  // 프로필 업데이트 핸들러
  const handleProfileUpdate = async (updatedProfile: Partial<UserProfile>) => {
    const success = await updateProfile(updatedProfile);
    if (success) {
      alert('프로필이 수정되었습니다.');
    } else {
      alert('프로필 수정에 실패했습니다.');
    }
  };

  // 북마크 제거 핸들러
  const handleRemoveBookmark = async (bookmarkId: number, restaurantId: number) => {
    if (!confirm('즐겨찾기를 해제하시겠습니까?')) return;
    
    const success = await removeBookmark(bookmarkId, restaurantId);
    if (success) {
      alert('즐겨찾기가 해제되었습니다.');
    }
  };

  // 리뷰 삭제 핸들러
  const handleDeleteReview = async (reviewId: number) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!confirm('리뷰를 삭제하시겠습니까?')) return;

    try {
      await deleteReview(reviewId);
      alert('리뷰가 삭제되었습니다.');
    } catch (error: any) {
      if (error.message.includes('로그인')) {
        alert(error.message);
        navigate('/login');
      } else {
        alert(error.message);
      }
    }
  };

  // 리뷰 수정 핸들러
  const handleUpdateReview = async (reviewId: number, updatedContent: string) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    try {
      await updateReview(reviewId, updatedContent);
      alert('리뷰가 수정되었습니다.');
    } catch (error: any) {
      if (error.message.includes('로그인')) {
        alert(error.message);
        navigate('/login');
      } else {
        alert(error.message);
      }
    }
  };

  // 로딩 상태
  if (profileLoading) {
    return (
      <div className={styles.container}>
        <LoadingState message="프로필을 불러오는 중입니다..." />
      </div>
    );
  }

  // 에러 상태
  if (profileError) {
    return (
      <div className={styles.container}>
        <ErrorState 
          error={profileError} 
          onRetry={refetchProfile}
        />
      </div>
    );
  }

  // 프로필 없음
  if (!profile) {
    return (
      <div className={styles.container}>
        <ErrorState 
          error="프로필 정보를 불러올 수 없습니다." 
          onRetry={refetchProfile}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>마이페이지</h1>

        {/* 탭 */}
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
            <ProfileSection profile={profile} onUpdate={handleProfileUpdate} />
          )}

          {activeTab === 'bookmarks' && (
            bookmarksLoading ? (
              <LoadingState message="즐겨찾기를 불러오는 중입니다..." />
            ) : (
              <BookmarksList bookmarks={bookmarks} onRemove={handleRemoveBookmark} />
            )
          )}

          {activeTab === 'reviews' && (
            reviewsLoading ? (
              <LoadingState message="리뷰를 불러오는 중입니다..." />
            ) : (
              <ReviewsList 
                reviews={reviews} 
                onDelete={handleDeleteReview} 
                onUpdate={handleUpdateReview} 
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPage;